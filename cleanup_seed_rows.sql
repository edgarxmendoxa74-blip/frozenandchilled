-- Removes leftover seed rows so only the imported (backup) rows remain. Run once in SQL Editor.
DELETE FROM order_types WHERE id NOT IN ('71697dfe-4743-4f2c-8776-7aadb3c02a48','c4674b04-199b-43ee-9294-5079e0c381c6','bc51ba74-ca8c-4b1d-95bb-e7fd3842bfaa');
DELETE FROM payment_settings WHERE id NOT IN ('b66dcf79-74ae-4b6d-a3f0-f5bd3a4fe4b7','53a425bd-cd12-4739-beda-18f6192cb815','9a6950b7-4e5a-4dd3-8fa5-53f8352ec906');
DELETE FROM store_settings WHERE id <> '0d05d675-d255-4416-bc59-a613a9702786';
-- Check: should return 3, 3, 1
SELECT (SELECT count(*) FROM order_types) AS order_types, (SELECT count(*) FROM payment_settings) AS payment_settings, (SELECT count(*) FROM store_settings) AS store_settings;
