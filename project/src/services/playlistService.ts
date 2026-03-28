import supabase from '../supabaseClient';
import type { Database } from '../types/database';
import type {
  ContinueLearningItem,
  GryndTubeFeed,
  GryndTubeSearchResult,
  GryndTubeTopicPlaylist,
  GryndTubeTopicPlaylistItem,
} from '../types/gryndtube';

type PlaylistRow = Database['public']['Tables']['study_playlists']['Row'];
type PlaylistItemRow = Database['public']['Tables']['study_playlist_items']['Row'];
type SessionRow = Database['public']['Tables']['video_sessions']['Row'];

const DEFAULT_TOPIC_NAME = 'Current Topic';

const mapPlaylistItem = (item: PlaylistItemRow): GryndTubeTopicPlaylistItem => ({
  id: item.id,
  playlistId: item.playlist_id,
  videoId: item.video_id,
  title: item.video_title,
  channelTitle: item.channel_title,
  thumbnail: item.thumbnail,
  duration: item.duration,
  durationSeconds: item.duration_seconds,
  position: item.position,
  createdAt: item.created_at,
});

const normalizeVideoForSave = (video: GryndTubeSearchResult) => ({
  videoId: video.videoId || video.id || '',
  title: video.title,
  channelTitle: video.channelTitle,
  thumbnail: video.thumbnail,
  duration: video.duration,
  durationSeconds: video.durationSeconds || 0,
});

const sumDuration = (items: GryndTubeTopicPlaylistItem[]) =>
  items.reduce((total, item) => total + item.durationSeconds, 0);

const getTopicName = async (topicId: string): Promise<string> => {
  const { data } = await supabase
    .from('syllabus_topics')
    .select('name')
    .eq('id', topicId)
    .maybeSingle();

  return data?.name || DEFAULT_TOPIC_NAME;
};

const getOrCreatePlaylistRow = async (userId: string, topicId: string): Promise<PlaylistRow> => {
  const { data: existing, error: existingError } = await supabase
    .from('study_playlists')
    .select('*')
    .eq('user_id', userId)
    .eq('topic_id', topicId)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  if (existingError && existingError.code !== 'PGRST116') {
    throw existingError;
  }

  const topicName = await getTopicName(topicId);
  const { data, error } = await supabase
    .from('study_playlists')
    .insert({
      user_id: userId,
      topic_id: topicId,
      title: `${topicName} Study Playlist`,
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return getOrCreatePlaylistRow(userId, topicId);
    }

    throw error;
  }

  return data;
};

const fetchPlaylistItems = async (playlistId: string) => {
  const { data, error } = await supabase
    .from('study_playlist_items')
    .select('*')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map(mapPlaylistItem);
};

const buildPlaylist = async (playlist: PlaylistRow): Promise<GryndTubeTopicPlaylist> => {
  const [topicName, items] = await Promise.all([
    getTopicName(playlist.topic_id),
    fetchPlaylistItems(playlist.id),
  ]);

  return {
    id: playlist.id,
    topicId: playlist.topic_id,
    topicName,
    title: playlist.title,
    items,
    totalDurationSeconds: sumDuration(items),
  };
};

const buildContinueLearning = (
  items: GryndTubeTopicPlaylistItem[],
  sessions: SessionRow[]
): ContinueLearningItem | null => {
  const sessionsByVideo = new Map<string, SessionRow>();

  for (const session of sessions) {
    const existing = sessionsByVideo.get(session.video_id);
    if (!existing || new Date(session.started_at).getTime() > new Date(existing.started_at).getTime()) {
      sessionsByVideo.set(session.video_id, session);
    }
  }

  const resumable = items
    .map((item) => {
      const session = sessionsByVideo.get(item.videoId);
      if (!session) {
        return null;
      }

      const completionPercentage = Math.min(
        100,
        session.completion_percentage ||
          (item.durationSeconds > 0 ? (session.watched_seconds / item.durationSeconds) * 100 : 0)
      );

      if (completionPercentage >= 98) {
        return null;
      }

      return {
        videoId: item.videoId,
        title: item.title,
        channelTitle: item.channelTitle,
        thumbnail: item.thumbnail,
        duration: item.duration,
        durationSeconds: item.durationSeconds,
        watchedSeconds: session.watched_seconds,
        completionPercentage,
        pauseCount: session.pause_count,
        seekCount: session.seek_count,
        lastWatchedAt: session.ended_at || session.started_at,
      } satisfies ContinueLearningItem;
    })
    .filter(Boolean) as ContinueLearningItem[];

  return resumable.sort(
    (left, right) => new Date(right.lastWatchedAt).getTime() - new Date(left.lastWatchedAt).getTime()
  )[0] || null;
};

export const playlistService = {
  async getTopicFeed(userId: string, topicId: string): Promise<GryndTubeFeed> {
    if (!userId || !topicId) {
      return { playlist: null, continueLearning: null };
    }

    const playlistRow = await getOrCreatePlaylistRow(userId, topicId);
    const playlist = await buildPlaylist(playlistRow);

    if (playlist.items.length === 0) {
      return { playlist, continueLearning: null };
    }

    const { data: sessions, error } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('subject_id', topicId)
      .in(
        'video_id',
        playlist.items.map((item) => item.videoId)
      )
      .order('started_at', { ascending: false });

    if (error) {
      throw error;
    }

    return {
      playlist,
      continueLearning: buildContinueLearning(playlist.items, sessions || []),
    };
  },

  async saveVideo(userId: string, topicId: string, video: GryndTubeSearchResult) {
    const normalized = normalizeVideoForSave(video);

    if (!userId || !topicId || video.type !== 'video' || !normalized.videoId) {
      throw new Error('A valid topic and video are required.');
    }

    const playlist = await getOrCreatePlaylistRow(userId, topicId);
    const { count, error: countError } = await supabase
      .from('study_playlist_items')
      .select('*', { count: 'exact', head: true })
      .eq('playlist_id', playlist.id);

    if (countError) {
      throw countError;
    }

    const nextPosition = count || 0;
    const { data, error } = await supabase
      .from('study_playlist_items')
      .insert({
        playlist_id: playlist.id,
        video_id: normalized.videoId,
        video_title: normalized.title,
        channel_title: normalized.channelTitle,
        thumbnail: normalized.thumbnail,
        duration: normalized.duration,
        duration_seconds: normalized.durationSeconds,
        position: nextPosition,
      })
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await supabase
          .from('study_playlist_items')
          .select('*')
          .eq('playlist_id', playlist.id)
          .eq('video_id', normalized.videoId)
          .maybeSingle();

        if (!existing) {
          throw error;
        }

        return {
          playlistId: playlist.id,
          item: mapPlaylistItem(existing),
          duplicate: true,
        };
      }

      throw error;
    }

    return {
      playlistId: playlist.id,
      item: mapPlaylistItem(data),
      duplicate: false,
    };
  },
};
