# GryndTube Focus Mode - Complete Implementation Guide

## 🎯 What Changed

The GryndTube component now uses a **dual-mode UI system**:

### Mode 1: SEARCH MODE (Before saving)
- User searches for videos
- Sees filtered results with "Save" buttons
- No topic selected or no playlist created yet
- Default view when starting

### Mode 2: FOCUS MODE (After saving) ← PRIMARY NOW
- Shows study playlist for the selected topic
- One-path interface to avoid distraction  
- Tracks progress through saved videos
- Locked search to maintain focus

## 🏗️ Component Structure

```
GryndTube Component
├── State Management
│   ├── currentPlaylist: StudyPlaylist
│   ├── currentPlaylistItems: StudyPlaylistItem[]
│   ├── currentPlaylistVideoIndex: number
│   ├── showPlaylistChangePrompt: boolean
│   └── ...other search state
│
├── Handler Functions
│   ├── fetchPlaylist() - Load playlist + items
│   ├── handleContinueLearning() - Play current video
│   ├── handlePlayPlaylistItem() - Play specific video
│   ├── calculateProgressPercentage() - Calculate 0-100%
│   └── handleChangePlaylist() - Reset to search
│
├── Render Components
│   ├── FocusModeUI() - New primary interface
│   ├── Player UI - When video is playing
│   └── SearchMode - Fallback to search
│
└── Conditional Rendering
    if currentPlaylist && items.length > 0 → FocusMode
    else if activeMedia → Player
    else → SearchMode
```

## 🎨 FocusModeUI Layout

### Visual Structure
```
┌─────────────────────────────────────┐
│ 📚 Your Study Playlist              │
│ Physics - Chapter 1                 │
│                                     │
│ [ ▶ Continue Learning ]             │ ← Green CTA
│                                     │
│ Progress: [████░░░░░] 40%          │ ← Psychology
│                                     │
│ [ ✓ Intro               12:34 ]     │
│ [ ▶ First Law           8:45  ]     │ ← Clickable items
│ [ • Second Law          15:20 ]     │
│ [ • Third Law           6:12  ]     │
│ [ • Numericals          22:15 ]     │
│                                     │
│ [ ⟲ Change Playlist ]               │ ← Low friction
└─────────────────────────────────────┘
```

### Component Sections

#### 1. HEADER
- Shows "📚 Your Study Playlist"
- Displays playlist title (e.g., "Physics - Chapter 1")
- Psychological trigger: "Yours" = ownership

#### 2. CONTINUE LEARNING BUTTON
- **Color**: Accent green (#8B9E6E)
- **Size**: Full width, 14px padding
- **Action**: Plays current or next unplayed video
- **UX**: Most prominent - first thing user clicks

#### 3. PROGRESS BAR
- **Psychology**: Shows completion percentage
- **Animation**: Smooth width transition
- **Update**: Increments as user watches more

#### 4. VIDEO LIST
- **Status Indicators**:
  - ✓ = Completed
  - ▶ = Currently watching
  - • = Not started
- **Interactive**: Click any video to play it
- **Hover effect**: Accent border appears
- **Current highlighted**: Dark background + accent border

#### 5. CHANGE PLAYLIST BUTTON
- **Style**: Ghost button (outline only)
- **Friction**: Low (modal confirmation required)
- **Purpose**: Allow users to switch topics if needed

## 🔄 State Flow Diagram

```
User Selects Topic
    ↓
useEffect triggers fetchPlaylist(topicId)
    ↓
Query: study_playlists (get or create)
    ↓
Query: study_playlist_items (load videos)
    ↓
Update state:
  - currentPlaylist
  - currentPlaylistItems
  - currentPlaylistVideoIndex = 0
  - savedVideoIds Set
    ↓
Component re-renders with FocusMode
    ↓
If currentPlaylist && items.length > 0
  → Show FocusModeUI
Else
  → Show SearchMode
```

## 📊 Progress Calculation

```typescript
const calculateProgressPercentage = (): number => {
  if (currentPlaylistItems.length === 0) return 0;
  const completedCount = currentPlaylistVideoIndex;
  // Completes when: index increases as user watches
  return Math.round((completedCount / currentPlaylistItems.length) * 100);
};
```

**Example**:
- 6 videos total
- User watched 2 (index = 2)
- Progress = (2/6) × 100 = 33%

## 🎮 User Interactions

### Continue Learning
```
handleContinueLearning()
  ↓
Get video at currentPlaylistVideoIndex
  ↓
Convert StudyPlaylistItem → YouTubeSearchResult
  ↓
Call handleSelectMedia()
  ↓
Player opens
```

### Play Specific Video
```
Click video in list
  ↓
handlePlayPlaylistItem(item, index)
  ↓
setCurrentPlaylistVideoIndex(index)
  ↓
Convert & play
```

### Change Playlist
```
Click "Change Playlist"
  ↓
Show confirmation modal
  ↓
Click "Change"
  ↓
handleChangePlaylist()
  ↓
Reset all state
  ↓
Show SearchMode
```

## 🔐 Data Consistency

### On Playlist Creation
1. Check if `study_playlists.(user_id, topic_id)` exists
2. If yes → Use existing
3. If no → Create new with topic name
4. Fetch all `study_playlist_items` for playlist

### On Topic Change
1. Clear previous playlist state
2. Fetch new playlist
3. Reset video index to 0
4. Update savedVideoIds Set

### On Video Save (in SearchMode)
1. Get/create playlist for current topic
2. Insert video (ignore if duplicate)
3. Update savedVideoIds Set immediately
4. When user navigates away, button shows "Saved ✓"

## 💾 Database Schema (Reference)

```sql
study_playlists:
- id (UUID)
- user_id (UUID) 
- topic_id (UUID)
- title (TEXT)
- created_at (TIMESTAMP)
- UNIQUE(user_id, topic_id)

study_playlist_items:
- id (UUID)
- playlist_id (UUID)
- video_id (TEXT)
- video_title (TEXT)
- channel_title (TEXT)
- thumbnail (TEXT)
- duration (TEXT)
- position (INTEGER)
- created_at (TIMESTAMP)
- UNIQUE(playlist_id, video_id)
```

## 🧪 Testing Checklist

- [ ] Select topic → FocusMode appears with 0 videos
- [ ] Save video in SearchMode → appears in FocusMode list
- [ ] Save multiple videos → all appear in list
- [ ] Click "Continue Learning" → player opens on first video
- [ ] Click video in list → player opens on that video
- [ ] Progress bar → increases as video index increases
- [ ] "Change Playlist" → shows modal, then resets to SearchMode
- [ ] Switch topics → FocusMode shows different playlist
- [ ] Refresh page → playlist state persists (sync with DB)
- [ ] Multiple users → can't see each other's playlists

## 🚀 Performance Notes

- **Lazy load**: Playlist items fetched only when topic selected
- **Quick checks**: `savedVideoIds` Set for O(1) duplicate detection
- **Optimized renders**: FocusModeUI components are stable
- **Smooth animations**: Progress bar and transitions

## 🔮 Future Enhancements

1. **Reorder videos**: Drag/drop in playlist
2. **Playlist sharing**: Collaborate with classmates
3. **Watch history**: Track which videos watched
4. **Study sessions**: Time spent per video
5. **Notes per video**: Add notes while studying
6. **Bookmarks**: Save timestamps within videos
7. **Export**: Download playlist as PDF study guide

## 🎓 UX Psychology Notes

### Why This Works
✅ **One path** → No analysis paralysis  
✅ **Progress bar** → Dopamine hit on completion  
✅ **"Yours"** → Ownership/investment  
✅ **Locked search** → Reduced distraction  
✅ **Continue button** → Lowest friction entry  

### Contrast to YouTube
❌ YouTube: Infinite recommendations → Endless scroll  
✅ Grynd: Curated list → Completion mindset  

## 📝 Code Examples

### Add Video to Playlist (from SearchMode)
```typescript
handleSaveVideo(video)
  → saveVideoToPlaylist(video)
  → insert into study_playlist_items
  → update savedVideoIds Set in memory
  → button shows "Saved ✓"
```

### Switch to FocusMode (after topic selection)
```typescript
// In useEffect watching topicId
if (topicId) {
  fetchPlaylist(topicId) // Loads items from DB
}
// Re-render checks:
if (currentPlaylist && currentPlaylistItems.length > 0) {
  return <FocusModeUI /> // Shows focus interface
}
```

### Progress Updates (simulated)
```typescript
// As user watches videos
handlePlayPlaylistItem(item, index=1) 
  → setCurrentPlaylistVideoIndex(1)
  → calculateProgressPercentage() = 17%
  → Progress bar animates to 17%
```

---

**Key Files**:
- `src/components/GryndTube.tsx` - Main component with dual modes
- `src/services/studyPlaylist.ts` - Service layer
- `supabase/migrations/20260327095000_create_study_playlists.sql` - Database setup
