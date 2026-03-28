import { Loader2 } from 'lucide-react';
import type { GryndTubeSearchResult } from '../../types/gryndtube';

interface SearchResultGridProps {
  results: GryndTubeSearchResult[];
  loading: boolean;
  savingVideoIds: Set<string>;
  savingPlaylistIds: Set<string>;
  savedVideoIds: Set<string>;
  savedPlaylistIds: Set<string>;
  onSave: (video: GryndTubeSearchResult) => void;
  onSavePlaylist: (playlistId: string, title: string, thumbnail: string) => void;
  saveProgress?: number;
  isSavingPlaylist?: boolean;
}

export function SearchResultGrid({
  results,
  loading,
  savingVideoIds,
  savingPlaylistIds,
  savedVideoIds,
  savedPlaylistIds,
  onSave,
  onSavePlaylist,
  saveProgress = 0,
  isSavingPlaylist = false,
}: SearchResultGridProps) {
  if (loading) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] text-[var(--gt-muted)]">
        <Loader2 className="mr-3 h-4 w-4 animate-spin" />
        <span className="text-[13px]">Fetching study results</span>
      </div>
    );
  }

  if (isSavingPlaylist) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] text-[var(--gt-muted)]">
        <Loader2 className="mb-3 h-4 w-4 animate-spin" />
        <span className="text-[13px] mb-2">Saving playlist...</span>
        <div className="w-48 bg-[var(--gt-panel)] rounded-lg p-2">
          <div className="h-2 bg-[var(--gt-accent)] rounded-full transition-all duration-300" style={{ width: `${saveProgress}%` }}></div>
        </div>
        <span className="text-[11px] text-[var(--gt-soft)]">{saveProgress}%</span>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] px-6 py-16 text-center text-[var(--gt-muted)]">
        <span className="text-[13px]">Search for a topic to pull in focused lectures and playlists.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result) => {
        const isVideo = result.type === 'video';
        const resolvedVideoId = result.videoId || result.id || '';
        const isSaving = isVideo && savingVideoIds.has(resolvedVideoId);
        const isSaved = isVideo && savedVideoIds.has(resolvedVideoId);
        const isPlaylistSaved = !isVideo && savedPlaylistIds.has(result.playlistId || '');
        const isPlaylistSaving = !isVideo && savingPlaylistIds.has(result.playlistId || '');

        return (
          <article
            key={`${result.type}-${result.id}`}
            className="flex items-center gap-3 rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-2.5"
          >
            <div className="relative flex-shrink-0">
              <img 
                src={result.thumbnail} 
                alt={result.title} 
                className="w-[120px] h-[68px] rounded-lg object-cover" 
              />
              <span className="absolute bottom-1 right-1 rounded bg-[rgba(0,0,0,0.75)] px-1 py-0.5 text-[10px] text-white">
                {result.duration}
              </span>
              <span className="absolute top-1 right-1 rounded bg-[rgba(0,0,0,0.75)] px-1 py-0.5 text-[10px] text-white">
                {isVideo ? 'Video' : 'Playlist'}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-[13px] font-medium leading-tight text-[var(--gt-text)] line-clamp-2">
                {result.title}
              </h3>
              <p className="mt-1 text-[12px] text-[var(--gt-muted)]">{result.channelTitle}</p>
              <p className="mt-1 text-[12px] text-[var(--gt-soft)]">{result.duration}</p>
            </div>

            <div className="flex-shrink-0">
              {isVideo ? (
                <button
                  type="button"
                  disabled={isSaved || isSaving}
                  onClick={(event) => {
                    event.stopPropagation();
                    onSave(result);
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium transition ${
                    isSaved
                      ? 'border border-[var(--gt-border)] bg-transparent text-[var(--gt-muted)] cursor-default'
                      : isSaving
                      ? 'border border-[var(--gt-border)] bg-transparent text-[var(--gt-muted)] cursor-not-allowed'
                      : 'border border-[rgba(124,106,247,0.2)] bg-[rgba(124,106,247,0.12)] text-[var(--gt-accent)] hover:bg-[var(--gt-accent)] hover:text-white'
                  }`}
                >
                  {isSaving ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : null}
                  {isSaved ? 'Saved' : isSaving ? 'Saving' : 'ï¼‹ Save'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPlaylistSaved || isPlaylistSaving}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (result.playlistId) {
                      onSavePlaylist(result.playlistId, result.title, result.thumbnail);
                    }
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-[12px] font-medium border border-[rgba(124,106,247,0.2)] transition ${
                    isPlaylistSaved || isPlaylistSaving
                      ? 'bg-transparent text-[var(--gt-muted)] cursor-default'
                      : 'bg-[rgba(124,106,247,0.12)] text-[var(--gt-accent)] hover:bg-[var(--gt-accent)] hover:text-white'
                  }`}
                >
                  {isPlaylistSaved ? 'Saved' : isPlaylistSaving ? 'Saving' : `Save All (${result.videoCount || 0})`}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

