// src/utils/loadPlaylists.ts
import supabase from '../supabaseClient';

export interface PlaylistRow {
  id: string;
  user_id: string;
  name: string;
  data: any; // You can replace `any` with your playlist object structure
  inserted_at: string;
}

export async function loadPlaylists(userId: string): Promise<PlaylistRow[]> {
  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", userId)
    .order("inserted_at", { ascending: false });

  if (error) {
    console.error("❌ Error loading playlists:", error.message);
    return [];
  }

  return data || [];
}
