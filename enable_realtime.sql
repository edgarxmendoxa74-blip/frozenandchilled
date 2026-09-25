-- Push admin changes to the website menu instantly.
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.
-- Without this, open menus still pick up changes within ~30 seconds (polling fallback).

DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['menu_items', 'categories', 'store_settings', 'payment_settings', 'delivery_locations', 'order_types']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        END IF;
    END LOOP;
END $$;
