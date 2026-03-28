DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_category_type') THEN
    CREATE TYPE event_category_type AS ENUM ('session','system','reflection');
  END IF;
END $$;

ALTER TABLE public.session_events
  ALTER COLUMN event_category TYPE event_category_type
  USING event_category::event_category_type;

ALTER TABLE public.session_events
  ALTER COLUMN event_category SET DEFAULT 'system',
  ALTER COLUMN session_phase SET DEFAULT 'system';
