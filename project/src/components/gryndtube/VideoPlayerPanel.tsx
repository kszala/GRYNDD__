import { useGryndTubePlayer } from '../../hooks/useGryndTubePlayer';
import { formatSeconds } from '../../utils/time';
import type { GryndTubeTopicPlaylistItem } from '../../types/gryndtube';

interface VideoPlayerPanelProps {
  video: GryndTubeTopicPlaylistItem | null;
  userId: string;
  topicId: string | null;
  resumeAtSeconds?: number;
  durations?: {
    normal: string;
    x125: string;
    x15: string;
  } | null;
}

export function VideoPlayerPanel({
  video,
  userId,
  topicId,
  resumeAtSeconds,
  durations,
}: VideoPlayerPanelProps) {
  const hasValidVideo = Boolean(video?.videoId);
  const { containerRef, metrics, isReady, isPlaying, playerError } = useGryndTubePlayer({
    video: hasValidVideo ? video : null,
    userId,
    topicId,
    resumeAtSeconds,
  });

  if (!hasValidVideo) {
    return (
      <aside className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] overflow-hidden">
        <div className="flex h-[220px] items-center justify-center text-[var(--gt-muted)]">
          <span className="text-[13px]">Invalid video data</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] overflow-hidden">
      {/* Player embed area */}
      <div className="aspect-video bg-[var(--gt-input)] overflow-hidden">
        {video ? (
          <div ref={containerRef} className="h-full w-full" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--gt-muted)]">
            <span className="text-[13px]">Choose a lecture to start</span>
          </div>
        )}
      </div>

      {video && (
        <>
          {/* Meta section */}
          <div className="px-4 py-3.5 pb-2.5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gt-muted)] font-mono">Now playing</p>
            <h2 className="mt-1.5 text-[16px] leading-[1.4] text-[var(--gt-text)]">
              {video.title}
            </h2>
            <p className="mt-1 text-[12px] text-[var(--gt-muted)]">{video.channelTitle}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 px-4 pb-3">
            <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2.5">
              <p className="text-[16px] font-mono text-white">{formatSeconds(metrics.watchedSeconds)}</p>
              <p className="mt-0.5 text-[11px] text-[var(--gt-muted)]">Watched</p>
            </div>
            <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2.5">
              <p className="text-[16px] font-mono text-white">{metrics.pauseCount}</p>
              <p className="mt-0.5 text-[11px] text-[var(--gt-muted)]">Pauses</p>
            </div>
            <div className="rounded-lg bg-[var(--gt-panel)] px-3 py-2.5">
              <p className="text-[16px] font-mono text-white">{metrics.seekCount}</p>
              <p className="mt-0.5 text-[11px] text-[var(--gt-muted)]">Seeks</p>
            </div>
          </div>

          {/* Status bar */}
          <div className="mx-4 mb-3.5 flex items-center justify-between rounded-lg bg-[var(--gt-panel)] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <div
                className={`h-1.5 w-1.5 rounded-full bg-[var(--gt-accent)] ${
                  isPlaying && isReady ? 'animate-pulse' : ''
                }`}
              ></div>
              <span className="text-[12px] text-[var(--gt-soft)]">
                {isReady ? (isPlaying ? 'Tracking your lecture session' : 'Ready to resume') : 'Loading player'}
              </span>
            </div>
            <span className="text-[12px] text-[var(--gt-muted)] font-mono">
              {formatSeconds(metrics.totalDurationSeconds || video.durationSeconds)}
            </span>
          </div>

          {resumeAtSeconds ? (
            <p className="px-4 pb-3 text-[12px] text-[var(--gt-muted)]">
              Resuming from {formatSeconds(resumeAtSeconds)}
            </p>
          ) : null}
          {playerError ? <p className="px-4 pb-3 text-[12px] text-rose-300">{playerError}</p> : null}
        </>
      )}
    </aside>
  );
}
