DELETE FROM public.session_analytics AS earlier
USING public.session_analytics AS later
WHERE earlier.session_id = later.session_id
  AND earlier.created_at < later.created_at;

DELETE FROM public.session_analytics AS duplicate
USING public.session_analytics AS keeper
WHERE duplicate.session_id = keeper.session_id
  AND duplicate.created_at = keeper.created_at
  AND duplicate.id < keeper.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_analytics_session_id_key'
  ) THEN
    ALTER TABLE public.session_analytics
      ADD CONSTRAINT session_analytics_session_id_key UNIQUE (session_id);
  END IF;
END;
$$;
