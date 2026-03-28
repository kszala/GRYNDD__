/*
# Enhanced GRYND Analytics Schema

This migration adds comprehensive analytics tracking, dynamic subject management,
and advanced video session monitoring capabilities.

## New Tables
1. **subjects** - User-defined subjects with hierarchy
2. **syllabus_topics** - Chapter/topic structure within subjects  
3. **user_syllabus_progress** - Individual progress tracking
4. **session_analytics** - Detailed session metrics and behavior
5. **video_sessions** - Enhanced video tracking
6. **video_events** - Granular video interaction events
7. **behavioral_insights** - Computed analytics and predictions
8. **focus_patterns** - Time-based focus analysis

## Enhanced Features
- Every-second precision tracking
- Behavioral pattern analysis
- Predictive completion modeling
- Real-time video study tracking
- Custom subject/syllabus management
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. SUBJECTS TABLE - Dynamic subject management
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#8B5CF6',
  icon text DEFAULT 'BookOpen',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  
  UNIQUE(user_id, name)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subjects"
  ON subjects
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 2. SYLLABUS TOPICS - Chapter/Topic hierarchy
CREATE TABLE IF NOT EXISTS syllabus_topics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  chapter text NOT NULL,
  topic text NOT NULL,
  description text,
  expected_minutes integer DEFAULT 60,
  difficulty_level integer DEFAULT 3 CHECK (difficulty_level BETWEEN 1 AND 5),
  prerequisites text[], -- Array of prerequisite topic IDs
  resources jsonb DEFAULT '[]', -- Links, books, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(subject_id, chapter, topic)
);

ALTER TABLE syllabus_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their syllabus topics"
  ON syllabus_topics
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 3. USER SYLLABUS PROGRESS - Individual progress tracking
CREATE TABLE IF NOT EXISTS user_syllabus_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  topic_id uuid REFERENCES syllabus_topics(id) ON DELETE CASCADE,
  time_spent_minutes integer DEFAULT 0,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage BETWEEN 0 AND 100),
  mastery_level integer DEFAULT 1 CHECK (mastery_level BETWEEN 1 AND 5),
  last_studied_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, topic_id)
);

ALTER TABLE user_syllabus_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can track their own progress"
  ON user_syllabus_progress
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 4. SESSION ANALYTICS - Enhanced session tracking with every-second precision
CREATE TABLE IF NOT EXISTS session_analytics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  session_id text NOT NULL,
  subject_id uuid REFERENCES subjects(id),
  topic_id uuid REFERENCES syllabus_topics(id),
  
  -- Timing data
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  planned_duration_seconds integer NOT NULL,
  actual_duration_seconds integer DEFAULT 0,
  active_focus_seconds integer DEFAULT 0, -- Time actually focused (excluding pauses)
  pause_count integer DEFAULT 0,
  total_pause_duration_seconds integer DEFAULT 0,
  
  -- Session quality metrics
  focus_rating integer CHECK (focus_rating BETWEEN 1 AND 5),
  productivity_score decimal(3,2), -- Calculated score 0.00-5.00
  interruption_count integer DEFAULT 0,
  completion_status text DEFAULT 'incomplete' CHECK (completion_status IN ('completed', 'interrupted', 'abandoned')),
  stop_reason text,
  stop_reason_details text,
  
  -- Behavioral data
  session_notes text,
  tags text[],
  mood_before integer CHECK (mood_before BETWEEN 1 AND 5),
  mood_after integer CHECK (mood_after BETWEEN 1 AND 5),
  energy_level integer CHECK (energy_level BETWEEN 1 AND 5),
  
  -- Metadata
  device_type text,
  browser_info jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their session analytics"
  ON session_analytics
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 5. VIDEO SESSIONS - Enhanced video tracking
CREATE TABLE IF NOT EXISTS video_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  video_id text NOT NULL,
  video_title text,
  channel_title text,
  playlist_name text,
  playlist_id text,
  
  -- Video metadata
  video_total_seconds integer NOT NULL,
  video_url text,
  thumbnail_url text,
  
  -- Session tracking
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  watched_seconds integer DEFAULT 0,
  completion_percentage decimal(5,2) DEFAULT 0.00,
  
  -- Behavioral metrics
  play_count integer DEFAULT 0,
  pause_count integer DEFAULT 0,
  seek_count integer DEFAULT 0,
  rewind_count integer DEFAULT 0,
  speed_changes integer DEFAULT 0,
  average_playback_speed decimal(3,2) DEFAULT 1.00,
  
  -- Learning metrics
  notes text,
  bookmarks jsonb DEFAULT '[]', -- Array of timestamp bookmarks
  difficulty_rating integer CHECK (difficulty_rating BETWEEN 1 AND 5),
  understanding_rating integer CHECK (understanding_rating BETWEEN 1 AND 5),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE video_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their video sessions"
  ON video_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 6. VIDEO EVENTS - Granular video interaction tracking
CREATE TABLE IF NOT EXISTS video_events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id uuid REFERENCES video_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN ('play', 'pause', 'seek', 'ratechange', 'end', 'heartbeat', 'bookmark', 'note')),
  video_time decimal(10,3) NOT NULL, -- Current video timestamp
  playback_speed decimal(3,2) DEFAULT 1.00,
  
  -- Seek-specific data
  seek_from decimal(10,3),
  seek_to decimal(10,3),
  
  -- Additional data
  delta_seconds integer, -- Time since last event
  event_data jsonb, -- Flexible data storage
  
  created_at timestamptz DEFAULT now()
);

ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their video events"
  ON video_events
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 7. BEHAVIORAL INSIGHTS - Computed analytics and predictions
CREATE TABLE IF NOT EXISTS behavioral_insights (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('focus_pattern', 'productivity_trend', 'completion_prediction', 'optimal_schedule', 'subject_affinity')),
  
  -- Time-based insights
  time_period text NOT NULL, -- 'daily', 'weekly', 'monthly'
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  
  -- Insight data
  insight_data jsonb NOT NULL,
  confidence_score decimal(3,2) DEFAULT 0.50, -- 0.00-1.00
  
  -- Recommendations
  recommendations text[],
  action_items text[],
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, insight_type, time_period, date_range_start)
);

ALTER TABLE behavioral_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their behavioral insights"
  ON behavioral_insights
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- 8. FOCUS PATTERNS - Time-based focus analysis
CREATE TABLE IF NOT EXISTS focus_patterns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id text NOT NULL,
  
  -- Time analysis
  hour_of_day integer NOT NULL CHECK (hour_of_day BETWEEN 0 AND 23),
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  week_of_year integer CHECK (week_of_year BETWEEN 1 AND 53),
  month integer CHECK (month BETWEEN 1 AND 12),
  
  -- Focus metrics
  average_focus_duration_minutes decimal(8,2) DEFAULT 0,
  peak_focus_score decimal(3,2) DEFAULT 0,
  session_count integer DEFAULT 0,
  completion_rate decimal(3,2) DEFAULT 0,
  interruption_rate decimal(3,2) DEFAULT 0,
  
  -- Subject-specific data
  subject_id uuid REFERENCES subjects(id),
  subject_performance jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, hour_of_day, day_of_week, subject_id)
);

ALTER TABLE focus_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their focus patterns"
  ON focus_patterns
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id);

-- INDEXES for performance optimization
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_time ON session_analytics(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_session_analytics_subject ON session_analytics(subject_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_video_sessions_user_time ON video_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_video_events_session ON video_events(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_behavioral_insights_user_type ON behavioral_insights(user_id, insight_type, date_range_start DESC);
CREATE INDEX IF NOT EXISTS idx_focus_patterns_user_time ON focus_patterns(user_id, hour_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_syllabus_progress_user ON user_syllabus_progress(user_id, last_studied_at DESC);

-- FUNCTIONS for automated calculations

-- Function to update session analytics
CREATE OR REPLACE FUNCTION update_session_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update focus patterns
  INSERT INTO focus_patterns (
    user_id, hour_of_day, day_of_week, subject_id,
    average_focus_duration_minutes, session_count, completion_rate
  )
  VALUES (
    NEW.user_id,
    EXTRACT(HOUR FROM NEW.start_time),
    EXTRACT(DOW FROM NEW.start_time),
    NEW.subject_id,
    NEW.actual_duration_seconds / 60.0,
    1,
    CASE WHEN NEW.completion_status = 'completed' THEN 1.0 ELSE 0.0 END
  )
  ON CONFLICT (user_id, hour_of_day, day_of_week, subject_id)
  DO UPDATE SET
    average_focus_duration_minutes = (focus_patterns.average_focus_duration_minutes * focus_patterns.session_count + NEW.actual_duration_seconds / 60.0) / (focus_patterns.session_count + 1),
    session_count = focus_patterns.session_count + 1,
    completion_rate = (focus_patterns.completion_rate * focus_patterns.session_count + CASE WHEN NEW.completion_status = 'completed' THEN 1.0 ELSE 0.0 END) / (focus_patterns.session_count + 1),
    updated_at = now();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for session analytics updates
DROP TRIGGER IF EXISTS trigger_update_session_analytics ON session_analytics;
CREATE TRIGGER trigger_update_session_analytics
  AFTER INSERT OR UPDATE ON session_analytics
  FOR EACH ROW
  EXECUTE FUNCTION update_session_analytics();

-- Function to calculate video completion predictions
CREATE OR REPLACE FUNCTION calculate_video_completion_prediction(
  p_user_id text,
  p_video_total_seconds integer,
  p_current_watched_seconds integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  avg_speed decimal(3,2);
  avg_completion_rate decimal(3,2);
  predicted_total_time integer;
  predicted_end_time timestamptz;
BEGIN
  -- Get user's average playback speed and completion rate
  SELECT 
    COALESCE(AVG(average_playback_speed), 1.0),
    COALESCE(AVG(completion_percentage / 100.0), 0.8)
  INTO avg_speed, avg_completion_rate
  FROM video_sessions 
  WHERE user_id = p_user_id 
    AND end_time IS NOT NULL
    AND created_at > now() - interval '30 days';
  
  -- Calculate predictions
  predicted_total_time := CEIL((p_video_total_seconds - p_current_watched_seconds) / avg_speed);
  predicted_end_time := now() + (predicted_total_time || ' seconds')::interval;
  
  RETURN jsonb_build_object(
    'predicted_completion_time', predicted_end_time,
    'estimated_remaining_seconds', predicted_total_time,
    'confidence_score', LEAST(avg_completion_rate, 0.95),
    'based_on_sessions', (SELECT COUNT(*) FROM video_sessions WHERE user_id = p_user_id AND end_time IS NOT NULL),
    'average_playback_speed', avg_speed
  );
END;
$$ LANGUAGE plpgsql;