CREATE TABLE IF NOT EXISTS public.session_events (
  event_id text PRIMARY KEY,
  session_id text NOT NULL,
  user_id text NOT NULL,
  event_type text NOT NULL,
  event_timestamp timestamptz NOT NULL,
  metadata jsonb,
  inserted_at timestamptz DEFAULT now()
);
