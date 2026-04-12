CREATE TABLE IF NOT EXISTS public.session_events (
  event_id text PRIMARY KEY,
  event_sequence bigint,
  session_id text NOT NULL,
  user_id text NOT NULL,
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  event_category text,
  session_phase text,
  duration_since_last_event_seconds integer,
  metadata jsonb,
  reason text,
  reflection text,
  inserted_at timestamptz DEFAULT now()
);
