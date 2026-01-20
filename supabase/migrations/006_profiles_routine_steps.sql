-- User-curated skincare routine steps (array of labels)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS routine_steps JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.routine_steps IS 'User-defined routine step labels, e.g. ["Cleanse","Toner","Moisturizer"]';
