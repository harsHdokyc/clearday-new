-- Add AI insight column to check_ins table
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS ai_insight TEXT;

COMMENT ON COLUMN public.check_ins.ai_insight IS 'AI-generated insight about skin progress from photo analysis';
