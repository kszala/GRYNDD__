DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_events'
  ) THEN
    ALTER TABLE public.session_events
      ADD COLUMN IF NOT EXISTS event_category text,
      ADD COLUMN IF NOT EXISTS session_phase text;
  END IF;
END $$;
