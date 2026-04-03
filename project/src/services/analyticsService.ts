import supabase from '../supabaseClient';
import { addToQueue, registerOutboxHandler, startQueueProcessor } from '../utils/outboxQueue';
import type { Database } from '../types/database';
import type { TopicAnalyticsSnapshot, VideoSessionMetrics } from '../types/gryndtube';

type SessionRow = Database['public']['Tables']['video_sessions']['Row'];
type PlaylistItemRow = Database['public']['Tables']['study_playlist_items']['Row'];
type VideoEventType = Database['public']['Tables']['video_events']['Row']['event_type'];
type VideoEventRow = Database['public']['Tables']['video_events']['Row'];

type VideoEventMetadata = {
  videoId: string;
  videoTitle?: string | null;
  channelId?: string | null;
  channelName?: string | null;
  topicId?: string | null;
  totalDurationSeconds: number;
  watchedSeconds?: number;
  pauseCount?: number;
  seekCount?: number;
  seekFromSeconds?: number;
  seekToSeconds?: number;
};

type QueueVideoEventPayload = {
  eventId: string;
  eventSequence: number;
  sessionId: string;
  userId: string;
  type: VideoEventType;
  timestamp: string;
  videoTimeSeconds: number | null;
  metadata: VideoEventMetadata;
};

type QueueVideoSyncPayload = {
  sessionId: string;
  userId: string;
};

const buildCompletionPercentage = (watchedSeconds: number, totalDurationSeconds: number) => {
  if (!totalDurationSeconds) {
    return 0;
  }

  return Math.min(100, Math.round((watchedSeconds / totalDurationSeconds) * 100));
};

const aggregateByVideo = (
  sessions: Array<Pick<SessionRow, 'video_id' | 'watched_seconds' | 'total_duration_seconds'>>
) => {
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

const generateSessionId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let videoOutboxHandlersRegistered = false;
const videoEventSequence = new Map<string, number>();

const nextVideoEventSequence = (sessionId: string) => {
  const current = videoEventSequence.get(sessionId) ?? Date.now() * 1000;
  const next = current + 1;
  videoEventSequence.set(sessionId, next);
  return next;
};

const buildVideoEventIdentity = (sessionId: string, type: VideoEventType, timestamp: string) => {
  const eventSequence = nextVideoEventSequence(sessionId);
  const eventId = `${sessionId}:${type}:${eventSequence}:${timestamp}`;
  return { eventId, eventSequence };
};

const parseMetadata = (value: unknown): VideoEventMetadata | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const metadata = value as Partial<VideoEventMetadata>;
  if (!metadata.videoId || typeof metadata.videoId !== 'string') {
    return null;
  }

  const totalDurationSeconds = Number(metadata.totalDurationSeconds || 0);
  if (!Number.isFinite(totalDurationSeconds) || totalDurationSeconds <= 0) {
    return null;
  }

  return {
    videoId: metadata.videoId,
    videoTitle: metadata.videoTitle ?? null,
    channelId: metadata.channelId ?? null,
    channelName: metadata.channelName ?? null,
    topicId: metadata.topicId ?? null,
    totalDurationSeconds: Math.max(1, Math.floor(totalDurationSeconds)),
    watchedSeconds: typeof metadata.watchedSeconds === 'number' ? metadata.watchedSeconds : undefined,
    pauseCount: typeof metadata.pauseCount === 'number' ? metadata.pauseCount : undefined,
    seekCount: typeof metadata.seekCount === 'number' ? metadata.seekCount : undefined,
    seekFromSeconds: typeof metadata.seekFromSeconds === 'number' ? metadata.seekFromSeconds : undefined,
    seekToSeconds: typeof metadata.seekToSeconds === 'number' ? metadata.seekToSeconds : undefined,
  };
};

const deriveVideoSessionFromEvents = (
  sessionId: string,
  userId: string,
  rows: Array<{
    event_type: VideoEventType;
    timestamp: string;
    event_sequence?: number;
    video_time_seconds: number | null;
    metadata: unknown;
  }>
) => {
  if (rows.length === 0) {
    return null;
  }

  const sortedRows = [...rows].sort((left, right) => {
    const timeDelta = new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
    if (timeDelta !== 0) {
      return timeDelta;
    }
    return (left.event_sequence || 0) - (right.event_sequence || 0);
  });

  const firstMetadata = sortedRows
    .map((row) => parseMetadata(row.metadata))
    .find((metadata): metadata is VideoEventMetadata => Boolean(metadata));

  if (!firstMetadata) {
    return null;
  }

  const pauseCount = sortedRows.filter((row) => row.event_type === 'pause').length;
  const seekCount = sortedRows.filter((row) => row.event_type === 'seek').length;

  const maxWatchedFromEvents = sortedRows.reduce((maxSeconds, row) => {
    const metadata = parseMetadata(row.metadata);
    const watchedFromMetadata =
      metadata && typeof metadata.watchedSeconds === 'number'
        ? Math.max(0, Math.floor(metadata.watchedSeconds))
        : 0;
    const watchedFromVideoTime = row.video_time_seconds ? Math.max(0, Math.floor(row.video_time_seconds)) : 0;
    return Math.max(maxSeconds, watchedFromMetadata, watchedFromVideoTime);
  }, 0);

  const endedAt = [...sortedRows]
    .reverse()
    .find((row) => row.event_type === 'end')?.timestamp || null;

  const totalDurationSeconds = Math.max(1, Math.floor(firstMetadata.totalDurationSeconds));

  return {
    id: sessionId,
    user_id: userId,
    video_id: firstMetadata.videoId,
    video_title: firstMetadata.videoTitle || null,
    channel_id: firstMetadata.channelId || null,
    channel_name: firstMetadata.channelName || null,
    watched_seconds: maxWatchedFromEvents,
    total_duration_seconds: totalDurationSeconds,
    completion_percentage: buildCompletionPercentage(maxWatchedFromEvents, totalDurationSeconds),
    pause_count: pauseCount,
    seek_count: seekCount,
    focus_score: null,
    subject_id: firstMetadata.topicId || null,
    started_at: sortedRows[0].timestamp,
    ended_at: endedAt,
  };
};

const deriveVideoSessionsFromEventRows = (userId: string, rows: VideoEventRow[]) => {
  const grouped = new Map<string, Array<{
    event_type: VideoEventType;
    timestamp: string;
    event_sequence?: number;
    video_time_seconds: number | null;
    metadata: unknown;
  }>>();

  for (const row of rows) {
    if (!grouped.has(row.session_id)) {
      grouped.set(row.session_id, []);
    }

    grouped.get(row.session_id)!.push({
      event_type: row.event_type,
      timestamp: row.timestamp,
      event_sequence: row.event_sequence,
      video_time_seconds: row.video_time_seconds,
      metadata: row.metadata,
    });
  }

  return Array.from(grouped.entries())
    .map(([sessionId, sessionRows]) => deriveVideoSessionFromEvents(sessionId, userId, sessionRows))
    .filter((session): session is NonNullable<typeof session> => Boolean(session));
};

const fetchVideoEventsForUser = async (
  userId: string,
  options?: {
    fromIso?: string;
    videoId?: string;
    topicId?: string;
  }
) => {
  let query = supabase
    .from('video_events')
    .select('id, event_id, event_sequence, session_id, user_id, event_type, timestamp, video_time_seconds, metadata')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .order('event_sequence', { ascending: true });

  if (options?.fromIso) {
    query = query.gte('timestamp', options.fromIso);
  }

  if (options?.videoId) {
    query = query.eq('metadata->>videoId', options.videoId);
  }

  if (options?.topicId) {
    query = query.eq('metadata->>topicId', options.topicId);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data || []) as VideoEventRow[];
};

const syncVideoSessionFromEvents = async (sessionId: string, userId: string) => {
  const { data: events, error } = await supabase
    .from('video_events')
    .select('event_type, timestamp, event_sequence, video_time_seconds, metadata')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('timestamp', { ascending: true })
    .order('event_sequence', { ascending: true });

  if (error) {
    throw error;
  }

  const sessionPayload = deriveVideoSessionFromEvents(sessionId, userId, events || []);
  if (!sessionPayload) {
    return;
  }

  const { error: upsertError } = await supabase
    .from('video_sessions')
    .upsert(sessionPayload as SessionRow, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

  if (upsertError) {
    throw upsertError;
  }
};

const registerVideoOutboxHandlers = () => {
  if (videoOutboxHandlersRegistered) {
    return;
  }

  videoOutboxHandlersRegistered = true;
  startQueueProcessor();

  registerOutboxHandler('video_event_insert', async (payload) => {
    const typedPayload = payload as QueueVideoEventPayload;
    const { error } = await supabase.from('video_events').upsert({
      event_id: typedPayload.eventId,
      event_sequence: typedPayload.eventSequence,
      session_id: typedPayload.sessionId,
      user_id: typedPayload.userId,
      event_type: typedPayload.type,
      timestamp: typedPayload.timestamp,
      video_time_seconds: typedPayload.videoTimeSeconds,
      metadata: typedPayload.metadata,
    }, {
      onConflict: 'event_id',
      ignoreDuplicates: true,
    });

    if (error) {
      throw error;
    }
  });

  registerOutboxHandler('video_session_sync', async (payload) => {
    const typedPayload = payload as QueueVideoSyncPayload;
    await syncVideoSessionFromEvents(typedPayload.sessionId, typedPayload.userId);
  });
};

const enqueueVideoEvent = (payload: QueueVideoEventPayload, syncAfter = true) => {
  addToQueue('video_event_insert', payload);
  if (syncAfter) {
    addToQueue('video_session_sync', {
      sessionId: payload.sessionId,
      userId: payload.userId,
    } as QueueVideoSyncPayload);
  }
};

export const analyticsService = {
  registerVideoOutboxHandlers,

  async startPlaybackSession(
    userId: string,
    input: {
      videoId: string;
      videoTitle: string;
      channelName: string;
      totalDurationSeconds: number;
      topicId: string | null;
      startTimeSeconds: number;
    }
  ) {
    if (!userId || !input.videoId) {
      throw new Error('userId and videoId are required to start a session.');
    }

    registerVideoOutboxHandlers();
    const sessionId = generateSessionId();
    const startTimestamp = new Date().toISOString();
    const startIdentity = buildVideoEventIdentity(sessionId, 'play', startTimestamp);
    enqueueVideoEvent({
      eventId: startIdentity.eventId,
      eventSequence: startIdentity.eventSequence,
      sessionId,
      userId,
      type: 'play',
      timestamp: startTimestamp,
      videoTimeSeconds: Math.max(0, Math.floor(input.startTimeSeconds || 0)),
      metadata: {
        videoId: input.videoId,
        videoTitle: input.videoTitle,
        channelName: input.channelName,
        topicId: input.topicId,
        totalDurationSeconds: Math.max(1, Math.floor(input.totalDurationSeconds || 1)),
        watchedSeconds: 0,
      },
    });

    return sessionId;
  },

  async logPlaybackEvent(
    userId: string,
    payload: {
      sessionId: string;
      type: VideoEventType;
      videoTimeSeconds: number;
      videoId: string;
      videoTitle: string;
      channelName: string;
      topicId: string | null;
      totalDurationSeconds: number;
      watchedSeconds: number;
      pauseCount: number;
      seekCount: number;
      seekFromSeconds?: number;
      seekToSeconds?: number;
    }
  ) {
    if (!userId || !payload.sessionId || !payload.videoId) {
      return;
    }

    registerVideoOutboxHandlers();
    const eventTimestamp = new Date().toISOString();
    const identity = buildVideoEventIdentity(payload.sessionId, payload.type, eventTimestamp);
    enqueueVideoEvent({
      eventId: identity.eventId,
      eventSequence: identity.eventSequence,
      sessionId: payload.sessionId,
      userId,
      type: payload.type,
      timestamp: eventTimestamp,
      videoTimeSeconds: Math.max(0, Math.floor(payload.videoTimeSeconds || 0)),
      metadata: {
        videoId: payload.videoId,
        videoTitle: payload.videoTitle,
        channelName: payload.channelName,
        topicId: payload.topicId,
        totalDurationSeconds: Math.max(1, Math.floor(payload.totalDurationSeconds || 1)),
        watchedSeconds: Math.max(0, Math.floor(payload.watchedSeconds || 0)),
        pauseCount: Math.max(0, Math.floor(payload.pauseCount || 0)),
        seekCount: Math.max(0, Math.floor(payload.seekCount || 0)),
        seekFromSeconds:
          typeof payload.seekFromSeconds === 'number'
            ? Math.max(0, Math.floor(payload.seekFromSeconds))
            : undefined,
        seekToSeconds:
          typeof payload.seekToSeconds === 'number'
            ? Math.max(0, Math.floor(payload.seekToSeconds))
            : undefined,
      },
    });
  },

  async endPlaybackSession(
    userId: string,
    payload: {
      sessionId: string;
      videoTimeSeconds: number;
      videoId: string;
      videoTitle: string;
      channelName: string;
      topicId: string | null;
      totalDurationSeconds: number;
      watchedSeconds: number;
      pauseCount: number;
      seekCount: number;
    }
  ) {
    if (!userId || !payload.sessionId) {
      return;
    }

    registerVideoOutboxHandlers();
    const endTimestamp = new Date().toISOString();
    const endIdentity = buildVideoEventIdentity(payload.sessionId, 'end', endTimestamp);
    enqueueVideoEvent({
      eventId: endIdentity.eventId,
      eventSequence: endIdentity.eventSequence,
      sessionId: payload.sessionId,
      userId,
      type: 'end',
      timestamp: endTimestamp,
      videoTimeSeconds: Math.max(0, Math.floor(payload.videoTimeSeconds || 0)),
      metadata: {
        videoId: payload.videoId,
        videoTitle: payload.videoTitle,
        channelName: payload.channelName,
        topicId: payload.topicId,
        totalDurationSeconds: Math.max(1, Math.floor(payload.totalDurationSeconds || 1)),
        watchedSeconds: Math.max(0, Math.floor(payload.watchedSeconds || 0)),
        pauseCount: Math.max(0, Math.floor(payload.pauseCount || 0)),
        seekCount: Math.max(0, Math.floor(payload.seekCount || 0)),
      },
    });
  },

  async getActivePlaybackSession(userId: string, videoId: string) {
    if (!userId || !videoId) {
      return null;
    }

    const rows = await fetchVideoEventsForUser(userId, { videoId });
    const sessions = deriveVideoSessionsFromEventRows(userId, rows)
      .filter((session) => session.video_id === videoId && !session.ended_at)
      .sort((left, right) => new Date(right.started_at).getTime() - new Date(left.started_at).getTime());

    const latest = sessions[0];
    if (!latest) {
      return null;
    }

    return {
      id: latest.id,
      watched_seconds: latest.watched_seconds,
      pause_count: latest.pause_count,
      seek_count: latest.seek_count,
      total_duration_seconds: latest.total_duration_seconds,
      started_at: latest.started_at,
    };
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

    const rows = await fetchVideoEventsForUser(userId, {
      fromIso: dayStart.toISOString(),
    });
    const sessions = deriveVideoSessionsFromEventRows(userId, rows).filter(
      (session) => new Date(session.started_at).getTime() >= dayStart.getTime()
    );
    const totalTime = sessions.reduce((sum, session) => sum + (session.watched_seconds || 0), 0);
    const totalVideos = new Set(sessions.map((session) => session.video_id)).size;

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

    const [{ data: playlistItems, error: playlistError }, videoEventRows] =
      await Promise.all([
        supabase
          .from('study_playlist_items')
          .select('video_id, duration_seconds, playlist:study_playlists!inner(topic_id, user_id)')
          .eq('playlist.topic_id', topicId)
          .eq('playlist.user_id', userId),
        fetchVideoEventsForUser(userId, { topicId }),
      ]);

    if (playlistError) {
      throw playlistError;
    }

    const derivedSessions = deriveVideoSessionsFromEventRows(userId, videoEventRows || []).filter(
      (session) => session.subject_id === topicId
    );

    const items = (playlistItems || []) as Array<
      Pick<PlaylistItemRow, 'video_id' | 'duration_seconds'>
    >;
    const byVideo = aggregateByVideo(derivedSessions);

    const totalDurationSeconds = items.reduce((sum, item) => sum + item.duration_seconds, 0);
    const totalWatchedSeconds = derivedSessions.reduce((sum, session) => sum + session.watched_seconds, 0);
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

  /**
   * Fetch all session events for a user for today
   * Used by analytics engine to compute metrics
   */
  async getTodayEvents(userId: string) {
    if (!userId) {
      return [];
    }

    // Get start of today in UTC
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

    const { data, error } = await supabase
      .from('session_events')
      .select('session_id, event_type, event_timestamp, duration_since_last_event_seconds, metadata')
      .eq('user_id', userId)
      .gte('event_timestamp', startOfDay.toISOString())
      .order('event_timestamp', { ascending: true })
      .order('event_sequence', { ascending: true });

    if (error) {
      console.error('Error fetching session events:', error);
      return [];
    }

    return (data || []) as Array<{
      session_id: string;
      event_type: string;
      event_timestamp: string;
      duration_since_last_event_seconds: number | null;
      metadata: Record<string, any> | null;
    }>;
  },

  /**
   * Fetch session events for a specific date range
   */
  async getEventsInRange(userId: string, fromDate: Date, toDate: Date) {
    if (!userId) {
      return [];
    }

    const { data, error } = await supabase
      .from('session_events')
      .select('session_id, event_type, event_timestamp, duration_since_last_event_seconds, metadata')
      .eq('user_id', userId)
      .gte('event_timestamp', fromDate.toISOString())
      .lte('event_timestamp', toDate.toISOString())
      .order('event_timestamp', { ascending: true })
      .order('event_sequence', { ascending: true });

    if (error) {
      console.error('Error fetching session events in range:', error);
      return [];
    }

    return (data || []) as Array<{
      session_id: string;
      event_type: string;
      event_timestamp: string;
      duration_since_last_event_seconds: number | null;
      metadata: Record<string, any> | null;
    }>;
  },
};
