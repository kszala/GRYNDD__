import { Clock3, PlayCircle } from 'lucide-react';
import type { ContinueLearningItem, GryndTubeTopicPlaylist, GryndTubeTopicPlaylistItem } from '../../types/gryndtube';

interface TopicFeedProps {
  playlist: GryndTubeTopicPlaylist | null;
  continueLearning: ContinueLearningItem | null;
  selectedVideoId?: string | null;
  onResume: (item: GryndTubeTopicPlaylistItem, resumeAtSeconds?: number) => void;
}

export function TopicFeed({ playlist, continueLearning, selectedVideoId, onResume }: TopicFeedProps) {
  if (!playlist) {
    return (
      <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4 text-center text-[var(--gt-muted)]">
        <span className="text-[13px]">No saved lectures yet.</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 pb-2.5 border-b border-[var(--gt-border)]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[18px] text-[var(--gt-text)] font-medium">
              Saved Playlist
            </h2>
            <p className="mt-1 text-[12px] text-[var(--gt-muted)]">
              {playlist.items.length} lectures - {formatSeconds(playlist.totalDurationSeconds)} total
            </p>
          </div>
        </div>
      </div>

      {/* Playlist items list */}
      <div className="p-2 max-h-[600px] overflow-y-auto">
        {playlist.items.length === 0 ? (
          <div className="rounded-lg bg-[var(--gt-panel)] px-4 py-10 text-center text-[var(--gt-muted)]">
            <span className="text-[13px]">Save lectures from search to build this topic playlist.</span>
          </div>
        ) : (
          playlist.items.map((item, index) => {
            const isCurrentlyPlaying = selectedVideoId === item.videoId;
            const isContinueItem = continueLearning?.videoId === item.videoId;
            
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onResume(item, isContinueItem ? continueLearning?.watchedSeconds : undefined)}
                className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition ${
                  isCurrentlyPlaying 
                    ? 'bg-[var(--grynd-accent-dim)] border border-[var(--grynd-accent)]' 
                    : isContinueItem
                    ? 'bg-white/5 border border-[var(--grynd-border)]'
                    : 'hover:bg-[var(--gt-panel)]'
                }`}
              >
                <div className="flex items-center gap-2 flex-1">
                  {isCurrentlyPlaying && (
                    <PlayCircle className="h-3 w-3 text-[var(--gt-accent)] flex-shrink-0" />
                  )}
                  <span className="w-4 text-center text-[11px] text-[var(--gt-muted)] flex-shrink-0">
                    {index + 1}
                  </span>
                  <img 
                    src={item.thumbnail} 
                    alt={item.title} 
                    className="w-[72px] h-[41px] rounded object-cover flex-shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-[12px] font-normal text-[var(--gt-soft)] leading-tight">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-[var(--gt-muted)]">{item.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[var(--gt-muted)]">
                  <Clock3 className="h-3 w-3" />
                  {item.duration}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper function for formatting seconds
function formatSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
