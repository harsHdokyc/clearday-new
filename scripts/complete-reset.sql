-- COMPLETE DATABASE RESET
-- ⚠️ WARNING: This deletes ALL data including users
-- Only run this if you want a completely fresh start

-- Delete all data in correct order (respecting foreign keys)
DELETE FROM notifications;
DELETE FROM product_evaluations;
DELETE FROM check_ins;
DELETE FROM profiles;

-- Reset auto-increment counters (not needed - all tables use UUID primary keys)
-- All tables use gen_random_uuid() so no manual reset required

-- Note: You'll need to manually clear storage buckets in Supabase dashboard
-- Go to Storage > check-in-photos > select all > delete
