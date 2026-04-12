import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SessionStartOverlay } from './SessionStartOverlay';
import { useTimerStore, TimerSession } from '../store/timestore';
import {
  activateGryndMode,
  deactivateGryndMode,
  isGryndModeAvailable
} from '../utils/gryndmode-bridge';

interface LastSessionSnapshot {
  duration: number;
  completed: boolean;
}

const formatTime = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const isSameDay = (date: Date, compareDate: Date): boolean =>
  date.getFullYear() === compareDate.getFullYear() &&
  date.getMonth() === compareDate.getMonth() &&
  date.getDate() === compareDate.getDate();

const getPomodoroMeta = (
  sessions: TimerSession[],
  sessionType: 'focus' | 'break' | 'interrupted',
  hasActiveSession: boolean
) => {
  const today = new Date();
  const completedToday = sessions.filter((session) => {
    if (session.type !== 'focus' || !session.completed) {
      return false;
    }

    const sessionDate = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
    return isSameDay(sessionDate, today);
  }).length;

  const completedInCycle = completedToday % 4;
  const currentIndex = hasActiveSession && sessionType === 'focus'
    ? Math.min(completedInCycle + 1, 4)
    : Math.max(completedInCycle, 1);

  return {
    completedInCycle,
    currentIndex
  };
};

export const Timer: React.FC = () => {
  const startSession = useTimerStore((state) => state.startSession);
  const pause = useTimerStore((state) => state.pause);
  const requestResume = useTimerStore((state) => state.requestResume);
  const stop = useTimerStore((state) => state.stop);
  const markInterruptedRunning = useTimerStore((state) => state.markInterruptedRunning);
  const startBreakTimer = useTimerStore((state) => state.startBreakTimer);
  const sessions = useTimerStore((state) => state.sessions);
  const timeLeft = useTimerStore((state) => state.timeLeft);
  const preciseTimeLeft = useTimerStore((state) => state.preciseTimeLeft);
  const currentSessionId = useTimerStore((state) => state.currentSessionId);
  const isRunning = useTimerStore((state) => state.isRunning);
  const subject = useTimerStore((state) => state.subject);
  const sessionId = useTimerStore((state) => state.currentSessionId);
  const totalTime = useTimerStore((state) => state.totalTime);
  const sessionType = useTimerStore((state) => state.sessionType);

  const [subjectInput, setSubjectInput] = useState('Deep Work');
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [gryndModeActive, setGryndModeActive] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(false);
  const [lastSessionForSubject, setLastSessionForSubject] = useState<LastSessionSnapshot | null>(null);
  const previousSessionIdRef = useRef<string | null>(null);

  const safeTimeLeft = useMemo(() => {
    if (typeof preciseTimeLeft === 'number' && preciseTimeLeft > 0) {
      return Math.floor(preciseTimeLeft);
    }

    return Math.max(0, timeLeft);
  }, [preciseTimeLeft, timeLeft]);

  const activeSubject = subject || subjectInput.trim() || 'Focus Session';
  const hasActiveSession = Boolean(currentSessionId);
  const { completedInCycle, currentIndex } = useMemo(
    () => getPomodoroMeta(sessions, sessionType, hasActiveSession),
    [sessions, sessionType, hasActiveSession]
  );

  useEffect(() => {
    // Only activate for focus sessions - never for breaks
    if (isRunning && sessionId && sessionType === 'focus') {
      const durationMinutes = Math.ceil(totalTime / 60);
      activateGryndMode(subject, sessionId, durationMinutes);
      setGryndModeActive(true);
    } else {
      deactivateGryndMode();
      setGryndModeActive(false);
    }
  }, [isRunning, sessionId, sessionType]);

  useEffect(() => {
    const previousSessionId = previousSessionIdRef.current;

    if (isRunning && sessionId && sessionType === 'focus' && sessionId !== previousSessionId) {
      const previousSubjectSession = sessions.find((session) =>
        session.sessionId !== sessionId &&
        session.type === 'focus' &&
        session.subject === subject &&
        Boolean(session.endTime)
      );

      setLastSessionForSubject(previousSubjectSession ? {
        duration: previousSubjectSession.actualDuration ?? previousSubjectSession.duration,
        completed: previousSubjectSession.completed
      } : null);
      setShowStartOverlay(true);
    }

    if (!sessionId) {
      setShowStartOverlay(false);
    }

    previousSessionIdRef.current = sessionId;
  }, [isRunning, sessionId, sessionType, sessions, subject]);

  const handleStartFocusSession = () => {
    const nextSubject = subjectInput.trim();
    if (!nextSubject) {
      return;
    }

    startSession(nextSubject, durationMinutes * 60, 'focus');
  };

  const handlePrimaryControl = () => {
    if (sessionType === 'break') {
      stop('skip_break', 'Break skipped from focus page', true);
      return;
    }

    if (!hasActiveSession) {
      handleStartFocusSession();
      return;
    }

    if (isRunning) {
      pause();
      return;
    }

    requestResume();
  };

  const handleStop = () => {
    if (sessionType === 'break') {
      stop('skip_break', 'Break skipped from focus page', true);
      return;
    }

    stop();
  };

  const subjectLabel = sessionType === 'break' ? 'Break Time' : activeSubject;
  const controlsLabel = sessionType === 'break'
    ? 'Skip Break'
    : hasActiveSession
      ? (isRunning ? 'Pause' : 'Resume')
      : 'Start Focus';

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {showStartOverlay && sessionType === 'focus' && (
        <SessionStartOverlay
          subject={activeSubject}
          lastSession={lastSessionForSubject}
          onComplete={() => setShowStartOverlay(false)}
        />
      )}

      <div className="w-full">
        <div className="flex flex-col items-center text-center">
          {!hasActiveSession && (
            <div className="w-full max-w-md mb-8 flex flex-col gap-3">
              <input
                value={subjectInput}
                onChange={(event) => setSubjectInput(event.target.value)}
                placeholder="What are you sitting down to do?"
                className="w-full bg-[var(--grynd-surface-2)] border border-[var(--grynd-border)] rounded-lg px-4 py-3 text-[14px] text-[var(--grynd-text)] outline-none"
                style={{ fontFamily: 'DM Sans, sans-serif' }}
              />

              <div className="flex justify-center gap-2 flex-wrap">
                {[25, 45, 60, 90].map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => setDurationMinutes(minutes)}
                    className={`border rounded-full px-4 py-2 text-[11px] uppercase tracking-[0.12em] font-mono transition-colors ${
                      durationMinutes === minutes
                        ? 'border-[var(--grynd-accent)] text-[var(--grynd-accent)] bg-[var(--grynd-accent-dim)]'
                        : 'border-[var(--grynd-border)] text-[var(--grynd-muted)] hover:text-[var(--grynd-text)]'
                    }`}
                  >
                    {minutes}m
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--grynd-muted)]">
            {subjectLabel}
          </div>

          <div className="mt-3 text-[36px] font-mono tracking-tight text-[var(--grynd-text)]">
            {formatTime(hasActiveSession ? safeTimeLeft : durationMinutes * 60)}
          </div>

          <div className="mt-6">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--grynd-muted)] mb-3">
              {`Pomodoro ${currentIndex} of 4`}
            </div>

            <div className="flex justify-center gap-2">
              {Array.from({ length: 4 }).map((_, index) => {
                const isCompleted = index < completedInCycle;
                const isCurrent = hasActiveSession && sessionType === 'focus' && index === currentIndex - 1;

                return (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full ${
                      isCompleted || isCurrent ? 'bg-[var(--grynd-accent)]' : 'border border-[var(--grynd-border)]'
                    }`}
                    style={{ animation: isCurrent ? 'pulse 3s ease-in-out infinite' : 'none' }}
                  />
                );
              })}
            </div>
          </div>

          {gryndModeActive && isGryndModeAvailable() && (
            <div className="mt-6 rounded-lg border border-[var(--grynd-border)] bg-[var(--grynd-surface-2)] px-4 py-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--grynd-muted)]">
                Restricted Mode Active - Non-study content blocked
              </span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={handlePrimaryControl}
              disabled={!hasActiveSession && !subjectInput.trim()}
              className="border border-[var(--grynd-border)] rounded-lg px-5 py-2 text-[12px] uppercase tracking-[0.12em] font-mono transition-colors"
              style={{
                color: !hasActiveSession && !subjectInput.trim() ? 'var(--grynd-muted)' : 'var(--grynd-text)',
                background: !hasActiveSession && !subjectInput.trim() ? 'transparent' : 'var(--grynd-surface-2)'
              }}
            >
              {controlsLabel}
            </button>

            {(hasActiveSession || sessionType === 'break') && sessionType !== 'break' && (
              <button
                onClick={handleStop}
                className="text-[11px] uppercase tracking-[0.12em] font-mono text-[var(--grynd-muted)] hover:text-[var(--grynd-text)]"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
