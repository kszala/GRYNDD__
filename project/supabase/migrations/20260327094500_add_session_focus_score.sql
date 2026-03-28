ALTER TABLE public.session_analytics
  ADD COLUMN IF NOT EXISTS focus_score integer;
