ALTER TABLE public.study_playlist_items
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NOT NULL DEFAULT 0;
