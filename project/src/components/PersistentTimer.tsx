import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Coffee, Pause, Play, Square, Timer } from 'lucide-react';
import { useTimerStore } from '../store/timestore';
import SessionCompleteModal from './SessionCompleteModal';
import { NotificationBell } from './NotificationBell';

const formatPreciseTime = (totalSeconds: number): string => {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, totalSeconds) : 0;
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const milliseconds = Math.floor((safe % 1) * 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds
    .toString()
    .padStart(3, '0')}`;
};

interface PersistentTimerProps {
  isMinimized?: boolean;
}

export const PersistentTimer: React.FC<PersistentTimerProps> = ({ isMinimized = false }) => {
  const {
    timeLeft,
    isRunning,
    currentSessionId,
    currentState,
    sessionType,
    subject,
    startTime,
    totalTime,
    preciseTimeLeft,
    updatePreciseTime,
    pause,
    requestResume,
    markInterruptedRunning,
    lastEnforcementFeedback,
    complete,
    endBreak,
    stop,
  } = useTimerStore();

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEnforcementFeedback, setShowEnforcementFeedback] = useState(false);
  const animationFrameRef = useRef<number>();

  const updateLoop = useCallback(() => {
    updatePreciseTime();
    animationFrameRef.current = requestAnimationFrame(updateLoop);
  }, [updatePreciseTime]);

  useEffect(() => {
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, updateLoop]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    if (preciseTimeLeft <= 0 && sessionType === 'break') {
      endBreak('timer_end');
      return;
    }

    if (preciseTimeLeft <= 0 && sessionType !== 'break' && !showCompleteModal) {
      setShowCompleteModal(true);
    }
  }, [preciseTimeLeft, currentSessionId, sessionType, showCompleteModal, endBreak]);

  useEffect(() => {
    if (!lastEnforcementFeedback) {
      return;
    }
    setShowEnforcementFeedback(true);
    const timeout = window.setTimeout(() => setShowEnforcementFeedback(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [lastEnforcementFeedback]);

  if (!currentSessionId) {
    return null;
  }

  const isBreakMode = sessionType === 'break';
  const isInterruptedRunning = currentState === 'interrupted_running';
  const displayTime = preciseTimeLeft || timeLeft;
  const toggleTimer = () => {
    isRunning ? pause() : requestResume();
  };

  return (
    <>
      <div className={`fixed ${isMinimized ? 'bottom-6 right-6' : 'top-20 right-6'} z-40 flex flex-col items-end gap-4`}>
        <NotificationBell />
        <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-5 shadow-2xl min-w-[300px]">
          <div className="flex items-center gap-2 mb-3">
            {isBreakMode ? (
              <Coffee className="w-5 h-5 text-orange-400" />
            ) : isInterruptedRunning ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Timer className="w-5 h-5 text-purple-400" />
            )}
            <span className="text-white font-semibold">
              {isBreakMode ? 'Break Mode' : isInterruptedRunning ? 'Interrupted' : 'Focus Timer'}
            </span>
          </div>

          <div className="text-3xl font-mono font-bold text-white mb-2 tracking-tight">{formatPreciseTime(displayTime)}</div>
          {!isBreakMode && <div className="text-purple-300 text-sm mb-4">{subject || 'Focus Session'}</div>}
          {isInterruptedRunning && (
            <div className="mb-4 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-4 text-orange-100 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Interrupted</p>
                  <p className="text-xs text-orange-200">Timer is paused. Resume when you’re ready to return and log what happened.</p>
                </div>
                <button
                  onClick={requestResume}
                  className="rounded-full border border-orange-300 bg-orange-500/10 px-3 py-1 text-sm font-semibold text-orange-100 transition hover:bg-orange-500/20"
                >
                  Return
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isBreakMode ? (
              <button
                onClick={() => endBreak('manual_end')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
              >
                <Square size={16} />
                End Break
              </button>
            ) : (
              <>
                <button
                  onClick={toggleTimer}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                {isRunning && (
                  <button
                    onClick={markInterruptedRunning}
                    className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    title="Interrupted"
                  >
                    <AlertTriangle size={16} />
                  </button>
                )}
                <button
                  onClick={() => stop()}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  title="End Session"
                >
                  <Square size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showEnforcementFeedback && lastEnforcementFeedback && (
        <div className="fixed top-6 right-6 z-[120] max-w-sm rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 shadow-xl">
          {lastEnforcementFeedback}
        </div>
      )}

      <SessionCompleteModal
        isOpen={showCompleteModal && !isBreakMode}
        onClose={() => setShowCompleteModal(false)}
        onComplete={(focusRating, reflection, tags, takeBreak) => {
          complete(focusRating, reflection, tags, takeBreak);
          setShowCompleteModal(false);
        }}
        sessionData={{
          id: currentSessionId || `session-${Date.now()}`,
          sessionId: currentSessionId || '',
          subject: subject || 'Focus',
          startTime: startTime ? new Date(startTime) : new Date(),
          duration: Math.max(0, totalTime - displayTime),
          completed: true,
          type: sessionType || 'focus',
          wasEndedEarly: false,
        }}
      />
    </>
  );
};
