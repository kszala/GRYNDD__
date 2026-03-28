// src/utils/savePlaylist.ts
import supabase from '../supabaseClient';

interface PlaylistData {
  [key: string]: any; // Or a better structure based on your playlist format
}

/**
 * Save a playlist to Supabase for the given user.
 *
 * @param userId - The Supabase user ID
 * @param name - Playlist name
 * @param data - Playlist data
 */
export async function savePlaylist(
  userId: string,
  name: string,
  data: PlaylistData
): Promise<void> {
  const { error } = await supabase.from("playlists").insert([
    {
      user_id: userId,
      name,
      data,
    },
  ]);

  if (error) {
    console.error("❌ Error saving playlist to Supabase:", error.message);
    throw error;
  } else {
    console.log("✅ Playlist saved to Supabase");
  }
}
