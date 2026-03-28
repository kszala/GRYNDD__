import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Timer, Play, Pause, Square, Minimize2, Maximize2, Coffee } from 'lucide-react';
import { useTimerStore } from '../store/timestore';
import SessionCompleteModal from './SessionCompleteModal';
import { BreakPromptModal } from './BreakPromptModal';
import { NotificationBell } from './NotificationBell';

const formatPreciseTime = (totalSeconds: number, options: {
  showMilliseconds?: boolean;
  showMicroseconds?: boolean;
  showHours?: boolean;
} = {}): string => {
  const { showMilliseconds = false, showMicroseconds = false, showHours = false } = options;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  
  let timeString = '';
  
  if (showHours || hours > 0) {
    timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  if (showMilliseconds) {
    timeString += `.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  return timeString;
};

interface PersistentTimerProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export const PersistentTimer: React.FC<PersistentTimerProps> = ({
  isMinimized = false,
  onToggleMinimize
}) => {
  const {
    timeLeft,
    isRunning,
    currentSessionId,
    sessionType,
    subject,
    startTime,
    totalTime,
    breakStartTime,
    interruptedTime,
    showBreakPrompt,
    lastCompletedSession,
    preciseTimeLeft,
    updatePreciseTime,
    pause,
    requestResume,
    stop,
    complete,
    startBreakTimer,
    dismissBreakPrompt,
  } = useTimerStore();

  const [isVisible, setIsVisible] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [sessionEndedEarly, setSessionEndedEarly] = useState(false);
  
  const animationFrameRef = useRef<number>();

  const updateLoop = useCallback(() => {
    updatePreciseTime();
    animationFrameRef.current = requestAnimationFrame(updateLoop);
  }, [updatePreciseTime]);

  useEffect(() => {
    if (isRunning || breakStartTime) {
      animationFrameRef.current = requestAnimationFrame(updateLoop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, breakStartTime, updateLoop]);

  const handleStartBreak = useCallback((durationSeconds: number) => {
    startBreakTimer(durationSeconds);
  }, [startBreakTimer]);

  const handleDismissBreakPrompt = useCallback(() => {
    dismissBreakPrompt();
  }, [dismissBreakPrompt]);

  useEffect(() => {
    const shouldShow = currentSessionId !== null || preciseTimeLeft > 0 || breakStartTime !== null;
    setIsVisible(shouldShow);

    if (!shouldShow) {
      document.title = 'GRYND - Build Relentless Consistency';
    }
  }, [currentSessionId, preciseTimeLeft, breakStartTime]);

  useEffect(() => {
    if (preciseTimeLeft <= 0 && currentSessionId && !showCompleteModal) {
      setSessionEndedEarly(false);
      setShowCompleteModal(true);
    }
  }, [preciseTimeLeft, currentSessionId, showCompleteModal]);

  const progress = currentSessionId && !breakStartTime
    ? sessionType === 'focus'
      ? ((totalTime - preciseTimeLeft) / totalTime) * 100
      : ((totalTime - preciseTimeLeft) / totalTime) * 100
    : 0;

  const toggleTimer = () => {
    isRunning ? pause() : requestResume();
  };

  const handleStop = () => {
    setSessionEndedEarly(true);
    setShowCompleteModal(true);
  };

  const handleSessionComplete = (focusRating?: number, reflection?: string, tags?: string[], takeBreak?: boolean) => {
    complete(focusRating, reflection, tags, takeBreak);
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
  };

  const handleSessionIncomplete = (reason: string, details?: string) => {
    stop(reason, details, sessionEndedEarly);
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
  };

  if (!isVisible) return null;

  const displayTime = preciseTimeLeft || timeLeft;
  const formattedTime = formatPreciseTime(displayTime, { showMilliseconds: true });

  return (
    <>
      {breakStartTime && !currentSessionId ? (
        isMinimized ? (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <NotificationBell />
            <div className="bg-gradient-to-br from-orange-800/95 to-orange-900/95 backdrop-blur-sm border border-orange-600/50 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                  <Coffee className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-mono font-bold text-lg tracking-tight">
                    {formattedTime}
                  </div>
                  <div className="text-orange-300 text-xs">
                    Break Time • Precision Mode
                    {interruptedTime > 0 && (
                      <span className="block">{formatPreciseTime(interruptedTime)} interrupted</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-20 right-6 z-40 flex flex-col items-end gap-4">
            <NotificationBell />
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl min-w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Break Timer</span>
                </div>
                <button onClick={onToggleMinimize} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                  <Minimize2 size={16} />
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl font-mono font-bold text-white mb-1 tracking-tight">
                  {formattedTime}
                </div>
                <div className="text-gray-500 text-xs mt-1 bg-gray-700/30 px-2 py-1 rounded">
                  High-precision timing active
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="h-2 rounded-full transition-all duration-100 bg-green-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={toggleTimer}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-green-600 hover:bg-green-700 text-white"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} />}
                  {isRunning ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <Square size={16} />
                  Stop
                </button>
              </div>
              {isRunning && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400 text-center">
                    <div className="flex justify-between items-center">
                      <span>Elapsed:</span>
                      <span className="font-mono">{formatPreciseTime(totalTime - displayTime, { showMilliseconds: true })}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Remaining:</span>
                      <span className="font-mono">{formattedTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        isMinimized ? (
          <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <NotificationBell />
            <div className="bg-gradient-to-br from-purple-800/95 to-blue-900/95 backdrop-blur-sm border border-purple-600/50 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <Timer className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="text-white font-mono font-bold text-lg tracking-tight">
                    {formattedTime}
                  </div>
                  <div className="text-purple-300 text-xs">
                    {subject} • Focus • Precision Mode
                    {interruptedTime > 0 && (
                      <span className="block">{formatPreciseTime(interruptedTime)} interrupted</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentSessionId && (
                    <>
                      <button onClick={toggleTimer} className="p-2 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        {isRunning ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button onClick={handleStop} className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                        <Square size={16} />
                      </button>
                    </>
                  )}
                  <button onClick={onToggleMinimize} className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors">
                    <Maximize2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed top-20 right-6 z-40 flex flex-col items-end gap-4">
            <NotificationBell />
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 shadow-2xl min-w-[320px]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-purple-400" />
                  <span className="text-white font-semibold">Precision Focus</span>
                </div>
                <button onClick={onToggleMinimize} className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors">
                  <Minimize2 size={16} />
                </button>
              </div>
              <div className="text-center mb-4">
                <div className="text-3xl font-mono font-bold text-white mb-1 tracking-tight">
                  {formattedTime}
                </div>
                {subject && <div className="text-purple-400 font-medium">{subject}</div>}
                <div className="text-gray-500 text-xs mt-1 bg-gray-700/30 px-2 py-1 rounded">
                  High-precision timing active
                </div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                <div
                  className="h-2 rounded-full transition-all duration-100 bg-purple-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center justify-center gap-3">
                {currentSessionId && (
                  <>
                    <button
                      onClick={toggleTimer}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isRunning ? <Pause size={16} /> : <Play size={16} />}
                      {isRunning ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={handleStop}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      <Square size={16} />
                      Stop
                    </button>
                  </>
                )}
              </div>
              {isRunning && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-400 text-center">
                    <div className="flex justify-between items-center">
                      <span>Elapsed:</span>
                      <span className="font-mono">{formatPreciseTime(totalTime - displayTime, { showMilliseconds: true })}</span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span>Remaining:</span>
                      <span className="font-mono">{formattedTime}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      )}

      <SessionCompleteModal
        isOpen={showCompleteModal}
        onClose={(showBreakPrompt?: boolean) => {
          setShowCompleteModal(false);
          setSessionEndedEarly(false);
        }}
        onComplete={(focusRating, reflection, tags, takeBreak) => handleSessionComplete(focusRating, reflection, tags, takeBreak)}
        onIncomplete={handleSessionIncomplete}
        sessionData={{
          id: currentSessionId || `session-${Date.now()}`,
          sessionId: currentSessionId || '',
          subject: subject || 'Focus',
          startTime: startTime ? new Date(startTime) : new Date(),
          duration: totalTime - displayTime,
          completed: !sessionEndedEarly,
          type: sessionType || 'focus',
          wasEndedEarly: sessionEndedEarly,
        }}
      />

      <BreakPromptModal
        isOpen={showBreakPrompt && !!lastCompletedSession?.completed}
        onStartBreak={handleStartBreak}
        onClose={handleDismissBreakPrompt}
        sessionData={lastCompletedSession ? {
          subject: lastCompletedSession.subject,
          duration: lastCompletedSession.actualDuration || lastCompletedSession.duration,
          type: lastCompletedSession.type === 'interrupted' ? 'focus' : lastCompletedSession.type,
        } : undefined}
      />
    </>
  );
};
