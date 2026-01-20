-- Add Product.md User fields: skin_goal, skin_type
-- Plus dataset continuity: baseline_date, last_reset_at
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skin_goal TEXT,
  ADD COLUMN IF NOT EXISTS skin_type TEXT,
  ADD COLUMN IF NOT EXISTS baseline_date DATE,
  ADD COLUMN IF NOT EXISTS last_reset_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.profiles.skin_goal IS 'acne, glow, hydrate, protect';
COMMENT ON COLUMN public.profiles.skin_type IS 'oily, dry, combination, sensitive, normal';
COMMENT ON COLUMN public.profiles.baseline_date IS 'Start of current analytics window (reset after 4+ days missed)';
COMMENT ON COLUMN public.profiles.last_reset_at IS 'When analytics were last reset';
