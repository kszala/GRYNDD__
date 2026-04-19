import { useEffect, useRef, useState } from 'react';
import { analyticsService } from '../services/analyticsService';
import { transitionAttention } from '../lib/attentionEngine';
import { useTimerStore } from '../store/timestore';
import type { GryndTubeTopicPlaylistItem, VideoSessionMetrics } from '../types/gryndtube';

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const HEARTBEAT_MS = 15000;
const WATCH_POLL_MS = 1000;

const loadYouTubeApi = (): Promise<typeof YT> =>
  new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load YouTube player.'));
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = () => {
      if (!window.YT) {
        reject(new Error('YouTube player API is unavailable.'));
        return;
      }

      resolve(window.YT);
    };
  });

const emptyMetrics = (totalDurationSeconds: number): VideoSessionMetrics => ({
  watchedSeconds: 0,
  pauseCount: 0,
  seekCount: 0,
  totalDurationSeconds,
});

export const useGryndTubePlayer = ({
  video,
  userId,
  topicId,
  resumeAtSeconds,
}: {
  video: GryndTubeTopicPlaylistItem | null;
  userId: string;
  topicId: string | null;
  resumeAtSeconds?: number;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YT.Player | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const watchedSecondsRef = useRef(0);
  const sessionWatchedRef = useRef(0);
  const metricsRef = useRef<VideoSessionMetrics>(emptyMetrics(video?.durationSeconds || 0));
  const currentTimeRef = useRef<number | null>(null);
  const lastHeartbeatRef = useRef(0);
  const hasResumedRef = useRef(false);
  const [metrics, setMetrics] = useState<VideoSessionMetrics>(emptyMetrics(video?.durationSeconds || 0));
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  const logPlaybackEvent = async (
    type: 'play' | 'pause' | 'seek' | 'heartbeat' | 'end',
    options?: { seekFromSeconds?: number; seekToSeconds?: number }
  ) => {
    if (!sessionIdRef.current || !video?.videoId) {
      return;
    }

    const currentTimeSeconds = Math.max(0, Math.floor(currentTimeRef.current || 0));
    await analyticsService.logPlaybackEvent(userId, {
      sessionId: sessionIdRef.current,
      type,
      videoTimeSeconds: currentTimeSeconds,
      videoId: video.videoId,
      videoTitle: video.title,
      channelName: video.channelTitle,
      topicId,
      totalDurationSeconds: video.durationSeconds,
      watchedSeconds: watchedSecondsRef.current,
      pauseCount: metricsRef.current.pauseCount,
      seekCount: metricsRef.current.seekCount,
      seekFromSeconds: options?.seekFromSeconds,
      seekToSeconds: options?.seekToSeconds,
    });
  };

  const syncContinueWatching = async () => {
    if (!userId || !video?.videoId) {
      return;
    }

    await analyticsService.upsertContinueWatching(
      userId,
      {
        videoId: video.videoId,
        title: video.title,
        thumbnail: video.thumbnail,
        durationSeconds: video.durationSeconds,
      },
      watchedSecondsRef.current
    );
  };

  const startSession = async () => {
    if (!userId || !video?.videoId || sessionIdRef.current) {
      return;
    }

    sessionWatchedRef.current = 0;
    sessionIdRef.current = await analyticsService.startPlaybackSession(userId, {
      videoId: video.videoId,
      videoTitle: video.title,
      channelName: video.channelTitle,
      totalDurationSeconds: video.durationSeconds,
      topicId,
      startTimeSeconds: Math.max(0, Math.floor(currentTimeRef.current || 0)),
    });
  };

  const endSession = async () => {
    if (!sessionIdRef.current || !video?.videoId) {
      return;
    }

    const sessionId = sessionIdRef.current;
    sessionIdRef.current = null;
    await analyticsService.endPlaybackSession(userId, {
      sessionId,
      videoTimeSeconds: Math.max(0, Math.floor(currentTimeRef.current || 0)),
      videoId: video.videoId,
      videoTitle: video.title,
      channelName: video.channelTitle,
      topicId,
      totalDurationSeconds: video.durationSeconds,
      watchedSeconds: watchedSecondsRef.current,
      pauseCount: metricsRef.current.pauseCount,
      seekCount: metricsRef.current.seekCount,
    });
    await syncContinueWatching();
  };

  useEffect(() => {
    metricsRef.current = emptyMetrics(video?.durationSeconds || 0);
    setMetrics(metricsRef.current);
    currentTimeRef.current = null;
    watchedSecondsRef.current = 0;
    sessionWatchedRef.current = 0;
    setIsReady(false);
    setIsPlaying(false);
    setPlayerError(null);
    hasResumedRef.current = false;
  }, [video?.videoId, video?.durationSeconds]);

  useEffect(() => {
    analyticsService.registerVideoOutboxHandlers();
  }, []);

  // Watch for resumeAtSeconds becoming available and seek if player is ready
  useEffect(() => {
    if (!playerRef.current || !isReady || !resumeAtSeconds || resumeAtSeconds <= 0 || hasResumedRef.current) {
      return;
    }

    // Seek to the resume position
    playerRef.current.seekTo(Math.min(resumeAtSeconds, video?.durationSeconds || resumeAtSeconds - 2), true);
    hasResumedRef.current = true;
  }, [resumeAtSeconds, isReady, video?.durationSeconds]);

  useEffect(() => {
    const recoverActiveVideoSession = async () => {
      if (!userId || !video?.videoId) {
        return;
      }

      try {
        const activeSession = await analyticsService.getActivePlaybackSession(userId, video.videoId);
        if (!activeSession) {
          return;
        }

        sessionIdRef.current = activeSession.id;
        const recoveredWatch = Math.max(0, Math.floor(activeSession.watched_seconds || 0));
        watchedSecondsRef.current = recoveredWatch;
        sessionWatchedRef.current = recoveredWatch;
        metricsRef.current = {
          watchedSeconds: recoveredWatch,
          pauseCount: Math.max(0, activeSession.pause_count || 0),
          seekCount: Math.max(0, activeSession.seek_count || 0),
          totalDurationSeconds: Math.max(1, activeSession.total_duration_seconds || video.durationSeconds),
        };
        setMetrics({ ...metricsRef.current });
      } catch (error) {
        console.error('Failed to recover video session:', error);
      }
    };

    void recoverActiveVideoSession();
  }, [userId, video?.videoId, video?.durationSeconds]);

  useEffect(() => {
    let cancelled = false;

    const mountPlayer = async () => {
      if (!containerRef.current || !video?.videoId) {
        return;
      }

      try {
        const YTApi = await loadYouTubeApi();
        if (cancelled || !containerRef.current) {
          return;
        }

        playerRef.current?.destroy();
        playerRef.current = new YTApi.Player(containerRef.current, {
          videoId: video.videoId,
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
          },
          events: {
            onReady: (event) => {
              // Attempt to resume if position is available and > 0
              if (resumeAtSeconds && resumeAtSeconds > 0 && !hasResumedRef.current) {
                event.target.seekTo(Math.min(resumeAtSeconds, video.durationSeconds - 2), true);
                hasResumedRef.current = true;
              }

              setIsReady(true);
            },
            onStateChange: async (event) => {
              if (!video || !topicId) {
                return;
              }

              if (event.data === YTApi.PlayerState.PLAYING) {
                setIsPlaying(true);

                const hadSession = Boolean(sessionIdRef.current);
                await startSession();
                void transitionAttention({
                  nextState: 'VIDEO_ENGAGED',
                  source: 'video',
                  metadata: {
                    sessionId: useTimerStore.getState().currentSessionId,
                  },
                });
                if (hadSession) {
                  await logPlaybackEvent('play');
                }

                return;
              }

              if (event.data === YTApi.PlayerState.PAUSED) {
                setIsPlaying(false);
                metricsRef.current = {
                  ...metricsRef.current,
                  pauseCount: metricsRef.current.pauseCount + 1,
                };
                setMetrics(metricsRef.current);
                void transitionAttention({
                  nextState: 'VIDEO_PASSIVE',
                  source: 'video',
                  metadata: {
                    sessionId: useTimerStore.getState().currentSessionId,
                  },
                });
                await logPlaybackEvent('pause');
                return;
              }

              if (event.data === YTApi.PlayerState.ENDED) {
                setIsPlaying(false);
                await endSession();
                void transitionAttention({
                  nextState: 'IDLE',
                  source: 'video',
                  metadata: {
                    sessionId: useTimerStore.getState().currentSessionId,
                  },
                });
                return;
              }

              if (event.data === YTApi.PlayerState.BUFFERING) {
                setIsPlaying(false);
              }
            },
            onError: () => {
              setPlayerError('This video could not be played inside GryndTube.');
            },
          },
        });
      } catch (error) {
        setPlayerError(error instanceof Error ? error.message : 'Failed to start player.');
      }
    };

    mountPlayer();

    return () => {
      cancelled = true;
      void endSession();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [resumeAtSeconds, topicId, userId, video]);

  useEffect(() => {
    const handleExit = () => {
      if (document.hidden) {
        setIsPlaying(false);
        void endSession();
      }
    };

    window.addEventListener('beforeunload', handleExit);
    document.addEventListener('visibilitychange', handleExit);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      document.removeEventListener('visibilitychange', handleExit);
    };
  }, [video?.videoId, userId]);

  useEffect(() => {
    if (!video?.videoId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (!playerRef.current || !isPlaying) {
        return;
      }

      const nextTime = playerRef.current.getCurrentTime();
      const previousTime = currentTimeRef.current;
      currentTimeRef.current = nextTime;

      if (previousTime !== null) {
        const delta = nextTime - previousTime;

        if (delta >= 0 && delta <= 2.5) {
          const nextWatched = Math.min(
            video.durationSeconds,
            watchedSecondsRef.current + delta
          );
          watchedSecondsRef.current = nextWatched;
          sessionWatchedRef.current = Math.min(
            video.durationSeconds,
            sessionWatchedRef.current + delta
          );
          metricsRef.current = {
            ...metricsRef.current,
            watchedSeconds: nextWatched,
          };
        } else if (Math.abs(delta) > 2.5) {
          const seekFromSeconds = previousTime;
          const seekToSeconds = nextTime;
          metricsRef.current = {
            ...metricsRef.current,
            seekCount: metricsRef.current.seekCount + 1,
          };
          void logPlaybackEvent('seek', {
            seekFromSeconds,
            seekToSeconds,
          });
        }

        setMetrics({ ...metricsRef.current });
      }

      const now = Date.now();
      if (now - lastHeartbeatRef.current >= HEARTBEAT_MS) {
        lastHeartbeatRef.current = now;
        void logPlaybackEvent('heartbeat');
        void syncContinueWatching();
      }
    }, WATCH_POLL_MS);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, video]);

  return {
    containerRef,
    metrics,
    isReady,
    isPlaying,
    playerError,
  };
};
