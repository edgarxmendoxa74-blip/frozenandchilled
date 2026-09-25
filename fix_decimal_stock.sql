-- Allow decimal kg values (e.g. 45.3) for stock.
-- Run once in Supabase Dashboard -> SQL Editor. Existing whole-number values are kept as-is.

ALTER TABLE public.menu_items
    ALTER COLUMN stock TYPE NUMERIC(10, 3) USING stock::NUMERIC(10, 3),
    ALTER COLUMN low_stock_threshold TYPE NUMERIC(10, 3) USING low_stock_threshold::NUMERIC(10, 3);
