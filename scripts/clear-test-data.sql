-- Safe test data cleanup script
-- This preserves user accounts and schema but clears test data

-- Clear product evaluations (keeps table structure)
DELETE FROM product_evaluations;

-- Clear notifications (keeps table structure)  
DELETE FROM notifications;

-- Clear check-ins and photos (keeps table structure)
DELETE FROM check_ins;

-- Clear profile routine steps (optional - comment out if you want to keep routines)
-- UPDATE profiles SET routine_steps = NULL, updated_at = NOW();

-- Reset streaks (optional - comment out if you want to keep streak data)
-- UPDATE profiles SET 
--   current_streak = 0, 
--   longest_streak = 0, 
--   total_days = 0, 
--   days_tracked = 0, 
--   days_missed = 0,
--   updated_at = NOW();

-- Clear storage bucket (run in Supabase dashboard manually)
-- Go to Storage > check-in-photos > select all > delete

-- Reset auto-increment counters (optional)
-- ALTER TABLE product_evaluations ALTER COLUMN id RESTART WITH 1;
-- ALTER TABLE notifications ALTER COLUMN id RESTART WITH 1;
-- ALTER TABLE check_ins ALTER COLUMN id RESTART WITH 1;
