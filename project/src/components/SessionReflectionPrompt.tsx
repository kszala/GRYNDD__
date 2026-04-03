import React, { useEffect, useMemo, useState } from 'react';
import { useTimerStore } from '../store/timestore';

const QUICK_INTERRUPTION_REASONS = [
  'Quick call ambushed me',
  'Got pulled into random chat',
  'Phone scroll trap happened',
  'Attention drifted off-track',
  'Urgent side task jumped in',
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
  const minWords = pendingEnforcement?.minWords ?? (isReturnReflection ? 50 : (activeReflectionPrompt?.minWords ?? 0));
  const isShortInterruptedPrompt =
    isEnforcementPrompt &&
    isInterruptedEnforcement &&
    interruptionDurationSeconds > 0 &&
    interruptionDurationSeconds < 10 * 60;
  const isLongInterruptedPrompt =
    isEnforcementPrompt &&
    isInterruptedEnforcement &&
    interruptionDurationSeconds >= 10 * 60;
  const effectiveMinWords = isLongInterruptedPrompt ? 50 : minWords;
  const wordCount = useMemo(() => countWords(value), [value]);
  const canSubmit = isAwayPrompt ? wordCount >= effectiveMinWords : value.trim().length > 0;

  useEffect(() => {
    // Backfill persisted pending payloads that may not include duration/min words.
    if (
      pendingEnforcement &&
      pendingEnforcement.type === 'INTERRUPTED' &&
      interruptionDurationSeconds >= 10 * 60 &&
      pendingEnforcement.minWords < 50
    ) {
      useTimerStore.setState({
        pendingEnforcement: {
          ...pendingEnforcement,
          minWords: 50,
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
    if (isReturnReflection || isEnforcementPrompt) {
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
              ? 'Short interruption. Pick your excuse.'
              : isLongInterruptedPrompt
                ? 'That was a long interruption.'
              : isAwayPrompt
                ? 'Away Reason Required'
                : 'Why did you pause?'}
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            {isReturnReflection
              ? `You were ${reflectionType || 'away'} for ${awayMinutes} minutes. Add at least ${effectiveMinWords} words before continuing.`
              : isEnforcementPrompt
                ? isShortInterruptedPrompt
                  ? 'Interrupted for under 10 minutes. Pick one and we move on.'
                  : isLongInterruptedPrompt
                    ? 'Interrupted for over 10 minutes. Write 50 words before we pretend this was smooth.'
                    : isAwayEnforcement
                      ? `Away detected. Add at least ${effectiveMinWords} words to resume.`
                      : `You were marked as ${pendingEnforcement?.type === 'INTERRUPTED' ? 'interrupted' : 'away'}. Add at least ${effectiveMinWords} words to resume.`
                : isAwayPrompt
                  ? `You were inactive for more than 30 minutes. Add at least ${effectiveMinWords} words before continuing.`
                  : 'Add a short reason before resuming so the pause is recorded in session events.'}
          </p>
        </div>

        <div className="p-6">
          {isShortInterruptedPrompt ? (
            <div className="grid grid-cols-1 gap-2">
              {QUICK_INTERRUPTION_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => {
                    const requiredWords = Math.max(5, effectiveMinWords);
                    const explanation = buildQuickInterruptionExplanation(reason, requiredWords);
                    submitEnforcementExplanation(explanation, requiredWords * 300);
                  }}
                  className="rounded-xl border border-slate-600 bg-slate-700/60 px-4 py-3 text-left text-sm text-white transition-colors hover:border-slate-500 hover:bg-slate-700"
                >
                  {reason}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              value={value}
              onChange={(event) => {
                if (!typingStartedAt && event.target.value.trim().length > 0) {
                  setTypingStartedAt(Date.now());
                }
                setValue(event.target.value);
              }}
              placeholder={
                isAwayPrompt
                  ? 'Describe what pulled you away, what changed, and how you want to restart this session.'
                  : 'Example: Took a quick water break before coming back.'
              }
              className="min-h-[150px] w-full rounded-xl border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          )}

          <div className="mt-3 text-sm text-slate-300">
            {isShortInterruptedPrompt
              ? 'Tap one option to resume.'
              : isAwayPrompt
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
                {isAwayPrompt ? 'Resume' : 'Resume Session'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
