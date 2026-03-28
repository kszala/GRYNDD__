DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_events'
  ) THEN
    ALTER TABLE public.session_events
      ADD COLUMN IF NOT EXISTS reason text,
      ADD COLUMN IF NOT EXISTS reflection text;
  END IF;
END $$;

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_events'
  ) THEN
    RETURN;
  END IF;

  SELECT con.conname
  INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'session_events'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%event_type%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE public.session_events DROP CONSTRAINT %I',
      constraint_name
    );
  END IF;

  ALTER TABLE public.session_events
    ADD CONSTRAINT session_events_event_type_check
    CHECK (
      event_type IN (
        'start',
        'pause',
        'resume',
        'interrupt',
        'complete',
        'reflection_submitted'
      )
    );
END $$;
