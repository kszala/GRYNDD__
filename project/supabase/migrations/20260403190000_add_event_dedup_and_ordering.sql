DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'session_events'
  ) THEN
    ALTER TABLE public.session_events
      ADD COLUMN IF NOT EXISTS event_id text,
      ADD COLUMN IF NOT EXISTS event_sequence bigint;

    UPDATE public.session_events
    SET event_id = COALESCE(
      event_id,
      session_id || ':' || COALESCE(event_type, 'unknown') || ':' || EXTRACT(EPOCH FROM event_timestamp)::bigint::text
    )
    WHERE event_id IS NULL;

    WITH ranked AS (
      SELECT
        ctid,
        session_id,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY event_timestamp, ctid) - 1 AS seq
      FROM public.session_events
    )
    UPDATE public.session_events target
    SET event_sequence = ranked.seq
    FROM ranked
    WHERE target.ctid = ranked.ctid
      AND target.event_sequence IS NULL;

    ALTER TABLE public.session_events
      ALTER COLUMN event_id SET NOT NULL,
      ALTER COLUMN event_sequence SET NOT NULL,
      ALTER COLUMN event_sequence SET DEFAULT 0;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_session_events_event_id_unique
      ON public.session_events(event_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_session_events_order_unique
      ON public.session_events(session_id, event_sequence);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'video_events'
  ) THEN
    ALTER TABLE public.video_events
      ADD COLUMN IF NOT EXISTS event_id text,
      ADD COLUMN IF NOT EXISTS event_sequence bigint;

    UPDATE public.video_events
    SET event_id = COALESCE(
      event_id,
      session_id::text || ':' || COALESCE(event_type, 'unknown') || ':' || EXTRACT(EPOCH FROM timestamp)::bigint::text
    )
    WHERE event_id IS NULL;

    WITH ranked AS (
      SELECT
        ctid,
        session_id,
        ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY timestamp, ctid) - 1 AS seq
      FROM public.video_events
    )
    UPDATE public.video_events target
    SET event_sequence = ranked.seq
    FROM ranked
    WHERE target.ctid = ranked.ctid
      AND target.event_sequence IS NULL;

    ALTER TABLE public.video_events
      ALTER COLUMN event_id SET NOT NULL,
      ALTER COLUMN event_sequence SET NOT NULL,
      ALTER COLUMN event_sequence SET DEFAULT 0;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_video_events_event_id_unique
      ON public.video_events(event_id);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_video_events_order_unique
      ON public.video_events(session_id, event_sequence);
  END IF;
END $$;
