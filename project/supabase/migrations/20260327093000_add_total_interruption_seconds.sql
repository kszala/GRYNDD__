ALTER TABLE public.session_analytics
  ADD COLUMN IF NOT EXISTS total_interruption_seconds integer NOT NULL DEFAULT 0;
