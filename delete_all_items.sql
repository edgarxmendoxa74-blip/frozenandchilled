-- Delete ALL menu items from Supabase
-- Run this in Supabase SQL Editor

DELETE FROM menu_items WHERE id IS NOT NULL;

-- Verify deletion
SELECT COUNT(*) as remaining_items FROM menu_items;

-- Optional: Reset the sequence if you want to start fresh
-- (This will make new items start from ID 1 again)
-- ALTER SEQUENCE menu_items_id_seq RESTART WITH 1;