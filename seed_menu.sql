-- Chilled and Frozen Hub: product categories and menu list (wholesale prices).
-- Safe to re-run: categories and items that already exist (matched by name) are skipped.

BEGIN;

-- 1. Categories
INSERT INTO categories (name, sort_order)
SELECT v.name, v.sort_order
FROM (VALUES
    ('High-End Beef', 1),
    ('Beef', 2),
    ('Pork', 3),
    ('Chicken', 4),
    ('Seafoods', 5),
    ('Ready-to-Cook', 6),
    ('Rice', 7)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM categories c WHERE lower(trim(c.name)) = lower(v.name));

-- 2. Menu items (price per kg unless noted; rice is per 25kg sack)
INSERT INTO menu_items (category_id, name, price, unit, min_order_note, sort_order)
SELECT
    (SELECT c.id FROM categories c WHERE lower(trim(c.name)) = lower(v.category) ORDER BY c.created_at LIMIT 1),
    v.name, v.price, v.unit, v.min_order_note, v.sort_order
FROM (VALUES
    -- High-End Beef
    ('High-End Beef', 'Beef Shortloin St. Helens',     1850, 'kg', 'Minimum order: 1 box', 1),
    ('High-End Beef', 'US Wagyu Chuck Eye Roll',       1750, 'kg', 'Minimum order: 1 box', 2),
    ('High-End Beef', 'Ribeye Choice Grade Excel',     2250, 'kg', 'Minimum order: 1 box', 3),
    -- Beef
    ('Beef', 'Beef Shortplate Excel',                   560, 'kg', 'Minimum order: 1 box', 1),
    ('Beef', 'Beef Shortplate Swift',                   535, 'kg', 'Minimum order: 1 box', 2),
    ('Beef', 'Beef Brisket Bone-In Greenham',           178, 'kg', 'Minimum order: 1 box', 3),
    ('Beef', 'Beef Shank Bone-In Frimesa',              375, 'kg', 'Minimum order: 1 box', 4),
    ('Beef', 'Beef Forequarter Mondelli',               425, 'kg', 'Minimum order: 1 box', 5),
    ('Beef', 'Beef Trimmings Mondelli',                 335, 'kg', 'Minimum order: 1 box', 6),
    ('Beef', 'Beef Tail / Oxtail Madeka',               292, 'kg', 'Minimum order: 1 box', 7),
    ('Beef', 'Beef Bone Marrow Hutten',                 280, 'kg', 'Minimum order: 1 box', 8),
    ('Beef', 'Beef Tripe Throsby',                      186, 'kg', 'Minimum order: 1 box', 9),
    ('Beef', 'Ground Beef',                             269, 'kg', 'Minimum order: 1 box', 10),
    -- Pork
    ('Pork', 'Pork Loin BISL Seara',                    193, 'kg', 'Minimum order: 1 box', 1),
    ('Pork', 'Pork Loin BLSL Saudali',                  239, 'kg', 'Minimum order: 1 box', 2),
    ('Pork', 'Pork Spareribs Frimesa',                  281, 'kg', 'Minimum order: 1 box', 3),
    ('Pork', 'Pork Collar Sadia',                       210, 'kg', 'Minimum order: 1 box', 4),
    ('Pork', 'Pork Hamleg BLSL Alibem',                 213, 'kg', 'Minimum order: 1 box', 5),
    ('Pork', 'Pork Hamleg BISO Alibem',                 168, 'kg', 'Minimum order: 1 box', 6),
    ('Pork', 'Pork Kasim My Pork',                      206, 'kg', 'Minimum order: 1 box', 7),
    ('Pork', 'Pork Riblets Olymel',                     158, 'kg', 'Minimum order: 1 box', 8),
    ('Pork', 'Pork Liver Compaxo',                       87, 'kg', 'Minimum order: 1 box', 9),
    ('Pork', 'Pork Liver Dahlia 12kg',                   87, 'kg', 'Minimum order: 1 box', 10),
    ('Pork', 'Pork Jowls Vion',                         204, 'kg', 'Minimum order: 1 box', 11),
    ('Pork', 'Pork Jowls Frescos',                      201, 'kg', 'Minimum order: 1 box', 12),
    ('Pork', 'Pork Mask Pamplona',                      157, 'kg', 'Minimum order: 1 box', 13),
    ('Pork', 'Pata Front Conestoga',                    176, 'kg', 'Minimum order: 1 box', 14),
    ('Pork', 'Pata Front Norwest',                      178, 'kg', 'Minimum order: 1 box', 15),
    ('Pork', 'Pata Hock Sadia',                         173, 'kg', 'Minimum order: 1 box', 16),
    ('Pork', 'Pupor Vanroi',                            161, 'kg', 'Minimum order: 1 box', 17),
    ('Pork', 'Pork Cutting Fat Skiba',                  130, 'kg', 'Minimum order: 1 box', 18),
    ('Pork', 'Flowerfat Westfort',                      139, 'kg', 'Minimum order: 1 box', 19),
    ('Pork', 'Flowerfat Compaxo',                       139, 'kg', 'Minimum order: 1 box', 20),
    ('Pork', 'Flowerfat Agrosuper',                     137, 'kg', 'Minimum order: 1 box', 21),
    -- Chicken
    ('Chicken', 'Whole Chicken 1kg',                    180, 'kg', 'Minimum order: 1 box', 1),
    ('Chicken', 'Chicken Wings Seara',                  210, 'kg', 'Minimum order: 1 box', 2),
    ('Chicken', 'Chicken Wings NAT',                    215, 'kg', 'Minimum order: 1 box', 3),
    ('Chicken', 'Chicken Quarter Leg AJC',              160, 'kg', 'Minimum order: 1 box', 4),
    ('Chicken', 'Chicken Leg Fillet Levo',              230, 'kg', 'Minimum order: 1 box', 5),
    ('Chicken', 'Chicken Breast Fillet Seara',          280, 'kg', 'Minimum order: 1 box', 6),
    ('Chicken', 'Chicken Thigh Marjac',                 155, 'kg', 'Minimum order: 1 box', 7),
    ('Chicken', 'Chicken Skin Copacol',                  99, 'kg', 'Minimum order: 1 box', 8),
    -- Seafoods
    ('Seafoods', 'Cream Dory',                          120, 'kg', 'Minimum order: 1 box', 1),
    -- Ready-to-Cook
    ('Ready-to-Cook', 'French Fries Kitchen Saver',     105, 'kg', 'Minimum order: 1 box', 1),
    -- Rice (per 25kg sack)
    ('Rice', 'Master Chef',                            1580, 'sack', '25kg sack', 1),
    ('Rice', 'Perfect Hasmin Blue',                    1540, 'sack', '25kg sack', 2)
) AS v(category, name, price, unit, min_order_note, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM menu_items m WHERE lower(trim(m.name)) = lower(v.name));

COMMIT;
