-- Product evaluations (Product.md Analytics.productEvaluations)
CREATE TABLE IF NOT EXISTS public.product_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  fit_score INT NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
  verdict TEXT NOT NULL CHECK (verdict IN ('great', 'good', 'caution')),
  insight_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.product_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own product_evaluations"
  ON public.product_evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own product_evaluations"
  ON public.product_evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_product_evaluations_user_created
  ON public.product_evaluations(user_id, created_at DESC);
