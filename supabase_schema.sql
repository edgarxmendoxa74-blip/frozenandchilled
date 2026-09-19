-- Supabase Schema for Chilled and Frozen Hub Store
-- This script creates the tables and seeds default data (categories, menu items, settings).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Store Settings Table
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

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    promo_price DECIMAL(10, 2),
    image TEXT,
    stock INTEGER DEFAULT 20,
    low_stock_threshold INTEGER DEFAULT 5,
    unit TEXT DEFAULT 'kg',
    min_order_note TEXT,
    out_of_stock BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    variations JSONB DEFAULT '[]', -- [{name, price, disabled}]
    flavors JSONB DEFAULT '[]',    -- [{name, disabled}] or [string]
    addons JSONB DEFAULT '[]',      -- [{name, price, disabled}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Order Types Table
CREATE TABLE IF NOT EXISTS order_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payment Settings Table
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

-- 5b. Delivery Locations Table
CREATE TABLE IF NOT EXISTS delivery_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    charge INTEGER DEFAULT 35,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number SERIAL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    order_type TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    customer_details JSONB NOT NULL, -- {name, phone, tableNumber, address, etc}
    items JSONB NOT NULL,            -- Array of strings or object summaries
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'Pending'    -- Pending, Preparing, Ready, Completed, Cancelled
);


-- ============================================================================
-- INITIAL SEED DATA
-- ============================================================================

-- Insert Store Settings
INSERT INTO store_settings (store_name, address, contact, open_time, close_time, manual_status)
VALUES (
    'Chilled and Frozen Hub',
    'Caltex Road, Banaba South, Batangas City',
    '09947246294 / 09949314800',
    '08:00',
    '19:00',
    'auto'
)
ON CONFLICT DO NOTHING;

-- Insert Order Types
INSERT INTO order_types (name, is_active) VALUES
('Pick Up', TRUE),
('Delivery', TRUE),
('Manual Lalamove Delivery Booking', TRUE)
ON CONFLICT DO NOTHING;

-- Insert Payment Settings
INSERT INTO payment_settings (name, account_number, account_name, qr_url, is_active) VALUES
('GCash', '09947246294', 'Chilled and Frozen Hub', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=GCash%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', TRUE),
('Cash on Delivery', 'N/A', 'Cash Payment', NULL, TRUE),
('PayMaya', '09947246294', 'Chilled and Frozen Hub', 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=PayMaya%3A%2009947246294%20(Chilled%20and%20Frozen%20Hub)', TRUE)
ON CONFLICT DO NOTHING;

-- Insert Categories
INSERT INTO categories (name, sort_order) VALUES
('High End Beef (Min 1 Slab)', 1),
('Beef Wholesale (Min 1 Box)', 2),
('Pork Wholesale (Min 1 Box)', 3),
('Chicken Wholesale (Min 1 Box)', 4),
('Sides & Seafood (Min 1 Box)', 5),
('Ready to Cook', 6),
('Rice (25kls)', 7)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: High End Beef
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'High End Beef%' LIMIT 1), 'Beef Shortloin St. Helens', 'High-end beef slab. Minimum 1 Slab.', 1850.00, 'slab', 'Minimum 1 Slab', 15, 5, 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'High End Beef%' LIMIT 1), 'US Wagyu Chuck Eye Roll', 'Premium US Wagyu Chuck Eye Roll slab. Minimum 1 Slab.', 1750.00, 'slab', 'Minimum 1 Slab', 12, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 2),
((SELECT id FROM categories WHERE name LIKE 'High End Beef%' LIMIT 1), 'Ribeye Choice Grade Excel', 'Choice Grade Excel Ribeye slab. Minimum 1 Slab.', 2250.00, 'slab', 'Minimum 1 Slab', 8, 5, 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&w=400&q=80', 3)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: Chicken Wholesale
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Whole Chicken 1kg', 'Fresh whole dressed chicken (1kg). Minimum 1 Box.', 180.00, 'kg', 'Wholesale min 1 box', 50, 10, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Wings Seara', 'Seara premium chicken wings. Minimum 1 Box.', 210.00, 'kg', 'Wholesale min 1 box', 35, 8, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=400&q=80', 2),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Wings NAT', 'NAT quality chicken wings. Minimum 1 Box.', 215.00, 'kg', 'Wholesale min 1 box', 25, 8, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=400&q=80', 3),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Quarter Leg AJC', 'AJC Chicken Quarter Legs. Minimum 1 Box.', 160.00, 'kg', 'Wholesale min 1 box', 40, 10, 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=400&q=80', 4),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Leg Fillet Levo', 'Levo boneless chicken leg fillet. Minimum 1 Box.', 230.00, 'kg', 'Wholesale min 1 box', 30, 8, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=400&q=80', 5),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Breast Fillet Seara', 'Seara skinless chicken breast fillet. Minimum 1 Box.', 280.00, 'kg', 'Wholesale min 1 box', 20, 5, 'https://images.unsplash.com/photo-1604908177453-7462950a6a3b?auto=format&fit=crop&w=400&q=80', 6),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Thigh Marjac', 'Marjac juicy chicken thighs. Minimum 1 Box.', 155.00, 'kg', 'Wholesale min 1 box', 45, 10, 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?auto=format&fit=crop&w=400&q=80', 7),
((SELECT id FROM categories WHERE name LIKE 'Chicken Wholesale%' LIMIT 1), 'Chicken Skin Copacol', 'Copacol clean chicken skin. Minimum 1 Box.', 99.00, 'kg', 'Wholesale min 1 box', 3, 5, 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80', 8)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: Beef Wholesale
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Shortplate Excel', 'Excel Beef Shortplate for samgyupsal / yakiniku. Minimum 1 Box.', 560.00, 'kg', 'Wholesale min 1 box', 25, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Shortplate Swift', 'Swift premium Beef Shortplate. Minimum 1 Box.', 535.00, 'kg', 'Wholesale min 1 box', 22, 5, 'https://images.unsplash.com/photo-1558030006-450675393462?auto=format&fit=crop&w=400&q=80', 2),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Brisket Bonein Greenham', 'Greenham Bone-in Beef Brisket. Minimum 1 Box.', 178.00, 'kg', 'Wholesale min 1 box', 18, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 3),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Shank Bonein Frimsa', 'Frimsa Bone-in Beef Shank for bulalo. Minimum 1 Box.', 375.00, 'kg', 'Wholesale min 1 box', 15, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 4),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Forequarter Mondelli', 'Mondelli Beef Forequarter cuts. Minimum 1 Box.', 425.00, 'kg', 'Wholesale min 1 box', 12, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 5),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Trimmings Mondelli', 'Mondelli Beef Trimmings. Minimum 1 Box.', 335.00, 'kg', 'Wholesale min 1 box', 14, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 6),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Tail / Oxtail Madeka', 'Madeka Oxtail for kare-kare. Minimum 1 Box.', 292.00, 'kg', 'Wholesale min 1 box', 10, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 7),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Bone Marrow Hutten', 'Hutten Beef Bone Marrow. Minimum 1 Box.', 280.00, 'kg', 'Wholesale min 1 box', 8, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 8),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Beef Tripe Throsby', 'Throsby clean Beef Tripe. Minimum 1 Box.', 186.00, 'kg', 'Wholesale min 1 box', 16, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 9),
((SELECT id FROM categories WHERE name LIKE 'Beef Wholesale%' LIMIT 1), 'Ground Beef', 'Pure fresh ground beef. Minimum 1 Box.', 269.00, 'kg', 'Wholesale min 1 box', 30, 5, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80', 10)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: Pork Wholesale
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'Pork Wholesale%' LIMIT 1), 'Belly BLSO Aurora', 'Aurora Boneless Skin-on Pork Belly. Minimum 1 Box.', 283.00, 'kg', 'Wholesale min 1 box', 25, 5, 'https://images.unsplash.com/photo-1602498456745-e9503b30470b?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'Pork Wholesale%' LIMIT 1), 'Pork Liempo', 'Fresh Pork Liempo slices. Minimum 1 Box.', 295.00, 'kg', 'Wholesale min 1 box', 20, 5, 'https://images.unsplash.com/photo-1602498456745-e9503b30470b?auto=format&fit=crop&w=400&q=80', 2),
((SELECT id FROM categories WHERE name LIKE 'Pork Wholesale%' LIMIT 1), 'Pork Chop', 'Juicy Pork Chop cuts. Minimum 1 Box.', 275.00, 'kg', 'Wholesale min 1 box', 18, 5, 'https://images.unsplash.com/photo-1602498456745-e9503b30470b?auto=format&fit=crop&w=400&q=80', 3),
((SELECT id FROM categories WHERE name LIKE 'Pork Wholesale%' LIMIT 1), 'Pork Shoulder / Kasim', 'Fresh Pork Shoulder / Kasim. Minimum 1 Box.', 260.00, 'kg', 'Wholesale min 1 box', 22, 5, 'https://images.unsplash.com/photo-1602498456745-e9503b30470b?auto=format&fit=crop&w=400&q=80', 4)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: Sides & Seafood
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'Sides%' LIMIT 1), 'French Fries Shoestring', 'Crispy shoestring french fries pack. Minimum 1 Box.', 145.00, 'pack', 'Wholesale min 1 box', 40, 8, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'Sides%' LIMIT 1), 'Cream Dory Fillet', 'Fresh frozen Cream Dory Fillet pack. Minimum 1 Box.', 195.00, 'pack', 'Wholesale min 1 box', 30, 5, 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80', 2),
((SELECT id FROM categories WHERE name LIKE 'Sides%' LIMIT 1), 'Frozen Mixed Veggies', 'Premium frozen mixed vegetables pack. Minimum 1 Box.', 120.00, 'pack', 'Wholesale min 1 box', 35, 5, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80', 3)
ON CONFLICT DO NOTHING;

-- Insert Menu Items: Rice
INSERT INTO menu_items (category_id, name, description, price, unit, min_order_note, stock, low_stock_threshold, image, sort_order) VALUES
((SELECT id FROM categories WHERE name LIKE 'Rice%' LIMIT 1), 'Dinorado Special 25kg', 'Special Dinorado rice 25kg sack.', 1450.00, 'sack', '25kg Sack', 15, 3, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80', 1),
((SELECT id FROM categories WHERE name LIKE 'Rice%' LIMIT 1), 'Jasmine Rice 25kg', 'Aromatic Jasmine rice 25kg sack.', 1380.00, 'sack', '25kg Sack', 12, 3, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=400&q=80', 2)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- UPDATE CATEGORY SORT ORDER (Run this to fix ordering on existing databases)
-- ============================================================================
UPDATE categories SET sort_order = 1 WHERE name LIKE 'High End Beef%';
UPDATE categories SET sort_order = 2 WHERE name LIKE 'Beef Wholesale%';
UPDATE categories SET sort_order = 3 WHERE name LIKE 'Pork Wholesale%';
UPDATE categories SET sort_order = 4 WHERE name LIKE 'Chicken Wholesale%';
UPDATE categories SET sort_order = 5 WHERE name LIKE 'Sides%';
UPDATE categories SET sort_order = 6 WHERE name LIKE 'Ready to Cook%';
UPDATE categories SET sort_order = 7 WHERE name LIKE 'Rice%';

-- CLEANUP SECTION (Uncomment to reset all data)
-- DELETE FROM orders;
-- DELETE FROM menu_items;
-- DELETE FROM categories;
-- DELETE FROM payment_settings;
-- DELETE FROM store_settings;
-- DELETE FROM order_types;

-- ============================================================================
-- MIGRATION: Run these on existing databases to apply schema updates
-- ============================================================================
-- Add instructions column to payment_settings (if upgrading from older schema)
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Add delivery_locations table (if upgrading from older schema)
CREATE TABLE IF NOT EXISTS delivery_locations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    charge INTEGER DEFAULT 35,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- ============================================================================
-- SUPABASE CRON JOBS (pg_cron)
-- ============================================================================
-- Note: Make sure the pg_cron extension is enabled on your Supabase dashboard.
-- Go to Database -> Extensions -> search and enable "pg_cron".

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Safely clear existing jobs with these names to prevent duplicate schedules on rerun
DO $$
BEGIN
    PERFORM cron.unschedule('reset-order-number-sequence') FROM cron.job WHERE jobname = 'reset-order-number-sequence';
    PERFORM cron.unschedule('auto-cancel-stale-orders') FROM cron.job WHERE jobname = 'auto-cancel-stale-orders';
    PERFORM cron.unschedule('cleanup-old-orders') FROM cron.job WHERE jobname = 'cleanup-old-orders';
    PERFORM cron.unschedule('reset-store-status-to-auto') FROM cron.job WHERE jobname = 'reset-store-status-to-auto';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'pg_cron is not enabled or lacks permissions. Please enable it in the Supabase Dashboard.';
END $$;

-- Schedule jobs (using cron.schedule)
-- pg_cron uses UTC by default, so cron expressions should be configured accordingly.

-- 1. Reset order sequence number daily at midnight Philippine Time (16:00 UTC / 00:00 PHT)
SELECT cron.schedule(
    'reset-order-number-sequence',
    '0 16 * * *',
    $$ ALTER SEQUENCE orders_order_number_seq RESTART WITH 1; $$
);

-- 2. Auto-cancel pending orders that have not been processed for more than 12 hours (runs every 30 minutes)
SELECT cron.schedule(
    'auto-cancel-stale-orders',
    '*/30 * * * *',
    $$ UPDATE orders SET status = 'Cancelled' WHERE status = 'Pending' AND timestamp < NOW() - INTERVAL '12 hours'; $$
);

-- 3. Clean up cancelled or completed orders older than 30 days (runs every Sunday at midnight UTC)
SELECT cron.schedule(
    'cleanup-old-orders',
    '0 0 * * 0',
    $$ DELETE FROM orders WHERE (status = 'Cancelled' OR status = 'Completed') AND timestamp < NOW() - INTERVAL '30 days'; $$
);

-- 4. Reset store manual override status to 'auto' daily at 8:00 AM Philippine Time (00:00 UTC)
-- This ensures the store re-opens automatically based on open_time/close_time the next day
SELECT cron.schedule(
    'reset-store-status-to-auto',
    '0 0 * * *',
    -- CREATE TABLE FOR SUPPLIERS MANAGEMENT
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(100),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Access Suppliers" ON suppliers;
CREATE POLICY "Public Read Access Suppliers" ON suppliers FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Full Access Suppliers" ON suppliers;
CREATE POLICY "Public Full Access Suppliers" ON suppliers FOR ALL USING (true);

-- Insert Default Suppliers
INSERT INTO suppliers (name, contact_person, phone, email, address, notes) VALUES
('St. Helens Meat Products', 'John Miller', '09171234567', 'sales@sthelens.com', 'Pasig City, Metro Manila', 'High-end beef slab supplier'),
('Seara Poultry Philippines', 'Maria Santos', '09189876543', 'orders@seara.ph', 'Quezon City, Metro Manila', 'Wholesale chicken & wings'),
('Excel Choice Beef Co.', 'Robert Tan', '09223334444', 'excelbeef@gmail.com', 'Valenzuela City', 'Choice Grade Beef Ribeye & Cuts')
ON CONFLICT DO NOTHING;

