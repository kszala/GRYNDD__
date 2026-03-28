DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_events'
  ) THEN
    ALTER TABLE public.session_events
      ADD COLUMN IF NOT EXISTS duration_since_last_event_seconds integer;
  END IF;
END $$;
