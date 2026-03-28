/**
 * Study Playlist Service
 * Handles saving videos to topic-specific study playlists
 */

import supabase from '../supabaseClient';

export interface StudyPlaylist {
  id: string;
  user_id: string;
  topic_id: string;
  title: string;
  created_at: string;
}

export interface StudyPlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  video_title: string;
  channel_title: string;
  thumbnail: string;
  duration: string;
  position: number;
  created_at: string;
}

/**
 * Get or create a study playlist for a given topic
 * @param userId Current user ID
 * @param topicId Topic/subject ID
 * @param topicName Name of the topic for playlist title
 * @returns Created or existing playlist
 */
export async function getOrCreatePlaylist(
  userId: string,
  topicId: string,
  topicName: string = 'Study Playlist'
): Promise<StudyPlaylist | null> {
  if (!userId || !topicId) return null;

  try {
    // Try to fetch existing playlist
    const { data: existing, error: fetchError } = await supabase
      .from('study_playlists')
      .select('*')
      .eq('topic_id', topicId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing;
    }

    // If unique constraint violation (playlist doesn't exist yet), create it
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching playlist:', fetchError);
      return null;
    }

    const title = `${topicName} Study Playlist`;
    const { data: newPlaylist, error: createError } = await supabase
      .from('study_playlists')
      .insert({
        user_id: userId,
        topic_id: topicId,
        title,
      })
      .select()
      .single();

    if (createError) {
      // Handle race condition where another request created it first
      if (createError.code === '23505') {
        return getOrCreatePlaylist(userId, topicId, topicName);
      }
      console.error('Error creating playlist:', createError);
      return null;
    }

    return newPlaylist;
  } catch (error) {
    console.error('Error in getOrCreatePlaylist:', error);
    return null;
  }
}

/**
 * Save a video to a study playlist
 * @param playlistId Playlist ID to save to
 * @param video Video data (videoId, title, channelTitle, thumbnail, duration)
 * @returns Success status
 */
export async function saveVideoToPlaylist(
  playlistId: string,
  video: {
    videoId: string;
    title: string;
    channelTitle: string;
    thumbnail?: string;
    duration: string;
  }
): Promise<boolean> {
  if (!playlistId || !video.videoId) return false;

  try {
    const { error } = await supabase
      .from('study_playlist_items')
      .insert({
        playlist_id: playlistId,
        video_id: video.videoId,
        video_title: video.title,
        channel_title: video.channelTitle,
        thumbnail: video.thumbnail || '',
        duration: video.duration,
        position: 0,
      });

    if (error) {
      // Handle duplicate video (already exists in playlist)
      if (error.code === '23505') {
        console.log('Video already exists in playlist');
        return true; // Treat as success
      }
      console.error('Error saving video to playlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveVideoToPlaylist:', error);
    return false;
  }
}

/**
 * Fetch all playlists for a user
 * @param userId User ID
 * @returns Array of playlists
 */
export async function fetchUserPlaylists(userId: string): Promise<StudyPlaylist[]> {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from('study_playlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user playlists:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchUserPlaylists:', error);
    return [];
  }
}

/**
 * Fetch all items in a playlist
 * @param playlistId Playlist ID
 * @returns Array of playlist items
 */
export async function fetchPlaylistItems(playlistId: string): Promise<StudyPlaylistItem[]> {
  if (!playlistId) return [];

  try {
    const { data, error } = await supabase
      .from('study_playlist_items')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching playlist items:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchPlaylistItems:', error);
    return [];
  }
}

/**
 * Get video IDs saved in a playlist (for quick checking)
 * @param playlistId Playlist ID
 * @returns Set of video IDs
 */
export async function fetchSavedVideoIds(playlistId: string): Promise<Set<string>> {
  if (!playlistId) return new Set();

  try {
    const { data, error } = await supabase
      .from('study_playlist_items')
      .select('video_id')
      .eq('playlist_id', playlistId);

    if (error) {
      console.error('Error fetching saved video IDs:', error);
      return new Set();
    }

    return new Set(data?.map(item => item.video_id) || []);
  } catch (error) {
    console.error('Error in fetchSavedVideoIds:', error);
    return new Set();
  }
}

/**
 * Remove video from playlist
 * @param playlistId Playlist ID
 * @param videoId Video ID to remove
 * @returns Success status
 */
export async function removeVideoFromPlaylist(
  playlistId: string,
  videoId: string
): Promise<boolean> {
  if (!playlistId || !videoId) return false;

  try {
    const { error } = await supabase
      .from('study_playlist_items')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error removing video from playlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in removeVideoFromPlaylist:', error);
    return false;
  }
}

/**
 * Delete entire playlist (cascades to items)
 * @param playlistId Playlist ID to delete
 * @returns Success status
 */
export async function deletePlaylist(playlistId: string): Promise<boolean> {
  if (!playlistId) return false;

  try {
    const { error } = await supabase
      .from('study_playlists')
      .delete()
      .eq('id', playlistId);

    if (error) {
      console.error('Error deleting playlist:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deletePlaylist:', error);
    return false;
  }
}
