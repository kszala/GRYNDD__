// src/types/database.ts
// Supabase table Row types. Used to type the createClient call.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subjects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['subjects']['Insert']>;
      };
      syllabus_topics: {
        Row: {
          id: string;
          subject_id: string;
          user_id: string;
          name: string;
          parent_id: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['syllabus_topics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['syllabus_topics']['Insert']>;
      };
      user_syllabus_progress: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          status: 'not_started' | 'in_progress' | 'completed' | 'needs_revision';
          confidence_level: number | null;
          last_studied_at: string | null;
          notes: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_syllabus_progress']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_syllabus_progress']['Insert']>;
      };
      session_analytics: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          subject_id: string | null;
          topic_id: string | null;
          start_time: string;
          end_time: string | null;
          planned_duration_seconds: number;
          actual_duration_seconds: number;
          completion_status: 'completed' | 'interrupted' | 'abandoned';
          stop_reason: string | null;
          pause_count: number;
          total_pause_duration_seconds: number;
          total_interruption_seconds: number;
          active_focus_seconds: number;
          focus_score: number | null;
          adherence_score: number | null;
          delta_seconds: number | null;
          adherence_status: 'completed' | 'undershot' | 'overshot' | null;
          productivity_score: number | null;
          mood_before: number | null;
          mood_after: number | null;
          energy_level: number | null;
          device_type: string | null;
          browser_info: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['session_analytics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['session_analytics']['Insert']>;
      };
      session_events: {
        Row: {
          event_id: string;
          session_id: string;
          user_id: string;
          event_type: string;
          event_timestamp: string;
          metadata: Json | null;
          inserted_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['session_events']['Row'], 'inserted_at'>;
        Update: Partial<Database['public']['Tables']['session_events']['Insert']>;
      };
      video_sessions: {
        Row: {
          id: string;
          user_id: string;
          video_id: string;
          video_title: string | null;
          channel_id: string | null;
          channel_name: string | null;
          watched_seconds: number;
          total_duration_seconds: number | null;
          completion_percentage: number | null;
          pause_count: number;
          seek_count: number;
          focus_score: number | null;
          subject_id: string | null;
          started_at: string;
          ended_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['video_sessions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['video_sessions']['Insert']>;
      };
      video_events: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          event_type: 'play' | 'pause' | 'seek' | 'heartbeat' | 'end';
          timestamp: string;
          video_time_seconds: number | null;
          metadata: Json | null;
        };
        Insert: Omit<Database['public']['Tables']['video_events']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['video_events']['Insert']>;
      };
      behavioral_insights: {
        Row: {
          id: string;
          user_id: string;
          insight_type: string;
          insight_data: Json;
          generated_at: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['behavioral_insights']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['behavioral_insights']['Insert']>;
      };
      focus_patterns: {
        Row: {
          id: string;
          user_id: string;
          hour_of_day: number;
          day_of_week: number;
          subject_id: string | null;
          avg_focus_score: number;
          peak_focus_score: number;
          session_count: number;
          total_focus_seconds: number;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['focus_patterns']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['focus_patterns']['Insert']>;
      };
      study_playlists: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          title: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_playlists']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['study_playlists']['Insert']>;
      };
      study_playlist_items: {
        Row: {
          id: string;
          playlist_id: string;
          video_id: string;
          video_title: string;
          channel_title: string;
          thumbnail: string;
          duration: string;
          duration_seconds: number;
          position: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['study_playlist_items']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['study_playlist_items']['Insert']>;
      };
    };
  };
}
