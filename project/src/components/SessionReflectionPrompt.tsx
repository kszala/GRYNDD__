import React, { useEffect, useMemo, useState } from 'react';
import { useTimerStore } from '../store/timestore';

const AWAY_THRESHOLD_MS = 30 * 60 * 1000;

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

export const SessionReflectionPrompt: React.FC = () => {
  const currentSessionId = useTimerStore((state) => state.currentSessionId);
  const isRunning = useTimerStore((state) => state.isRunning);
  const activeReflectionPrompt = useTimerStore((state) => state.activeReflectionPrompt);
  const reflectionRequired = useTimerStore((state) => state.reflectionRequired);
  const reflectionType = useTimerStore((state) => state.reflectionType);
  const reflectionStartTime = useTimerStore((state) => state.reflectionStartTime);
  const lastUserInteractionAt = useTimerStore((state) => state.lastUserInteractionAt);
  const resume = useTimerStore((state) => state.resume);
  const dismissReflectionPrompt = useTimerStore((state) => state.dismissReflectionPrompt);
  const triggerAwayReflection = useTimerStore((state) => state.triggerAwayReflection);
  const submitAwayReflection = useTimerStore((state) => state.submitAwayReflection);
  const submitReturnReflection = useTimerStore((state) => state.submitReturnReflection);

  const [value, setValue] = useState('');

  useEffect(() => {
    if (!activeReflectionPrompt && !reflectionRequired) {
      setValue('');
    }
  }, [activeReflectionPrompt, reflectionRequired]);

  useEffect(() => {
    const markActive = () => {
      useTimerStore.setState({ lastUserInteractionAt: Date.now() });
    };

    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'focus',
    ];

    events.forEach((eventName) => window.addEventListener(eventName, markActive, { passive: true }));
    document.addEventListener('visibilitychange', markActive);

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, markActive));
      document.removeEventListener('visibilitychange', markActive);
    };
  }, []);

  useEffect(() => {
    if (!currentSessionId || !isRunning || activeReflectionPrompt?.type === 'away_reflection') {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (Date.now() - lastUserInteractionAt > AWAY_THRESHOLD_MS) {
        triggerAwayReflection();
      }
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [activeReflectionPrompt, currentSessionId, isRunning, lastUserInteractionAt, triggerAwayReflection]);

  const wordCount = useMemo(() => countWords(value), [value]);

  if (!activeReflectionPrompt && !reflectionRequired) {
    return null;
  }

  const isReturnReflection = reflectionRequired;
  const isAwayPrompt = activeReflectionPrompt?.type === 'away_reflection' || isReturnReflection;
  const minWords = isReturnReflection ? 50 : (activeReflectionPrompt?.minWords ?? 0);
  const canSubmit = isAwayPrompt ? wordCount >= minWords : value.trim().length > 0;
  const awayMinutes = reflectionStartTime
    ? Math.max(1, Math.round((Date.now() - reflectionStartTime) / 60000))
    : 0;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (isReturnReflection) {
      submitReturnReflection(value);
      return;
    }

    if (isAwayPrompt) {
      submitAwayReflection(value);
      return;
    }

    resume(value.trim());
    setValue('');
  };

  const handleCancel = () => {
    if (isReturnReflection) {
      return;
    }
    setValue('');
    dismissReflectionPrompt();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="border-b border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white">
            {isAwayPrompt ? 'Session Reflection Required' : 'Why did you pause?'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isReturnReflection
              ? `You were ${reflectionType || 'away'} for ${awayMinutes} minutes. Add at least ${minWords} words before continuing.`
              : isAwayPrompt
                ? `You were inactive for more than 30 minutes. Add at least ${minWords} words before continuing.`
                : 'Add a short reason before resuming so the pause is recorded in session events.'}
          </p>
        </div>

        <div className="p-6">
          <textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={
              isAwayPrompt
                ? 'Describe what pulled you away, what changed, and how you want to restart this session.'
                : 'Example: Took a quick water break before coming back.'
            }
            className="min-h-[180px] w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
          />

          <div className="mt-3 text-sm text-gray-400">
            {isAwayPrompt ? `${wordCount}/${minWords} words` : value.trim() ? 'Reason ready to attach to the resume event.' : 'Reason is required.'}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            {!isAwayPrompt && (
              <button
                onClick={handleCancel}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-500 hover:text-white"
              >
                Stay Paused
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isAwayPrompt ? 'Submit Reflection' : 'Resume Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

