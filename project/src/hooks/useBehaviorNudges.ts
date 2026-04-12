import { useCallback, useEffect, useRef, useState } from 'react';
import { getAttentionBlocks } from '../services/attentionAnalyticsService';
import { getAvgFocusDuration } from '../services/behaviorEngine';

const COOLDOWN_MS = 12 * 60 * 1000;
const RAPID_FOCUS_TO_IDLE_SEC = 90;
const QUICK_RETURN_AWAY_SEC = 180;
const FOCUS_WARN_RATIO = 0.9;
const POLL_MS = 15_000;

type AttentionStateEvent = CustomEvent<string>;

function readStoredAttentionState(): string | null {
  try {
    return localStorage.getItem('attention-state');
  } catch {
    return null;
  }
}

export function useBehaviorNudges(userId: string | null) {
  const [nudgeMessage, setNudgeMessage] = useState<string | null>(null);
  const avgFocusSecRef = useRef<number | null>(null);
  const lastNudgeAtRef = useRef(0);
  const lastStateRef = useRef<string | null>(null);
  const focusSegmentStartRef = useRef<number | null>(null);
  const awaySegmentStartRef = useRef<number | null>(null);
  const warnedFocusThisSegmentRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tryNudge = useCallback((message: string) => {
    const now = Date.now();
    if (now - lastNudgeAtRef.current < COOLDOWN_MS) return;
    lastNudgeAtRef.current = now;
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setNudgeMessage(message);
    dismissTimerRef.current = setTimeout(() => {
      setNudgeMessage(null);
      dismissTimerRef.current = null;
    }, 10_000);
  }, []);

  useEffect(() => {
    if (!userId) {
      avgFocusSecRef.current = null;
      return;
    }

    (async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
      const blocks = await getAttentionBlocks(userId, from, to);
      avgFocusSecRef.current = getAvgFocusDuration(blocks);
    })();
  }, [userId]);

  const checkFocusThreshold = useCallback(() => {
    const avg = avgFocusSecRef.current;
    if (avg == null || avg <= 0) return;
    if (lastStateRef.current !== 'FOCUS_ACTIVE') return;
    const start = focusSegmentStartRef.current;
    if (start == null) return;
    if (warnedFocusThisSegmentRef.current) return;
    const elapsed = (Date.now() - start) / 1000;
    if (elapsed >= avg * FOCUS_WARN_RATIO) {
      warnedFocusThisSegmentRef.current = true;
      tryNudge("You're close to losing focus. Stay locked in.");
    }
  }, [tryNudge]);

  useEffect(() => {
    const onStateChange = (ev: Event) => {
      const detail = (ev as AttentionStateEvent).detail;
      const prev = lastStateRef.current;
      const now = Date.now();
      lastStateRef.current = detail;

      if (detail === 'FOCUS_ACTIVE') {
        focusSegmentStartRef.current = now;
        warnedFocusThisSegmentRef.current = false;

        if (prev === 'AWAY' && awaySegmentStartRef.current != null) {
          const awaySec = (now - awaySegmentStartRef.current) / 1000;
          if (awaySec > 0 && awaySec < QUICK_RETURN_AWAY_SEC) {
            tryNudge('Good recovery. Continue.');
          }
        }
        awaySegmentStartRef.current = null;
        return;
      }

      if (detail === 'AWAY') {
        awaySegmentStartRef.current = now;
      }

      if (detail === 'IDLE' && prev === 'FOCUS_ACTIVE' && focusSegmentStartRef.current != null) {
        const focusSec = (now - focusSegmentStartRef.current) / 1000;
        if (focusSec > 0 && focusSec < RAPID_FOCUS_TO_IDLE_SEC) {
          tryNudge("You're slipping. Get back before it compounds.");
        }
      }

      if (detail !== 'FOCUS_ACTIVE') {
        focusSegmentStartRef.current = null;
      }
    };

    lastStateRef.current = readStoredAttentionState();

    window.addEventListener('attention-state-change', onStateChange);
    const poll = window.setInterval(checkFocusThreshold, POLL_MS);

    return () => {
      window.removeEventListener('attention-state-change', onStateChange);
      window.clearInterval(poll);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [tryNudge, checkFocusThreshold]);

  const dismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    setNudgeMessage(null);
  }, []);

  return { nudgeMessage, dismissNudge: dismiss };
}
