# Study Playlist Feature - Implementation Guide

## Overview
The "Save to Study Playlist" feature allows users to save YouTube videos to topic-specific study playlists. Each topic can have one playlist, and users can add multiple videos to that playlist.

## Database Schema

### Tables

#### `study_playlists`
- `id` (UUID): Primary key
- `user_id` (UUID): Reference to auth.users
- `topic_id` (UUID): Reference to syllabus_topics
- `title` (TEXT): e.g., "Physics - Chapter 1 Study Playlist"
- `created_at` (TIMESTAMP): Auto-populated
- **Unique Constraint**: (user_id, topic_id) - One playlist per user per topic

#### `study_playlist_items`
- `id` (UUID): Primary key
- `playlist_id` (UUID): Reference to study_playlists
- `video_id` (TEXT): YouTube video ID
- `video_title` (TEXT): Video title
- `channel_title` (TEXT): Channel name
- `thumbnail` (TEXT): Thumbnail URL
- `duration` (TEXT): Duration string (e.g., "12:34")
- `position` (INTEGER): Order in playlist (default 0)
- `created_at` (TIMESTAMP): Auto-populated
- **Unique Constraint**: (playlist_id, video_id) - Each video appears once per playlist

## Files Updated

### 1. `src/components/GryndTube.tsx`
Added state management and UI for saving videos:

**New State:**
- `currentPlaylist`: Currently loaded playlist
- `savedVideoIds`: Set of video IDs in current playlist (for quick lookup)
- `isSavingVideo`: Video ID currently being saved (for loading states)

**New Functions:**
- `getOrCreatePlaylist(topicId)`: Gets or creates playlist for current topic
- `saveVideoToPlaylist(video)`: Saves video to playlist
- `fetchPlaylist(topicId)`: Loads playlist and its videos
- `handleSaveVideo(video)`: UI handler for save button

**UI Changes:**
- Added "Save" button to video cards (only shown for videos when topic is selected)
- Button states: "Save" → "Saving..." → "Saved ✓" (disabled)
- Green accent color when saved

### 2. `src/services/studyPlaylist.ts` (New)
Encapsulated service layer with functions:
- `getOrCreatePlaylist()` - Get or create playlist
- `saveVideoToPlaylist()` - Save single video
- `fetchUserPlaylists()` - Get all user's playlists
- `fetchPlaylistItems()` - Get items in playlist
- `fetchSavedVideoIds()` - Quick video ID lookup
- `removeVideoFromPlaylist()` - Remove video
- `deletePlaylist()` - Delete entire playlist

### 3. `src/types/database.ts`
Added TypeScript definitions for:
- `study_playlists` table
- `study_playlist_items` table

### 4. `supabase/migrations/20260327095000_create_study_playlists.sql` (New)
Database migration with:
- Table creation
- Indexes for performance
- Row-Level Security (RLS) policies
- User authorization

## How It Works

### Flow Diagram
```
User selects Topic
    ↓
Component fetches/creates playlist
    ↓
Loads list of saved videos → Updates savedVideoIds state
    ↓
User clicks "Save" on video
    ↓
Check if already saved
    ↓ No: Call saveVideoToPlaylist()
    ↓
Button shows "Saving..."
    ↓
Supabase inserts video (or ignores duplicate)
    ↓
AddVideoId to savedVideoIds set
    ↓
Button shows "Saved ✓" (disabled)
```

### Key Features

1. **Automatic Playlist Creation**: No manual "Create Playlist" required
   - Playlist created on first save
   - Uses topic name for title

2. **Duplicate Prevention**: 
   - Unique constraint at DB level
   - UI shows immediately (optimistic update)
   - Graceful error handling for race conditions

3. **Topic-Scoped**:
   - Each topic has exactly one playlist
   - Switches playlists when topic changes
   - Clears UI when no topic selected

4. **Fast Lookups**:
   - `savedVideoIds` Set for instant "is saved?" checks
   - No re-fetching after first load

5. **Error Handling**:
   - Duplicate key errors (code 23505) handled gracefully
   - Console logging for debugging
   - No UI crashes on errors

## Usage in GryndTube Component

```typescript
// Automatically fetches/creates playlist when topic changes
useEffect(() => {
  if (topicId) {
    fetchPlaylist(topicId);
  } else {
    setCurrentPlaylist(null);
    setSavedVideoIds(new Set());
  }
}, [topicId, user]);

// Button appears on video cards
{result.type === 'video' && topicId && (
  <button onClick={handleSaveVideo}>
    {isSaved ? 'Saved ✓' : 'Save'}
  </button>
)}
```

## API Calls Made by Component

### On Topic Change
```typescript
// 1. Get/create playlist
POST /rest/v1/study_playlists (if creating)
GET /rest/v1/study_playlists?filter (if exists)

// 2. Fetch saved videos
GET /rest/v1/study_playlist_items?filter
```

### On Save Button Click
```typescript
// Get/create playlist if needed (if first save)
// Insert video into playlist
POST /rest/v1/study_playlist_items
// (Ignores 409 if duplicate)
```

## Row-Level Security

All tables have RLS enabled:
- Users can only see their own playlists
- Users can only modify their own playlists
- Foreign key enforcement at DB level

## Error Handling

| Scenario | Handling |
|----------|----------|
| Video already in playlist | Success (returns true) |
| Network error | Logged, UI shows error state briefly |
| Race condition (multiple saves) | Second request gets 409, retries fetch |
| Invalid topic/user | Graceful null return, UI disables button |

## Future Enhancements

- Reorder videos in playlist
- Rename playlists
- Share playlists with classmates
- Playlist-level study sessions
- Video watch progress tracking
- Collaborative playlists

## Migration Steps

1. Run SQL migration to create tables and RLS policies
2. Update `database.ts` with new table types (done)
3. Deploy `studyPlaylist.ts` service
4. Update `GryndTube.tsx` component (done)
5. Test with topic selection and video saves

## Testing Checklist

- [ ] Select topic → "Save" button appears
- [ ] Click "Save" → Shows "Saving..." → "Saved ✓"
- [ ] Click "Save" on same video → Error handled gracefully
- [ ] Switch topics → Different playlists load
- [ ] Refresh page → Saved videos still marked as saved
- [ ] Multiple users → Can't see each other's playlists
- [ ] Missing topic name → Defaults to "Study Playlist"
