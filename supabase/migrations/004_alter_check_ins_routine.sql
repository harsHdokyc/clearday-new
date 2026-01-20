-- DailyLog.routineCompleted: did user complete (any part of) daily routine
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS routine_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.check_ins.routine_completed IS 'True if user completed at least one routine step';
