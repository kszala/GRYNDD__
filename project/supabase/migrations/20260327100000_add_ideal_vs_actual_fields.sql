ALTER TABLE public.session_analytics
  ADD COLUMN IF NOT EXISTS adherence_score integer,
  ADD COLUMN IF NOT EXISTS delta_seconds integer,
  ADD COLUMN IF NOT EXISTS adherence_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_analytics_adherence_status_check'
  ) THEN
    ALTER TABLE public.session_analytics
      ADD CONSTRAINT session_analytics_adherence_status_check
      CHECK (adherence_status IN ('completed', 'undershot', 'overshot'));
  END IF;
END $$;
