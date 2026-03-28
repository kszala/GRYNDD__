-- Create study_playlists table
CREATE TABLE IF NOT EXISTS public.study_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- Create study_playlist_items table
CREATE TABLE IF NOT EXISTS public.study_playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.study_playlists(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  video_title TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  thumbnail TEXT,
  duration TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, video_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_study_playlists_user_topic ON public.study_playlists(user_id, topic_id);
CREATE INDEX idx_study_playlists_topic ON public.study_playlists(topic_id);
CREATE INDEX idx_study_playlist_items_playlist ON public.study_playlist_items(playlist_id);

-- Enable RLS (Row-Level Security)
ALTER TABLE public.study_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_playlist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_playlists
CREATE POLICY "Users can view their own study playlists" 
  ON public.study_playlists FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create study playlists" 
  ON public.study_playlists FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study playlists" 
  ON public.study_playlists FOR UPDATE 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study playlists" 
  ON public.study_playlists FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS policies for study_playlist_items
CREATE POLICY "Users can view items in their playlists" 
  ON public.study_playlist_items FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.study_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add items to their playlists" 
  ON public.study_playlist_items FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items from their playlists" 
  ON public.study_playlist_items FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.study_playlists 
      WHERE id = playlist_id AND user_id = auth.uid()
    )
  );
