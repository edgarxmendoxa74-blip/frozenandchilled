-- ============================================================================
-- Chilled and Frozen Hub - FULL SETUP for a NEW Supabase project
-- Run once in Dashboard -> SQL Editor. Safe to re-run (no data is deleted).
-- Order: 1) this file  2) import your CSV backup  3) migrate-base64-images script
-- (This replaces supabase_schema.sql, which also deletes menu data at the end.)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- TABLES ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'Chilled and Frozen Hub',
    address TEXT DEFAULT 'Caltex Road, Banaba South, Batangas City',
    contact TEXT DEFAULT '09947246294 / 09949314800',
    logo_url TEXT DEFAULT '/chilled-frozen-logo.png',
    banner_images JSONB DEFAULT '[]',
    open_time TIME DEFAULT '08:00',
    close_time TIME DEFAULT '19:00',
    manual_status TEXT DEFAULT 'auto',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    promo_price DECIMAL(10, 2),
    image TEXT,
    stock NUMERIC(10, 3) DEFAULT 20,
    low_stock_threshold NUMERIC(10, 3) DEFAULT 5,
    unit TEXT DEFAULT 'kg',
    min_order_note TEXT,
    out_of_stock BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    variations JSONB DEFAULT '[]',
    boxes JSONB DEFAULT '[]',
    flavors JSONB DEFAULT '[]',
    addons JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    account_number TEXT,
    account_name TEXT,
    qr_url TEXT,
    instructions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    charge INTEGER DEFAULT 35,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number SERIAL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    customer_details JSONB NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending'
);

-- Visit analytics (src/visitTracking.js)
CREATE TABLE IF NOT EXISTS store_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id TEXT NOT NULL,
    visit_date DATE NOT NULL,
    ordered BOOLEAN DEFAULT FALSE,
    ordered_at TIMESTAMP WITH TIME ZONE,
    visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (visitor_id, visit_date)
);

ALTER TABLE store_visits ADD COLUMN IF NOT EXISTS visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_timestamp ON orders(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_store_visits_date ON store_visits(visit_date);

-- ---------- ROW LEVEL SECURITY ----------------------------------------------
-- Public (anon) site: read the menu/settings, place orders, record visits,
-- and update stock after an order (Home.jsx does this with the public key).
-- Logged-in admin (authenticated): full access to everything.
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['store_settings','categories','menu_items','order_types',
                             'payment_settings','delivery_locations','orders','store_visits']
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "admin all" ON public.%I', t);
        EXECUTE format('CREATE POLICY "admin all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
    END LOOP;

    FOREACH t IN ARRAY ARRAY['store_settings','categories','menu_items','order_types',
                             'payment_settings','delivery_locations']
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "public read" ON public.%I', t);
        EXECUTE format('CREATE POLICY "public read" ON public.%I FOR SELECT TO anon USING (true)', t);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "public place order" ON orders;
CREATE POLICY "public place order" ON orders FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "public stock update" ON menu_items;
CREATE POLICY "public stock update" ON menu_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "public visit insert" ON store_visits;
CREATE POLICY "public visit insert" ON store_visits FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "public visit update" ON store_visits;
CREATE POLICY "public visit update" ON store_visits FOR UPDATE TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "public visit read" ON store_visits;
CREATE POLICY "public visit read" ON store_visits FOR SELECT TO anon USING (true);

-- ---------- REALTIME --------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['menu_items','categories','store_settings','payment_settings','delivery_locations','order_types']
    LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;

-- ---------- STORAGE (images) ------------------------------------------------
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read products" ON storage.objects;
CREATE POLICY "Public read products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
DROP POLICY IF EXISTS "Authenticated upload products" ON storage.objects;
CREATE POLICY "Authenticated upload products" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products');
DROP POLICY IF EXISTS "Authenticated update products" ON storage.objects;
CREATE POLICY "Authenticated update products" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products');
DROP POLICY IF EXISTS "Authenticated delete products" ON storage.objects;
CREATE POLICY "Authenticated delete products" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'products');

-- ---------- SCHEDULED JOBS (needs pg_cron: Database -> Extensions) ----------
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
    PERFORM cron.unschedule(jobname) FROM cron.job
    WHERE jobname IN ('reset-order-number-sequence','auto-cancel-stale-orders','cleanup-old-orders','reset-store-status-to-auto');
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not enabled - enable it in Database -> Extensions, then re-run this section.';
END $$;

SELECT cron.schedule('reset-order-number-sequence', '0 16 * * *', $$ ALTER SEQUENCE orders_order_number_seq RESTART WITH 1; $$);
SELECT cron.schedule('auto-cancel-stale-orders', '*/30 * * * *',
    $$ UPDATE orders SET status = 'Cancelled' WHERE status = 'Pending' AND timestamp < NOW() - INTERVAL '12 hours'; $$);
SELECT cron.schedule('cleanup-old-orders', '0 0 * * 0',
    $$ DELETE FROM orders WHERE (status = 'Cancelled' OR status = 'Completed') AND timestamp < NOW() - INTERVAL '30 days'; $$);
SELECT cron.schedule('reset-store-status-to-auto', '0 0 * * *', $$ UPDATE store_settings SET manual_status = 'auto'; $$);
