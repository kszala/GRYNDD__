import supabase from '../supabaseClient';
import type { Database } from '../types/database';
import type { TopicAnalyticsSnapshot, VideoSessionMetrics } from '../types/gryndtube';

type SessionInsert = Database['public']['Tables']['video_sessions']['Insert'];
type SessionUpdate = Database['public']['Tables']['video_sessions']['Update'];
type SessionRow = Database['public']['Tables']['video_sessions']['Row'];
type PlaylistItemRow = Database['public']['Tables']['study_playlist_items']['Row'];

interface StartSessionInput {
  userId: string;
  topicId: string;
  videoId: string;
  videoTitle: string;
  channelId?: string;
  channelName: string;
  totalDurationSeconds: number;
}

const buildCompletionPercentage = (watchedSeconds: number, totalDurationSeconds: number) => {
  if (!totalDurationSeconds) {
    return 0;
  }

  return Math.min(100, Math.round((watchedSeconds / totalDurationSeconds) * 100));
};

const aggregateByVideo = (sessions: SessionRow[]) => {
  const byVideo = new Map<string, { watchedSeconds: number; totalDurationSeconds: number }>();

  for (const session of sessions) {
    const current = byVideo.get(session.video_id);
    const watchedSeconds = Math.max(current?.watchedSeconds || 0, session.watched_seconds);
    const totalDurationSeconds = session.total_duration_seconds || current?.totalDurationSeconds || 0;

    byVideo.set(session.video_id, {
      watchedSeconds,
      totalDurationSeconds,
    });
  }

  return byVideo;
};

export const analyticsService = {
  async startPlaybackSession(userId: string, videoId: string) {
    if (!userId || !videoId) {
      throw new Error('userId and videoId are required to start a session.');
    }

    const { data, error } = await supabase
      .from('video_sessions')
      .insert({
        user_id: userId,
        video_id: videoId,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id as string;
  },

  async endPlaybackSession(sessionId: string, watchedSeconds: number) {
    if (!sessionId) {
      return;
    }

    const { error } = await supabase
      .from('video_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: Math.max(0, Math.floor(watchedSeconds)),
      })
      .eq('id', sessionId);

    if (error) {
      throw error;
    }
  },
  async startVideoSession(input: StartSessionInput) {
    const payload: SessionInsert = {
      user_id: input.userId,
      video_id: input.videoId,
      video_title: input.videoTitle,
      channel_id: input.channelId || null,
      channel_name: input.channelName,
      watched_seconds: 0,
      total_duration_seconds: input.totalDurationSeconds,
      completion_percentage: 0,
      pause_count: 0,
      seek_count: 0,
      focus_score: null,
      subject_id: input.topicId,
      started_at: new Date().toISOString(),
      ended_at: null,
    };

    const { data, error } = await supabase
      .from('video_sessions')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return data.id;
  },

  async updateVideoSession(sessionId: string, userId: string, metrics: VideoSessionMetrics, ended = false) {
    const payload: SessionUpdate = {
      watched_seconds: Math.floor(metrics.watchedSeconds),
      pause_count: metrics.pauseCount,
      seek_count: metrics.seekCount,
      total_duration_seconds: metrics.totalDurationSeconds,
      completion_percentage: buildCompletionPercentage(
        metrics.watchedSeconds,
        metrics.totalDurationSeconds
      ),
      ended_at: ended ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('video_sessions')
      .update(payload)
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  },

  async upsertContinueWatching(
    userId: string,
    video: { videoId: string; title: string; thumbnail: string; durationSeconds: number },
    watchedSeconds: number
  ) {
    if (!userId || !video?.videoId) {
      return;
    }

    const { error } = await supabase
      .from('continue_watching')
      .upsert(
        {
          user_id: userId,
          video_id: video.videoId,
          title: video.title,
          thumbnail: video.thumbnail,
          last_watched_seconds: Math.max(0, Math.floor(watchedSeconds)),
          duration_seconds: Math.max(0, Math.floor(video.durationSeconds || 0)),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,video_id' }
      );

    if (error) {
      throw error;
    }
  },

  async getDailySessionSummary(userId: string, dayStart: Date) {
    if (!userId) {
      return { focusTime: 0, sessions: 0, videos: 0 };
    }

    const { data, error } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', dayStart.toISOString());

    if (error) {
      throw error;
    }

    const sessions = data || [];
    const totalTime = sessions.reduce((sum, session: any) => sum + (session.duration_seconds || 0), 0);
    const totalVideos = new Set(sessions.map((session: any) => session.video_id)).size;

    return {
      focusTime: totalTime,
      sessions: sessions.length,
      videos: totalVideos,
    };
  },

  async getTopicAnalytics(userId: string, topicId: string): Promise<TopicAnalyticsSnapshot> {
    if (!userId || !topicId) {
      return {
        totalLectureHours: 0,
        completionPercentage: 0,
        topicProgressLabel: 'Select a topic',
        totalWatchedSeconds: 0,
        totalDurationSeconds: 0,
        startedVideos: 0,
        totalVideos: 0,
      };
    }

    const [{ data: playlistItems, error: playlistError }, { data: sessions, error: sessionError }] =
      await Promise.all([
        supabase
          .from('study_playlist_items')
          .select('video_id, duration_seconds, playlist:study_playlists!inner(topic_id, user_id)')
          .eq('playlist.topic_id', topicId)
          .eq('playlist.user_id', userId),
        supabase
          .from('video_sessions')
          .select('*')
          .eq('user_id', userId)
          .eq('subject_id', topicId),
      ]);

    if (playlistError) {
      throw playlistError;
    }

    if (sessionError) {
      throw sessionError;
    }

    const items = (playlistItems || []) as Array<
      Pick<PlaylistItemRow, 'video_id' | 'duration_seconds'>
    >;
    const byVideo = aggregateByVideo(sessions || []);

    const totalDurationSeconds = items.reduce((sum, item) => sum + item.duration_seconds, 0);
    const totalWatchedSeconds = (sessions || []).reduce((sum, session) => sum + session.watched_seconds, 0);
    const completedDurationSeconds = items.reduce((sum, item) => {
      const session = byVideo.get(item.video_id);
      return sum + Math.min(session?.watchedSeconds || 0, item.duration_seconds);
    }, 0);
    const startedVideos = items.filter((item) => (byVideo.get(item.video_id)?.watchedSeconds || 0) > 0).length;
    const totalVideos = items.length;

    return {
      totalLectureHours: Number((totalWatchedSeconds / 3600).toFixed(1)),
      completionPercentage:
        totalDurationSeconds > 0
          ? Math.round((completedDurationSeconds / totalDurationSeconds) * 100)
          : 0,
      topicProgressLabel:
        totalVideos > 0 ? `${startedVideos}/${totalVideos} saved lectures started` : 'No saved lectures yet',
      totalWatchedSeconds,
      totalDurationSeconds,
      startedVideos,
      totalVideos,
    };
  },
};
