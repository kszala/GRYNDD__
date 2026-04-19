import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { youtubeService } from '../services/youtubeService';
import supabase from '../supabaseClient';
import { useTimerStore } from '../store/timestore';
import { SearchHero } from './gryndtube/SearchHero';
import { SearchResultGrid } from './gryndtube/SearchResultGrid';
import { VideoPlayerPanel } from './gryndtube/VideoPlayerPanel';
import { StudyLoadPanel } from './gryndtube/StudyLoadPanel';
import { RangeCalculator } from './gryndtube/RangeCalculator';
import { formatSeconds } from '../utils/time';
import type { GryndTubeSearchResult, GryndTubeTopicPlaylistItem } from '../types/gryndtube';
import type { YouTubePlaylist, YouTubeVideo } from '../services/youtube';

interface GryndTubeProps {
  user: {
    id: string;
  };
}

type SavedItem = {
  id: string;
  type: 'video' | 'playlist';
  videoId?: string | null;
  playlistId?: string | null;
  title: string;
  thumbnail?: string | null;
  durationSeconds?: number | null;
  createdAt: string;
};

type ContinueWatching = {
  videoId: string;
  title: string;
  thumbnail: string;
  lastWatchedSeconds: number;
  durationSeconds: number;
};

type SpeedDurations = {
  normal: string;
  x125: string;
  x15: string;
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getSpeedDurations = (seconds: number): SpeedDurations => ({
  normal: formatTime(seconds),
  x125: formatTime(seconds / 1.25),
  x15: formatTime(seconds / 1.5),
});

const mapVideoToPlaylistItem = (
  video: YouTubeVideo,
  playlistId: string,
  position: number
): GryndTubeTopicPlaylistItem => ({
  id: `${playlistId}-${video.videoId}-${position}`,
  playlistId,
  videoId: video.videoId,
  title: video.title,
  channelTitle: video.channelTitle,
  thumbnail: video.thumbnail,
  duration: video.duration,
  durationSeconds: video.durationSeconds || 0,
  position,
  createdAt: new Date().toISOString(),
});

const buildSavedVideoItem = (
  videoId: string,
  title: string,
  thumbnail: string,
  durationSeconds: number
): GryndTubeTopicPlaylistItem => ({
  id: `saved-${videoId}`,
  playlistId: 'saved-videos',
  videoId,
  title,
  channelTitle: 'Unknown Channel',
  thumbnail,
  duration: formatSeconds(durationSeconds),
  durationSeconds,
  position: 0,
  createdAt: new Date().toISOString(),
});

export default function GryndTube({ user }: GryndTubeProps) {
  const topicId = useTimerStore((state) => state.topicId);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<GryndTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activePlaylist, setActivePlaylist] = useState<YouTubePlaylist | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<GryndTubeTopicPlaylistItem | null>(null);
  const [resumeAtSeconds, setResumeAtSeconds] = useState<number | undefined>(undefined);
  const [continueWatching, setContinueWatching] = useState<ContinueWatching | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [savingVideoIds, setSavingVideoIds] = useState<Set<string>>(new Set());
  const [savingPlaylistIds, setSavingPlaylistIds] = useState<Set<string>>(new Set());
  const [videoDurations, setVideoDurations] = useState<SpeedDurations | null>(null);

  useEffect(() => {
    console.log('SELECTED VIDEO:', selectedVideo);
  }, [selectedVideo]);

  useEffect(() => {
    if (selectedVideo?.durationSeconds && selectedVideo.durationSeconds > 0) {
      setVideoDurations(getSpeedDurations(selectedVideo.durationSeconds));
    } else {
      setVideoDurations(null);
    }
  }, [selectedVideo?.durationSeconds]);

  const savedVideoIds = useMemo(
    () =>
      new Set(
        savedItems
          .filter((item) => item.type === 'video')
          .map((item) => item.videoId || '')
          .filter(Boolean)
      ),
    [savedItems]
  );

  const savedPlaylistIds = useMemo(
    () =>
      new Set(
        savedItems
          .filter((item) => item.type === 'playlist')
          .map((item) => item.playlistId || '')
          .filter(Boolean)
      ),
    [savedItems]
  );

  const activeVideos = activePlaylist?.videos || [];
  const totalDurationSeconds = useMemo(
    () => activeVideos.reduce((sum, video) => sum + (video.durationSeconds || 0), 0),
    [activeVideos]
  );

  const savedDurationSeconds = useMemo(
    () =>
      savedItems
        .filter((item) => item.type === 'video')
        .reduce((sum, item) => sum + (item.durationSeconds || 0), 0),
    [savedItems]
  );

  const loadSavedItems = async () => {
    if (!user.id) {
      setSavedItems([]);
      return;
    }

    const { data, error } = await supabase
      .from('saved_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      setPageError(error.message);
      return;
    }

    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      type: item.type,
      videoId: item.video_id,
      playlistId: item.playlist_id,
      title: item.title,
      thumbnail: item.thumbnail,
      durationSeconds: item.duration_seconds,
      createdAt: item.created_at,
    })) as SavedItem[];

    setSavedItems(mapped);
  };

  const loadContinueWatching = async () => {
    if (!user.id) {
      setContinueWatching(null);
      return;
    }

    const { data, error } = await supabase
      .from('continue_watching')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      const errorCode = (error as { code?: string }).code;
      if (!errorCode || errorCode !== 'PGRST116') {
        setPageError(error.message);
        return;
      }
    }

    if (!data?.video_id) {
      setContinueWatching(null);
      return;
    }

    setContinueWatching({
      videoId: data.video_id,
      title: data.title || 'Untitled Video',
      thumbnail: data.thumbnail || '',
      lastWatchedSeconds: data.last_watched_seconds || 0,
      durationSeconds: data.duration_seconds || 0,
    });
  };

  useEffect(() => {
    void loadSavedItems();
    void loadContinueWatching();
  }, [user.id]);

  const handleSearch = async () => {
    const trimmedQuery = searchInput.trim();
    setPageError(null);

    if (!trimmedQuery) {
      setSearchResults([]);
      setIsSearching(false);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    setIsSearching(true);
    try {
      const results = await youtubeService.search(trimmedQuery);
      setSearchResults(results);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveVideo = async (result: GryndTubeSearchResult) => {
    const resolvedVideoId = result.videoId || result.id;
    if (!resolvedVideoId || !user.id) {
      console.warn('Invalid video skipped', result);
      return;
    }

    if (savedVideoIds.has(resolvedVideoId)) {
      return;
    }

    setSavingVideoIds((current) => new Set(current).add(resolvedVideoId));

    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: user.id,
        type: 'video',
        video_id: resolvedVideoId,
        title: result.title,
        thumbnail: result.thumbnail,
        duration_seconds: result.durationSeconds || 0,
      })
      .select('*')
      .single();

    setSavingVideoIds((current) => {
      const next = new Set(current);
      next.delete(resolvedVideoId);
      return next;
    });

    if (error) {
      setPageError(error.message);
      return;
    }

    if (data) {
      setSavedItems((prev) => [
        {
          id: data.id,
          type: data.type,
          videoId: data.video_id,
          playlistId: data.playlist_id,
          title: data.title,
          thumbnail: data.thumbnail,
          durationSeconds: data.duration_seconds,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    }
  };

  const handleSavePlaylist = async (playlistId: string, title: string, thumbnail: string) => {
    if (!playlistId || !user.id) {
      return;
    }

    if (savedPlaylistIds.has(playlistId)) {
      return;
    }

    setSavingPlaylistIds((current) => new Set(current).add(playlistId));

    const { data, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: user.id,
        type: 'playlist',
        playlist_id: playlistId,
        title,
        thumbnail,
      })
      .select('*')
      .single();

    setSavingPlaylistIds((current) => {
      const next = new Set(current);
      next.delete(playlistId);
      return next;
    });

    if (error) {
      setPageError(error.message);
      return;
    }

    if (data) {
      setSavedItems((prev) => [
        {
          id: data.id,
          type: data.type,
          videoId: data.video_id,
          playlistId: data.playlist_id,
          title: data.title,
          thumbnail: data.thumbnail,
          durationSeconds: data.duration_seconds,
          createdAt: data.created_at,
        },
        ...prev,
      ]);
    }
  };

  const handleRemoveSavedItem = async (item: SavedItem) => {
    if (!user.id || !item.id) {
      return;
    }

    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id);

    if (error) {
      setPageError(error.message);
      return;
    }

    setSavedItems((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  const handleOpenSavedVideo = async (item: SavedItem) => {
    if (!item.videoId) {
      return;
    }

    setPageError(null);
    try {
      const fallbackSeconds = item.durationSeconds || 0;
      const video = await youtubeService.getVideo(item.videoId);
      const durationSeconds = video.durationSeconds || fallbackSeconds;
      setActivePlaylist(null);
      setSelectedVideo(
        buildSavedVideoItem(
          item.videoId,
          video.title || item.title,
          video.thumbnail || item.thumbnail || '',
          durationSeconds
        )
      );
      setResumeAtSeconds(
        continueWatching?.videoId === item.videoId ? continueWatching?.lastWatchedSeconds : undefined
      );
      setIsPanelCollapsed(true);
    } catch (error) {
      const durationSeconds = item.durationSeconds || 0;
      setSelectedVideo(
        buildSavedVideoItem(
          item.videoId,
          item.title,
          item.thumbnail || '',
          durationSeconds
        )
      );
      setResumeAtSeconds(
        continueWatching?.videoId === item.videoId ? continueWatching?.lastWatchedSeconds : undefined
      );
      setIsPanelCollapsed(true);
      setPageError(error instanceof Error ? error.message : 'Failed to load video.');
    }
  };

  const handleOpenSavedPlaylist = async (playlistId: string) => {
    if (!playlistId) {
      return;
    }

    setPageError(null);
    try {
      const playlist = await youtubeService.getPlaylist(playlistId);
      setActivePlaylist(playlist);

      if (playlist.videos.length > 0) {
        setSelectedVideo(mapVideoToPlaylistItem(playlist.videos[0], playlist.id, 0));
      } else {
        setSelectedVideo(null);
      }

      setResumeAtSeconds(undefined);
      setIsPanelCollapsed(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load playlist.');
    }
  };

  const handleOpenPlaylistVideo = (video: YouTubeVideo, index: number) => {
    if (!activePlaylist) {
      return;
    }

    setSelectedVideo(mapVideoToPlaylistItem(video, activePlaylist.id, index));
    setResumeAtSeconds(undefined);
    setIsPanelCollapsed(true);
  };

  const handleResumeContinueWatching = () => {
    if (!continueWatching) {
      return;
    }

    setActivePlaylist(null);
    setSelectedVideo(
      buildSavedVideoItem(
        continueWatching.videoId,
        continueWatching.title,
        continueWatching.thumbnail,
        continueWatching.durationSeconds
      )
    );
    setResumeAtSeconds(continueWatching.lastWatchedSeconds);
    setIsPanelCollapsed(true);
  };

  const savedPlaylistItems = savedItems.filter((item) => item.type === 'playlist');
  const savedVideoItems = savedItems.filter((item) => item.type === 'video');

  const handleReset = () => {
    setSelectedVideo(null);
    setActivePlaylist(null);
    setResumeAtSeconds(undefined);
    setIsPanelCollapsed(false);
    setSearchInput('');
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0F] px-4 py-6 text-[var(--gt-text)] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {!selectedVideo && !activePlaylist && (
          <div className="mx-auto w-full max-w-3xl">
            <SearchHero
              value={searchInput}
              onChange={setSearchInput}
              onSearch={() => {
                void handleSearch();
              }}
            />
          </div>
        )}

        {pageError ? (
          <div className="mx-auto max-w-3xl rounded-lg border border-[var(--grynd-border)] bg-[#111316] px-5 py-4 text-sm text-[var(--grynd-text)]">
            {pageError}
          </div>
        ) : null}

        {selectedVideo ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-[var(--gt-muted)] hover:text-[var(--gt-soft)] transition"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
              <VideoPlayerPanel
                video={selectedVideo}
                userId={user.id}
                topicId={topicId}
                resumeAtSeconds={resumeAtSeconds}
                durations={videoDurations}
              />
            </div>
            <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
              {selectedVideo && !activePlaylist ? (
                <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gt-muted)] font-mono">Speed</p>
                  {videoDurations ? (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-[var(--gt-soft)]">
                      <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2 text-center">
                        <p className="text-[10px] uppercase text-[var(--gt-muted)] font-mono">1x</p>
                        <p className="mt-1 text-[12px] text-[var(--gt-text)] font-mono">{videoDurations.normal}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2 text-center">
                        <p className="text-[10px] uppercase text-[var(--gt-muted)] font-mono">1.25x</p>
                        <p className="mt-1 text-[12px] text-[var(--gt-text)] font-mono">{videoDurations.x125}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2 text-center">
                        <p className="text-[10px] uppercase text-[var(--gt-muted)] font-mono">1.5x</p>
                        <p className="mt-1 text-[12px] text-[var(--gt-text)] font-mono">{videoDurations.x15}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <StudyLoadPanel totalDuration={totalDurationSeconds} />
              )}
              {activeVideos.length > 0 && activePlaylist && (
                <RangeCalculator
                  totalItems={activeVideos.length}
                  items={activeVideos.map((video) => ({ durationSeconds: video.durationSeconds || 0 }))}
                  onRangeChange={() => {}}
                />
              )}
              {activePlaylist ? (
                <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] overflow-hidden">
                  <div className="px-4 py-3.5 pb-2.5 border-b border-[var(--gt-border)]">
                    <h2 className="font-medium text-[18px] text-[var(--gt-text)]">
                      {activePlaylist.title}
                    </h2>
                    <p className="mt-1 text-[12px] text-[var(--gt-muted)]">
                      {activePlaylist.totalVideos} videos • {formatSeconds(totalDurationSeconds)}
                    </p>
                  </div>
                  <div className="p-2 max-h-[520px] overflow-y-auto">
                    {activePlaylist.videos.map((video, index) => {
                      const isCurrent = selectedVideo?.videoId === video.videoId;

                      return (
                        <button
                          key={video.id}
                          type="button"
                          onClick={() => handleOpenPlaylistVideo(video, index)}
                          className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition ${
                            isCurrent
                              ? 'bg-[var(--grynd-accent-dim)] border border-[var(--grynd-accent)]'
                              : 'hover:bg-[var(--gt-panel)]'
                          }`}
                        >
                          <span className="w-4 text-center text-[11px] text-[var(--gt-muted)] flex-shrink-0">
                            {index + 1}
                          </span>
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-[72px] h-[41px] rounded object-cover flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-[12px] font-normal text-[var(--gt-soft)] leading-tight">
                              {video.title}
                            </h3>
                            <p className="mt-0.5 text-[11px] text-[var(--gt-muted)]">{video.duration}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4 text-center text-[var(--gt-muted)]">
                  <span className="text-[13px]">Select a saved playlist to load its videos.</span>
                </div>
              )}
            </div>
          </div>
        ) : hasSearched ? (
          <SearchResultGrid
            results={searchResults}
            loading={isSearching}
            savingVideoIds={savingVideoIds}
            savingPlaylistIds={savingPlaylistIds}
            savedVideoIds={savedVideoIds}
            savedPlaylistIds={savedPlaylistIds}
            onSave={handleSaveVideo}
            onSavePlaylist={handleSavePlaylist}
            saveProgress={0}
            isSavingPlaylist={false}
          />
        ) : (
          <div className="space-y-8">
            {continueWatching ? (
              <section className="space-y-3">
                <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--gt-muted)]">Continue Watching</h2>
                <div className="flex flex-col gap-4 rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4 md:flex-row md:items-center">
                  <img
                    src={continueWatching.thumbnail}
                    alt={continueWatching.title}
                    className="h-[120px] w-full rounded-lg object-cover md:h-[90px] md:w-[160px]"
                  />
                  <div className="flex-1">
                    <h3 className="text-[16px] font-medium text-[var(--gt-text)]">
                      {continueWatching.title}
                    </h3>
                    <p className="mt-2 text-[12px] text-[var(--gt-soft)]">
                      {formatSeconds(continueWatching.lastWatchedSeconds)} / {formatSeconds(continueWatching.durationSeconds)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResumeContinueWatching}
                    className="rounded-lg bg-[var(--gt-accent)] px-4 py-2 text-[12px] font-medium text-white hover:opacity-90"
                  >
                    Resume ?
                  </button>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--gt-muted)]">Saved Playlists</h2>
              {savedPlaylistItems.length === 0 ? (
                <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] px-6 py-10 text-center text-[var(--gt-muted)]">
                  <span className="text-[13px]">No saved playlists yet.</span>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {savedPlaylistItems.map((item) => (
                    <div
                      key={item.id}
                      className="min-w-[220px] rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-3"
                    >
                      <img
                        src={item.thumbnail || ''}
                        alt={item.title}
                        className="h-[120px] w-full rounded-lg object-cover"
                      />
                      <h3 className="mt-3 text-[13px] font-medium text-[var(--gt-text)] line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => void handleOpenSavedPlaylist(item.playlistId || '')}
                          className="rounded-lg bg-[var(--gt-accent)] px-3 py-1.5 text-[11px] font-medium text-white"
                        >
                          Open
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveSavedItem(item)}
                          className="text-[11px] text-[var(--gt-muted)] hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-[14px] uppercase tracking-[0.18em] text-[var(--gt-muted)]">Saved Videos</h2>
              {savedVideoItems.length === 0 ? (
                <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] px-6 py-10 text-center text-[var(--gt-muted)]">
                  <span className="text-[13px]">No saved videos yet.</span>
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {savedVideoItems.map((item) => (
                    <div
                      key={item.id}
                      className="min-w-[220px] rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-3"
                    >
                      <img
                        src={item.thumbnail || ''}
                        alt={item.title}
                        className="h-[120px] w-full rounded-lg object-cover"
                      />
                      <h3 className="mt-3 text-[13px] font-medium text-[var(--gt-text)] line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="mt-3 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => void handleOpenSavedVideo(item)}
                          className="rounded-lg bg-[var(--gt-accent)] px-3 py-1.5 text-[11px] font-medium text-white"
                        >
                          Play
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveSavedItem(item)}
                          className="text-[11px] text-[var(--gt-muted)] hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-50 w-[280px]">
        <div className="rounded-2xl border border-[var(--gt-border)] bg-[var(--gt-surface)] shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
          <button
            type="button"
            onClick={() => setIsPanelCollapsed((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gt-muted)]">Saved</p>
              <p className="mt-1 text-[13px] text-[var(--gt-text)]">
                ?? {savedItems.length} saved • {formatSeconds(savedDurationSeconds)}
              </p>
            </div>
            <span className="text-[12px] text-[var(--gt-muted)]">
              {isPanelCollapsed ? 'Expand' : 'Collapse'}
            </span>
          </button>

          {!isPanelCollapsed && (
            <div className="border-t border-[var(--gt-border)] px-4 py-3 space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gt-muted)]">Videos</p>
                {savedVideoItems.length === 0 ? (
                  <p className="mt-2 text-[12px] text-[var(--gt-soft)]">No saved videos yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {savedVideoItems.map((item) => (
                      <div
                        key={`saved-video-${item.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => void handleOpenSavedVideo(item)}
                          className="flex-1 text-left text-[12px] text-[var(--gt-text)] line-clamp-2"
                        >
                          {item.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveSavedItem(item)}
                          className="text-[11px] text-[var(--gt-muted)] hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--gt-muted)]">Playlists</p>
                {savedPlaylistItems.length === 0 ? (
                  <p className="mt-2 text-[12px] text-[var(--gt-soft)]">No saved playlists yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {savedPlaylistItems.map((item) => (
                      <div
                        key={`saved-playlist-${item.id}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-panel)] px-3 py-2"
                      >
                        <button
                          type="button"
                          onClick={() => void handleOpenSavedPlaylist(item.playlistId || '')}
                          className="flex-1 text-left text-[12px] text-[var(--gt-text)] line-clamp-2"
                        >
                          {item.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveSavedItem(item)}
                          className="text-[11px] text-[var(--gt-muted)] hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}










