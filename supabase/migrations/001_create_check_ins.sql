-- Create check_ins table for daily check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_front_url TEXT,
  photo_right_url TEXT,
  photo_left_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, check_in_date)
);

-- Enable Row Level Security
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON public.check_ins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own check-ins
CREATE POLICY "Users can insert own check-ins"
  ON public.check_ins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own check-ins
CREATE POLICY "Users can update own check-ins"
  ON public.check_ins
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_check_ins_user_date ON public.check_ins(user_id, check_in_date DESC);
