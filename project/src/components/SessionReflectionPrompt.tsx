import React, { useEffect, useMemo, useState } from 'react';
import { useTimerStore } from '../store/timestore';

const QUICK_INTERRUPTION_REASONS = [
  'Phone call or message',
  'Somebody called',
  'House chores',
  'Someone walked in',
  'Loud noise nearby',
  'Got distracted by something',
  'Had to check something quickly',
];

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

const buildQuickInterruptionExplanation = (reason: string, minWords: number): string => {
  const base = `I got interrupted because ${reason.toLowerCase()}. I handled it quickly, returned immediately, and I will continue focused work with better attention and stronger discipline right now.`;
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= minWords) {
    return base;
  }
  const filler = 'I reviewed my context, reset priorities, and resumed productive study without delay.';
  return `${base} ${filler}`;
};

export const SessionReflectionPrompt: React.FC = () => {
  const activeReflectionPrompt = useTimerStore((state) => state.activeReflectionPrompt);
  const reflectionRequired = useTimerStore((state) => state.reflectionRequired);
  const reflectionType = useTimerStore((state) => state.reflectionType);
  const reflectionStartTime = useTimerStore((state) => state.reflectionStartTime);
  const pendingEnforcement = useTimerStore((state) => state.pendingEnforcement);
  const dailyEnforcementStats = useTimerStore((state) => state.dailyEnforcementStats);
  const lastEnforcementError = useTimerStore((state) => state.lastEnforcementError);
  const resume = useTimerStore((state) => state.resume);
  const dismissReflectionPrompt = useTimerStore((state) => state.dismissReflectionPrompt);
  const submitAwayReflection = useTimerStore((state) => state.submitAwayReflection);
  const submitReturnReflection = useTimerStore((state) => state.submitReturnReflection);
  const submitEnforcementExplanation = useTimerStore((state) => state.submitEnforcementExplanation);

  const [value, setValue] = useState('');
  const [typingStartedAt, setTypingStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!activeReflectionPrompt && !reflectionRequired) {
      setValue('');
      setTypingStartedAt(null);
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

  const isReturnReflection = reflectionRequired;
  const isEnforcementPrompt = Boolean(pendingEnforcement) || activeReflectionPrompt?.type === 'enforcement_reason';
  const isInterruptedEnforcement = pendingEnforcement?.type === 'INTERRUPTED';
  const isAwayEnforcement = pendingEnforcement?.type === 'AWAY';
  const interruptionDurationSeconds = isInterruptedEnforcement
    ? Math.max(
        0,
        pendingEnforcement?.durationSeconds ??
          (pendingEnforcement?.startedAt ? Math.floor((Date.now() - pendingEnforcement.startedAt) / 1000) : 0)
      )
    : 0;
  const isAwayPrompt = activeReflectionPrompt?.type === 'away_reflection' || isReturnReflection || isEnforcementPrompt;
  const isPostSessionAwayPrompt = activeReflectionPrompt?.type === 'post_session_away_reflection';
  const minWords = pendingEnforcement?.minWords ?? (isReturnReflection ? 50 : (activeReflectionPrompt?.minWords ?? 0));
  const isShortInterruptedPrompt =
    isEnforcementPrompt &&
    isInterruptedEnforcement &&
    interruptionDurationSeconds > 0 &&
    interruptionDurationSeconds < 5 * 60; // Updated threshold
  const isLongInterruptedPrompt =
    isEnforcementPrompt &&
    isInterruptedEnforcement &&
    interruptionDurationSeconds >= 5 * 60; // Updated threshold
  const effectiveMinWords = isLongInterruptedPrompt || isPostSessionAwayPrompt ? 25 : minWords; // Updated word count
  const wordCount = useMemo(() => countWords(value), [value]);
  const canSubmit = (isAwayPrompt || isPostSessionAwayPrompt) ? wordCount >= effectiveMinWords : value.trim().length > 0;

  useEffect(() => {
    // Backfill persisted pending payloads that may not include duration/min words.
    if (
      pendingEnforcement &&
      pendingEnforcement.type === 'INTERRUPTED' &&
      interruptionDurationSeconds >= 5 * 60 &&
      pendingEnforcement.minWords < 25
    ) {
      useTimerStore.setState({
        pendingEnforcement: {
          ...pendingEnforcement,
          minWords: 25,
          durationSeconds: interruptionDurationSeconds,
        },
      });
    }
  }, [pendingEnforcement, interruptionDurationSeconds]);

  if (!activeReflectionPrompt && !reflectionRequired) {
    return null;
  }
  const awayMinutes = reflectionStartTime
    ? Math.max(1, Math.round((Date.now() - reflectionStartTime) / 60000))
    : 0;
  const lostMinutesToday = Math.round(dailyEnforcementStats.totalLostSeconds / 60);

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    if (isPostSessionAwayPrompt) {
      // For post-session away, just dismiss the prompt and reset state
      useTimerStore.setState({
        activeReflectionPrompt: null,
        reflectionRequired: false,
        reflectionType: null,
        reflectionStartTime: null,
        lastUserInteractionAt: Date.now(),
      });
      setValue('');
      return;
    }

    if (isReturnReflection) {
      submitReturnReflection(value);
      return;
    }

    if (isEnforcementPrompt) {
      const typingTimeMs = typingStartedAt ? Date.now() - typingStartedAt : 0;
      submitEnforcementExplanation(value, typingTimeMs);
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
    if (isReturnReflection || isEnforcementPrompt || isPostSessionAwayPrompt) {
      return;
    }
    setValue('');
    dismissReflectionPrompt();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        <div className="border-b border-slate-700 p-6">
          <h2 className="text-xl font-semibold text-white">
            {isShortInterruptedPrompt
              ? 'What interrupted you?'
              : isLongInterruptedPrompt
                ? 'What interrupted you?'
              : activeReflectionPrompt?.type === 'away_reflection'
                ? 'Away Reason Required'
              : isPostSessionAwayPrompt
                ? 'Post-Session Reflection'
              : isAwayPrompt
                ? 'Away Reason Required'
                : 'Why did you pause?'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {isPostSessionAwayPrompt
              ? `You were away for ${awayMinutes} minutes after completing your session. What were you doing? Add at least ${effectiveMinWords} words.`
              : isReturnReflection
                ? `You were ${reflectionType || 'away'} for ${awayMinutes} minutes. Add at least ${effectiveMinWords} words before continuing.`
              : isEnforcementPrompt
                ? isInterruptedEnforcement
                  ? isShortInterruptedPrompt
                    ? 'What interrupted your focus? Pick one or write your own reason.'
                    : `Interrupted for ${Math.round(interruptionDurationSeconds / 60)} minutes. What happened?`
                  : isAwayEnforcement
                    ? `Away detected for ${Math.round((pendingEnforcement?.durationSeconds || 0) / 60)} minutes. Why were you away?`
                    : `You were marked as ${pendingEnforcement?.type === 'INTERRUPTED' ? 'interrupted' : 'away'}. Add at least ${effectiveMinWords} words to resume.`
                : activeReflectionPrompt?.type === 'away_reflection'
                  ? `You were away for ${Math.round((pendingEnforcement?.durationSeconds || awayMinutes * 60) / 60)} minutes. What pulled you away?`
                  : isAwayPrompt
                    ? `You were inactive for more than 30 minutes. Add at least ${effectiveMinWords} words before continuing.`
                    : 'Add a short reason before resuming so the pause is recorded in session events.'}
          </p>
          {isInterruptedEnforcement && (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="font-semibold text-amber-200">Recorded interruption time</div>
              <div className="mt-1 text-slate-300">
                {interruptionDurationSeconds < 60
                  ? `${interruptionDurationSeconds} second${interruptionDurationSeconds === 1 ? '' : 's'}`
                  : `${Math.round(interruptionDurationSeconds / 60)} minute${Math.round(interruptionDurationSeconds / 60) === 1 ? '' : 's'}`}
                {' '}of lost focus while you were away.
              </div>
            </div>
          )}

          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (!typingStartedAt) setTypingStartedAt(Date.now());
            }}
            rows={5}
            className="min-h-[150px] w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            placeholder="Write a short reason for the interruption or return."
          />

          <div className="mt-3 text-sm text-slate-300">
            {isShortInterruptedPrompt
              ? 'Tap one option to resume.'
              : (isAwayPrompt || isPostSessionAwayPrompt)
                ? `${wordCount}/${effectiveMinWords} words`
                : value.trim()
                  ? 'Reason ready to attach to the resume event.'
                  : 'Reason is required.'}
          </div>
          {isEnforcementPrompt && (
            <div className="mt-2 text-xs text-slate-400">
              {`Lost today: ${lostMinutesToday}m due to interruptions.`}
            </div>
          )}

          {(activeReflectionPrompt?.validationError || lastEnforcementError) && (
            <div className="mt-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {activeReflectionPrompt?.validationError || lastEnforcementError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            {!isAwayPrompt && (
              <button
                onClick={handleCancel}
                className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700"
              >
                Stay Paused
              </button>
            )}
            {!isShortInterruptedPrompt && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPostSessionAwayPrompt ? 'Continue' : isAwayPrompt ? 'Resume' : 'Resume Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
