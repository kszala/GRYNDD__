import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PrecisionTimer, formatPreciseTime, PreciseSessionData, createPreciseSessionData } from '../utils/precisionTiming';
import supabase from '../supabaseClient';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { calculateFocusScore } from '../services/focusScore';
import { computeIdealVsActual } from '../services/idealVsActual';
import { logEvent } from '../utils/logEvent';
import { addToQueue, registerOutboxHandler, startQueueProcessor } from '../utils/outboxQueue';
import { validateExplanation } from '../utils/validateExplanation';

export interface TimerSession {
  id: string;
  sessionId: string;
  subject: string;
  subjectId?: string;
  topicId?: string;
  type: 'focus' | 'break' | 'interrupted';
  startTime: Date;
  endTime?: Date;
  duration: number;
  actualDuration?: number;
  activeFocusSeconds?: number;
  completed: boolean;
  focusRating?: number;
  reflection?: string;
  tags?: string[];
  stopReason?: string;
  stopReasonDetails?: string;
  wasEndedEarly?: boolean;
  precisionData?: PreciseSessionData;
  syllabusId?: string | null;
  // Enhanced analytics fields
  pauseCount?: number;
  totalPauseDuration?: number;
  interruptionCount?: number;
  productivityScore?: number;
  moodBefore?: number;
  moodAfter?: number;
  energyLevel?: number;
  deviceType?: string;
  browserInfo?: any;
}

type TimerEventType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'RESUME'
  | 'interrupt'
  | 'INTERRUPTED'
  | 'RETURN'
  | 'AWAY'
  | 'BREAK_END'
  | 'abandon'
  | 'complete'
  | 'away_detected'
  | 'idle_detected'
  | 'reflection_start'
  | 'reflection_submitted';

type EventCategory = 'session' | 'reflection' | 'system';
type SessionPhase = 'active' | 'inactive' | 'reflection' | 'system' | 'completed';

type TimerEvent = {
  type: TimerEventType;
  timestamp: number;
};

type QueueSessionPayload = Omit<TimerSession, 'startTime' | 'endTime'> & {
  startTime: string;
  endTime?: string;
};

type SaveSessionOutboxPayload = {
  session: QueueSessionPayload;
  events: TimerEvent[];
};

type LogSessionEventOutboxPayload = {
  sessionId: string;
  eventType: string;
  eventCategory: string;
  sessionPhase: string;
  metadata: Record<string, unknown>;
};

type SessionState =
  | 'idle'
  | 'focus'
  | 'paused'
  | 'interrupted'
  | 'away'
  | 'away_running'
  | 'interrupted_running'
  | 'away_pending_explanation'
  | 'interrupted_pending_reason';

type EnforcementType = 'AWAY' | 'INTERRUPTED';
type ReflectionPromptType = 'resume_reason' | 'away_reflection' | 'enforcement_reason';

interface PendingEnforcementState {
  type: EnforcementType;
  minWords: number;
  startedAt: number;
  durationSeconds?: number;
}

interface DailyEnforcementStats {
  dateKey: string;
  totalEnforcements: number;
  quickBreakUses: number;
  totalLostSeconds: number;
}

interface ReflectionPromptState {
  type: ReflectionPromptType;
  minWords?: number;
  triggeredAt: number;
  source?: EnforcementType;
  validationError?: string | null;
}

interface TimerState {
  currentSessionId: string | null;
  timeLeft: number;
  totalTime: number;
  isRunning: boolean;
  sessionType: 'focus' | 'break' | 'interrupted';
  subject: string;
  subjectId: string | null;
  topicId: string | null;
  syllabusId: string | null;
  startTime: string | null;
  precisionTimer: PrecisionTimer | null;
  preciseTimeLeft: number;
  lastPrecisionUpdate: number;
  sessions: TimerSession[];
  lastCompletedSession: TimerSession | null;
  breakStartTime: number | null;
  showBreakPrompt: boolean;
  interruptedTime: number;
  sessionStartTime: number | null;
  isInterruptedMode: boolean;
  elapsedOffsetSeconds: number;
  sessionOwnerTabId: string | null;
  isSessionLeader: boolean;
  
  // Enhanced analytics tracking
  pauseStartTime: number | null;
  totalPauseTime: number;
  pauseCount: number;
  interruptionCount: number;
  lastActiveTime: number;
  activeFocusTime: number;
  
  // Session events tracking
  sessionEvents: TimerEvent[];
  resumeReasonRequired: boolean;
  activeReflectionPrompt: ReflectionPromptState | null;
  awayReflectionRequired: boolean;
  lastUserInteractionAt: number;
  currentState: SessionState;
  lastEventTime: number | null;
  reflectionRequired: boolean;
  reflectionType: 'away' | 'idle' | null;
  reflectionStartTime: number | null;
  pendingEnforcement: PendingEnforcementState | null;
  lastAwayOrInterruptionAt: number | null;
  lastEnforcementError: string | null;
  interruptionStartTime: number | null;
  dailyEnforcementStats: DailyEnforcementStats;
  lastEnforcementFeedback: string | null;
  
  // Actions
  startSession: (subject: string, duration?: number, sessionType?: 'focus' | 'break' | 'interrupted', subjectId?: string, topicId?: string) => void;
  pause: (reason?: string, requireResumeReason?: boolean, targetState?: SessionState) => void;
  resume: (reason?: string) => void;
  requestResume: () => void;
  dismissReflectionPrompt: () => void;
  triggerAwayReflection: () => void;
  submitAwayReflection: (reflection: string) => void;
  submitReturnReflection: (reflection: string) => void;
  markAwayRunning: () => void;
  markInterruptedRunning: () => void;
  handleReturnFromAwayOrInterruption: (trigger: 'visibility' | 'activity' | 'tab_return' | 'interrupt_return') => void;
  submitEnforcementExplanation: (reflection: string, typingTimeMs?: number) => boolean;
  useQuickBreakShortcut: () => boolean;
  restorePendingEnforcement: () => void;
  stop: (reason?: string, details?: string, wasEndedEarly?: boolean) => void;
  complete: (focusRating?: number, reflection?: string, tags?: string[], takeBreak?: boolean) => void;
  endBreak: (reason?: 'manual_end' | 'timer_end') => void;
  startBreakTimer: (durationSeconds: number) => void;
  dismissBreakPrompt: () => void;
  updatePreciseTime: () => void;
  initializeFromStorage: () => void;
  startInterruptedTimer: () => void;
  recordInterruption: () => void;
  updateActiveFocusTime: () => void;
  recoverActiveSession: () => void;
  
  // Analytics methods
  saveSessionToDatabase: (session: TimerSession, events?: TimerEvent[]) => Promise<void>;
  updateFocusPatterns: (session: TimerSession) => Promise<void>;
  generateBehavioralInsights: () => Promise<void>;
  transitionState: (newState: SessionState, metadata?: Record<string, unknown>) => TimerEvent | null;
  recoverUnfinishedSessionFromDatabase: () => Promise<void>;
}

// Safe localStorage wrapper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.warn('localStorage access failed:', error);
    }
    return null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn('localStorage write failed:', error);
    }
  }
};

// Safe document title setter
const setSafeTitle = (title: string): void => {
  try {
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  } catch (error) {
    console.warn('Document title setting failed:', error);
  }
};

// Safe initialization helper
const initializeSafeDefaults = () => ({
  currentSessionId: null,
  timeLeft: 0,
  totalTime: 0,
  preciseTimeLeft: 0,
  isRunning: false,
  sessionType: 'focus' as const,
  subject: '',
  subjectId: null,
  topicId: null,
  syllabusId: null,
  startTime: null,
  precisionTimer: null,
  lastPrecisionUpdate: 0,
  sessions: [] as TimerSession[],
  lastCompletedSession: null,
  breakStartTime: null,
  showBreakPrompt: false,
  interruptedTime: 0,
  sessionStartTime: null,
  isInterruptedMode: false,
  elapsedOffsetSeconds: 0,
  sessionOwnerTabId: null,
  isSessionLeader: true,
  // Enhanced analytics defaults
  pauseStartTime: null,
  totalPauseTime: 0,
  pauseCount: 0,
  interruptionCount: 0,
  lastActiveTime: 0,
  activeFocusTime: 0,
  // Session events tracking defaults
  sessionEvents: [] as TimerEvent[],
  resumeReasonRequired: false,
  activeReflectionPrompt: null,
  awayReflectionRequired: false,
  lastUserInteractionAt: Date.now(),
  currentState: 'idle' as SessionState,
  lastEventTime: null,
  reflectionRequired: false,
  reflectionType: null,
  reflectionStartTime: null,
  pendingEnforcement: null,
  lastAwayOrInterruptionAt: null,
  lastEnforcementError: null,
  interruptionStartTime: null,
  dailyEnforcementStats: createDailyEnforcementStats(),
  lastEnforcementFeedback: null,
});

// Helper function to save sessions
const saveSessionsToStorage = (sessions: TimerSession[]) => {
  try {
    safeLocalStorage.setItem('grynd-timer-sessions', JSON.stringify(sessions));
    console.log('✅ Sessions saved to storage:', sessions.length);
  } catch (error) {
    console.error('❌ Failed to save sessions to storage:', error);
  }
};

const ACTIVE_SESSION_SYNC_KEY = 'grynd-active-session-sync';
const ACTIVE_SESSION_EVENT_KEY = 'grynd-active-session-event';
const CROSS_TAB_SNAPSHOT_TTL_MS = 15000;
const tabId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? crypto.randomUUID()
  : `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`;
let syncChannel: BroadcastChannel | null = null;

type CrossTabSessionSnapshot = {
  ownerTabId: string;
  sessionId: string;
  subject: string;
  subjectId: string | null;
  topicId: string | null;
  syllabusId: string | null;
  sessionType: 'focus' | 'break' | 'interrupted';
  duration: number;
  currentSessionElapsedSeconds: number;
  interruptedTime: number;
  isInterruptedMode: boolean;
  isRunning: boolean;
  pauseCount: number;
  totalPauseTime: number;
  interruptionCount: number;
  activeFocusTime: number;
  startedAt: number | null;
  updatedAt: number;
};

type CrossTabSyncEvent =
  | { type: 'SYNC_ACTIVE_SESSION'; snapshot: CrossTabSessionSnapshot; sourceTabId: string }
  | { type: 'CLEAR_ACTIVE_SESSION'; sessionId: string | null; sourceTabId: string };

const getSyncChannel = (): BroadcastChannel | null => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }

  if (!syncChannel) {
    syncChannel = new BroadcastChannel('grynd-timer-sync');
  }

  return syncChannel;
};

const readActiveSessionSnapshot = (): CrossTabSessionSnapshot | null => {
  try {
    const raw = safeLocalStorage.getItem(ACTIVE_SESSION_SYNC_KEY);
    return raw ? JSON.parse(raw) as CrossTabSessionSnapshot : null;
  } catch (error) {
    console.warn('Failed to read active session snapshot:', error);
    return null;
  }
};

const writeActiveSessionSnapshot = (snapshot: CrossTabSessionSnapshot | null) => {
  try {
    if (!snapshot) {
      localStorage.removeItem(ACTIVE_SESSION_SYNC_KEY);
      return;
    }

    safeLocalStorage.setItem(ACTIVE_SESSION_SYNC_KEY, JSON.stringify(snapshot));
  } catch (error) {
    console.warn('Failed to write active session snapshot:', error);
  }
};

const emitCrossTabEvent = (event: CrossTabSyncEvent) => {
  try {
    getSyncChannel()?.postMessage(event);
    safeLocalStorage.setItem(
      ACTIVE_SESSION_EVENT_KEY,
      JSON.stringify({ ...event, emittedAt: Date.now() })
    );
  } catch (error) {
    console.warn('Failed to emit cross-tab event:', error);
  }
};

const hasLiveExternalSession = (): CrossTabSessionSnapshot | null => {
  const snapshot = readActiveSessionSnapshot();
  if (!snapshot || snapshot.ownerTabId === tabId) {
    return null;
  }

  return Date.now() - snapshot.updatedAt <= CROSS_TAB_SNAPSHOT_TTL_MS ? snapshot : null;
};

// Get device and browser info for analytics
const getDeviceInfo = () => {
  try {
    return {
      deviceType: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      browserInfo: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };
  } catch (error) {
    console.error('Failed to get device info:', error);
    return {
      deviceType: 'unknown',
      browserInfo: {}
    };
  }
};

const computeBasicSessionMetrics = (events: TimerEvent[]) => {
  if (!Array.isArray(events) || events.length === 0) {
    return { focusSeconds: 0, pauseSeconds: 0, pauseCount: 0 };
  }

  const sorted = [...events].sort((left, right) => left.timestamp - right.timestamp);
  let focusMs = 0;
  let pauseMs = 0;
  let activeStart: number | null = null;
  let pauseStart: number | null = null;

  for (const event of sorted) {
    if (event.type === 'start' || event.type === 'resume' || event.type === 'RESUME' || event.type === 'RETURN') {
      if (pauseStart !== null) {
        pauseMs += Math.max(0, event.timestamp - pauseStart);
        pauseStart = null;
      }
      if (activeStart === null) {
        activeStart = event.timestamp;
      }
      continue;
    }

    if (
      event.type === 'pause' ||
      event.type === 'away_detected' ||
      event.type === 'idle_detected' ||
      event.type === 'reflection_start' ||
      event.type === 'AWAY' ||
      event.type === 'INTERRUPTED'
    ) {
      if (activeStart !== null) {
        focusMs += Math.max(0, event.timestamp - activeStart);
        activeStart = null;
      }
      if (pauseStart === null) {
        pauseStart = event.timestamp;
      }
      continue;
    }

    if (event.type === 'complete' || event.type === 'abandon' || event.type === 'interrupt') {
      if (activeStart !== null) {
        focusMs += Math.max(0, event.timestamp - activeStart);
        activeStart = null;
      }
      if (pauseStart !== null) {
        pauseMs += Math.max(0, event.timestamp - pauseStart);
        pauseStart = null;
      }
    }
  }

  return {
    focusSeconds: Math.max(0, Math.round(focusMs / 1000)),
    pauseSeconds: Math.max(0, Math.round(pauseMs / 1000)),
    pauseCount: sorted.filter((event) => event.type === 'pause').length,
  };
};

const serializeSessionForQueue = (session: TimerSession): QueueSessionPayload => ({
  ...session,
  startTime: session.startTime instanceof Date ? session.startTime.toISOString() : new Date(session.startTime).toISOString(),
  endTime: session.endTime
    ? session.endTime instanceof Date
      ? session.endTime.toISOString()
      : new Date(session.endTime).toISOString()
    : undefined,
});

const hydrateSessionFromQueue = (payload: QueueSessionPayload): TimerSession => ({
  ...payload,
  startTime: new Date(payload.startTime),
  endTime: payload.endTime ? new Date(payload.endTime) : undefined,
});

const getHeartbeatElapsedFromMetadata = (metadata: unknown): number | null => {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const elapsed = (metadata as { elapsed?: unknown }).elapsed;
  if (typeof elapsed !== 'number' || Number.isNaN(elapsed) || elapsed < 0) {
    return null;
  }

  return Math.floor(elapsed);
};

const mapStateToEvent = (state: SessionState) => {
  switch (state) {
    case 'focus':
      return 'start';
    case 'paused':
      return 'pause';
    case 'interrupted':
      return 'interrupt';
    case 'away_running':
      return 'AWAY';
    case 'interrupted_running':
      return 'INTERRUPTED';
    case 'away_pending_explanation':
    case 'interrupted_pending_reason':
      return 'RETURN';
    case 'idle':
      return 'idle_detected';
    case 'away':
      return 'away_detected';
    default:
      return 'resume';
  }
};

const getEventCategory = (eventType: TimerEventType): EventCategory => {
  if (eventType.includes('reflection')) return 'reflection';
  if (['start', 'resume', 'RESUME', 'pause', 'interrupt', 'INTERRUPTED', 'RETURN', 'AWAY', 'BREAK_END'].includes(eventType)) return 'session';
  return 'system';
};

const getSessionPhase = (state: SessionState, eventType: TimerEventType): SessionPhase => {
  if (eventType.includes('reflection')) return 'reflection';
  if (eventType === 'complete') return 'completed';
  if (state === 'focus') return 'active';
  if (state === 'away' || state === 'idle' || state === 'away_running' || state === 'interrupted_running' || state === 'away_pending_explanation' || state === 'interrupted_pending_reason') return 'inactive';
  return 'system';
};

let transitionQueue: Promise<void> = Promise.resolve();
const HEARTBEAT_INTERVAL_SECONDS = 20;
const heartbeatIntervalsBySession = new Map<string, number>();
const enqueueTransition = (task: () => Promise<void>) => {
  transitionQueue = transitionQueue
    .then(task)
    .catch((error) => {
      console.error('Failed to process transition queue:', error);
    });
};

const enqueueSessionEvent = (payload: LogSessionEventOutboxPayload) => {
  addToQueue('log_session_event', payload);
};

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

const getMinimumWordsForDuration = (durationSeconds: number): number => {
  if (durationSeconds < 2 * 60) return 0;
  if (durationSeconds < 5 * 60) return 5;
  if (durationSeconds < 10 * 60) return 20;
  return 50;
};

const ENFORCEMENT_GRACE_THRESHOLD = 4;
const QUICK_BREAK_LIMIT_PER_DAY = 2;

const getLocalDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createDailyEnforcementStats = (): DailyEnforcementStats => ({
  dateKey: getLocalDateKey(),
  totalEnforcements: 0,
  quickBreakUses: 0,
  totalLostSeconds: 0,
});

const normalizeDailyEnforcementStats = (stats?: DailyEnforcementStats | null): DailyEnforcementStats => {
  const todayKey = getLocalDateKey();
  if (!stats || stats.dateKey !== todayKey) {
    return createDailyEnforcementStats();
  }
  return stats;
};

const applyEnforcementGrace = (minWords: number, totalEnforcementsToday: number): number => {
  if (totalEnforcementsToday < ENFORCEMENT_GRACE_THRESHOLD) {
    return minWords;
  }
  return Math.max(5, Math.floor(minWords * 0.75));
};

const getCurrentSessionElapsedSeconds = (state: Pick<
  TimerState,
  'precisionTimer' | 'elapsedOffsetSeconds' | 'sessionStartTime' | 'totalTime' | 'timeLeft'
>): number => {
  if (state.precisionTimer && typeof state.precisionTimer.getElapsed === 'function') {
    const preciseElapsed = state.precisionTimer.getElapsed();
    const safeElapsed = typeof preciseElapsed === 'number' && preciseElapsed >= 0 ? preciseElapsed : 0;
    return Math.max(0, safeElapsed + state.elapsedOffsetSeconds);
  }

  if (state.sessionStartTime) {
    const elapsedMs = Date.now() - state.sessionStartTime;
    return Math.max(0, Math.floor(elapsedMs / 1000));
  }

  const safeTotalTime = typeof state.totalTime === 'number' && state.totalTime > 0 ? state.totalTime : 0;
  const safeTimeLeft = typeof state.timeLeft === 'number' && state.timeLeft >= 0 ? state.timeLeft : 0;
  return Math.max(0, safeTotalTime - safeTimeLeft);
};

const stopHeartbeatInterval = (sessionId: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const intervalId = heartbeatIntervalsBySession.get(sessionId);
  if (typeof intervalId === 'number') {
    window.clearInterval(intervalId);
    heartbeatIntervalsBySession.delete(sessionId);
  }
};

const startHeartbeatInterval = (sessionId: string, get: () => TimerState): void => {
  if (typeof window === 'undefined') {
    return;
  }

  stopHeartbeatInterval(sessionId);
  const intervalId = window.setInterval(() => {
    const state = get();
    if (!state.currentSessionId || state.currentSessionId !== sessionId || !state.isRunning) {
      return;
    }

    const elapsed = getCurrentSessionElapsedSeconds(state);
    enqueueTransition(async () => {
      enqueueSessionEvent({
        sessionId,
        eventType: 'HEARTBEAT',
        eventCategory: 'system',
        sessionPhase: 'active',
        metadata: { elapsed }
      });
    });
  }, HEARTBEAT_INTERVAL_SECONDS * 1000);

  heartbeatIntervalsBySession.set(sessionId, intervalId);
};

const getElapsedSeconds = (params: {
  precisionTimer: PrecisionTimer | null;
  elapsedOffsetSeconds: number;
  sessionStartTime: number | null;
  totalTime: number;
  timeLeft: number;
  interruptedTime?: number;
}): number => {
  const {
    precisionTimer,
    elapsedOffsetSeconds,
    sessionStartTime,
    totalTime,
    timeLeft,
    interruptedTime = 0,
  } = params;

  let elapsed = 0;

  if (precisionTimer && typeof precisionTimer.getElapsed === 'function') {
    const preciseElapsed = precisionTimer.getElapsed();
    elapsed = (typeof preciseElapsed === 'number' && preciseElapsed >= 0 ? preciseElapsed : 0) + elapsedOffsetSeconds;
  } else if (sessionStartTime) {
    const elapsedMs = Date.now() - sessionStartTime;
    elapsed = Math.max(0, Math.floor(elapsedMs / 1000));
  } else {
    const safeTotalTime = typeof totalTime === 'number' && totalTime > 0 ? totalTime : 0;
    const safeTimeLeft = typeof timeLeft === 'number' && timeLeft >= 0 ? timeLeft : 0;
    elapsed = Math.max(0, safeTotalTime - safeTimeLeft);
  }

  return Math.max(0, elapsed + interruptedTime);
};

const createCrossTabSnapshot = (state: TimerState): CrossTabSessionSnapshot | null => {
  if (!state.currentSessionId) {
    return null;
  }

  return {
    ownerTabId: state.sessionOwnerTabId || tabId,
    sessionId: state.currentSessionId,
    subject: state.subject,
    subjectId: state.subjectId,
    topicId: state.topicId,
    syllabusId: state.syllabusId,
    sessionType: state.sessionType,
    duration: state.totalTime,
    currentSessionElapsedSeconds: getCurrentSessionElapsedSeconds(state),
    interruptedTime: state.interruptedTime,
    isInterruptedMode: state.isInterruptedMode,
    isRunning: state.isRunning,
    pauseCount: state.pauseCount,
    totalPauseTime: state.totalPauseTime,
    interruptionCount: state.interruptionCount,
    activeFocusTime: state.activeFocusTime,
    startedAt: state.sessionStartTime,
    updatedAt: Date.now(),
  };
};

const attachPrecisionTimerHandlers = (
  precisionTimer: PrecisionTimer,
  subject: string,
  sessionType: 'focus' | 'break' | 'interrupted',
  set: (partial: Partial<TimerState>) => void,
  get: () => TimerState
) => {
  precisionTimer.onTick((_elapsed, remaining) => {
    const safeRemaining = typeof remaining === 'number' && !isNaN(remaining) && remaining >= 0 ? remaining : 0;
    const safeTimeLeft = Math.max(0, Math.ceil(safeRemaining));

    set({
      preciseTimeLeft: safeRemaining,
      timeLeft: safeTimeLeft,
      lastPrecisionUpdate: performance.now(),
    });

    const updateActiveFocusTime = get().updateActiveFocusTime;
    if (updateActiveFocusTime) {
      updateActiveFocusTime();
    }

    if (sessionType === 'interrupted') {
      const totalElapsed = get().interruptedTime + getCurrentSessionElapsedSeconds(get());
      setSafeTitle(`${formatPreciseTime(totalElapsed, { showMilliseconds: false })} (Continued) - ${subject} | GRYND`);
    } else {
      setSafeTitle(`${formatPreciseTime(safeRemaining, { showMilliseconds: true })} - ${subject} | GRYND`);
    }

    if (safeRemaining <= 0 && sessionType !== 'interrupted' && get().isSessionLeader) {
      const completeMethod = get().complete;
      if (completeMethod) {
        completeMethod();
      }
    }
  });
};

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      // Initial state - using safe defaults
      ...initializeSafeDefaults(),

      // Enhanced analytics methods
      saveSessionToDatabase: async (session: TimerSession, events: TimerEvent[] = []) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('No authenticated user for session save');
        }

        const normalizedStartTime = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
        const normalizedEndTime = session.endTime
          ? session.endTime instanceof Date
            ? session.endTime
            : new Date(session.endTime)
          : undefined;

        const deviceInfo = getDeviceInfo();
        const derivedMetrics = computeBasicSessionMetrics(events);
        const focusSeconds = derivedMetrics.focusSeconds;
        const pauseSeconds = derivedMetrics.pauseSeconds;
        const pauseCount = derivedMetrics.pauseCount;
        const totalTrackedSeconds = focusSeconds + pauseSeconds;

        const { data: heartbeatRows, error: heartbeatError } = await supabase
          .from('session_events')
          .select('metadata')
          .eq('session_id', session.sessionId)
          .eq('user_id', user.id)
          .eq('event_type', 'HEARTBEAT')
          .order('event_timestamp', { ascending: false })
          .limit(1);

        if (heartbeatError) {
          throw heartbeatError;
        }

        const heartbeatElapsedSeconds = getHeartbeatElapsedFromMetadata(heartbeatRows?.[0]?.metadata) ?? 0;
        const actualDurationSeconds = Math.max(0, heartbeatElapsedSeconds, totalTrackedSeconds);

        const activeFocusRatio = focusSeconds > 0 && totalTrackedSeconds > 0
          ? focusSeconds / totalTrackedSeconds
          : 0;
        const completionBonus = session.completed ? 0.2 : 0;
        const productivityScore = Math.min(1.0, activeFocusRatio + completionBonus);
        const focusScore = calculateFocusScore({
          totalActiveSeconds: focusSeconds,
          totalPauseSeconds: pauseSeconds,
          totalInterruptionSeconds: 0,
          interruptionCount: session.interruptionCount || 0,
          totalSessionSeconds: totalTrackedSeconds,
        });
        const idealVsActual = computeIdealVsActual({
          planned_duration_seconds: session.duration,
          active_focus_seconds: focusSeconds,
        });
        const completionStatus = session.completed
          ? 'completed'
          : session.type === 'interrupted'
            ? 'interrupted'
            : 'abandoned';

        const sessionData = {
          user_id: user.id,
          session_id: session.sessionId,
          subject_id: session.subjectId,
          topic_id: session.topicId,
          start_time: normalizedStartTime.toISOString(),
          end_time: normalizedEndTime?.toISOString(),
          planned_duration_seconds: session.duration,
          actual_duration_seconds: actualDurationSeconds,
          active_focus_seconds: focusSeconds,
          pause_count: pauseCount,
          total_pause_duration_seconds: pauseSeconds,
          total_interruption_seconds: 0,
          focus_score: focusScore,
          adherence_score: idealVsActual.adherenceScore,
          delta_seconds: idealVsActual.deltaSeconds,
          adherence_status: idealVsActual.status,
          focus_rating: session.focusRating,
          productivity_score: productivityScore,
          interruption_count: session.interruptionCount || 0,
          completion_status: completionStatus,
          stop_reason: session.stopReason,
          stop_reason_details: session.stopReasonDetails,
          session_notes: session.reflection,
          tags: session.tags,
          mood_before: session.moodBefore,
          mood_after: session.moodAfter,
          energy_level: session.energyLevel,
          device_type: deviceInfo.deviceType,
          browser_info: deviceInfo.browserInfo
        };

        const { error } = await supabase
          .from('session_analytics')
          .upsert(sessionData, {
            onConflict: 'session_id',
            ignoreDuplicates: false
          });

        if (error) {
          throw error;
        }

        console.log('Session saved to database:', session.sessionId);
      },

      updateFocusPatterns: async (session: TimerSession) => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user || !session.startTime) return;

          const startTime = new Date(session.startTime);
          const hourOfDay = startTime.getHours();
          const dayOfWeek = startTime.getDay();
          const weekOfYear = Math.ceil((startTime.getTime() - new Date(startTime.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
          const month = startTime.getMonth() + 1;

          const focusData = {
            user_id: user.id,
            hour_of_day: hourOfDay,
            day_of_week: dayOfWeek,
            week_of_year: weekOfYear,
            month: month,
            subject_id: session.subjectId,
            average_focus_duration_minutes: (session.actualDuration || 0) / 60,
            peak_focus_score: session.focusRating || 0,
            session_count: 1,
            completion_rate: session.completed ? 1.0 : 0.0,
            interruption_rate: (session.interruptionCount || 0) / Math.max(1, session.actualDuration || 1),
            subject_performance: {
              productivity_score: session.productivityScore || 0,
              active_focus_ratio: session.activeFocusSeconds && session.actualDuration 
                ? session.activeFocusSeconds / session.actualDuration 
                : 0
            }
          };

          // Use upsert to update existing patterns or create new ones
          const { error } = await supabase
            .from('focus_patterns')
            .upsert(focusData, {
              onConflict: 'user_id,hour_of_day,day_of_week,subject_id',
              ignoreDuplicates: false
            });

          if (error) {
            console.error('Failed to update focus patterns:', error);
          } else {
            console.log('✅ Focus patterns updated');
          }
        } catch (error) {
          console.error('Error updating focus patterns:', error);
        }
      },

      generateBehavioralInsights: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Generate insights for the past week
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 7);

          // Get focus patterns for analysis
          const { data: patterns, error: patternsError } = await supabase
            .from('focus_patterns')
            .select('*')
            .eq('user_id', user.id);

          if (patternsError) {
            console.error('Failed to fetch focus patterns:', patternsError);
            return;
          }

          if (!patterns || patterns.length === 0) {
            console.log('No focus patterns available for insights');
            return;
          }

          // Analyze peak focus times
          const hourlyPerformance = patterns.reduce((acc, pattern) => {
            const hour = pattern.hour_of_day;
            if (!acc[hour]) {
              acc[hour] = { totalScore: 0, count: 0, completionRate: 0 };
            }
            acc[hour].totalScore += pattern.peak_focus_score || 0;
            acc[hour].count += 1;
            acc[hour].completionRate += pattern.completion_rate || 0;
            return acc;
          }, {});

          const peakHours = Object.entries(hourlyPerformance)
            .map(([hour, data]: [string, any]) => ({
              hour: parseInt(hour),
              avgScore: data.totalScore / data.count,
              avgCompletion: data.completionRate / data.count
            }))
            .sort((a, b) => b.avgScore - a.avgScore)
            .slice(0, 3);

          // Generate productivity trend insight
          const productivityInsight = {
            user_id: user.id,
            insight_type: 'productivity_trend',
            time_period: 'weekly',
            date_range_start: startDate.toISOString().split('T')[0],
            date_range_end: endDate.toISOString().split('T')[0],
            insight_data: {
              peak_hours: peakHours,
              total_sessions: patterns.length,
              average_completion_rate: patterns.reduce((sum, p) => sum + (p.completion_rate || 0), 0) / patterns.length,
              trend_direction: 'improving' // This would be calculated based on historical data
            },
            confidence_score: patterns.length >= 10 ? 0.85 : 0.60,
            recommendations: [
              `Your peak focus time is around ${peakHours[0]?.hour || 9}:00`,
              'Schedule important tasks during your peak hours',
              'Consider taking breaks when focus naturally dips'
            ],
            action_items: [
              'Block calendar during peak focus hours',
              'Set up environment for optimal focus',
              'Plan challenging tasks for peak times'
            ]
          };

          const { error: insightError } = await supabase
            .from('behavioral_insights')
            .upsert(productivityInsight, {
              onConflict: 'user_id,insight_type,time_period,date_range_start'
            });

          if (insightError) {
            console.error('Failed to save behavioral insights:', insightError);
          } else {
            console.log('✅ Behavioral insights generated');
          }
        } catch (error) {
          console.error('Error generating behavioral insights:', error);
        }
      },

      recordInterruption: () => {
        const state = get();
        set({
          interruptionCount: state.interruptionCount + 1,
          lastActiveTime: performance.now()
        });
      },

      updateActiveFocusTime: () => {
        const state = get();
        const now = performance.now();
        
        if (state.isRunning && !state.pauseStartTime && state.lastActiveTime > 0) {
          const additionalFocusTime = (now - state.lastActiveTime) / 1000;
          set({
            activeFocusTime: state.activeFocusTime + additionalFocusTime,
            lastActiveTime: now
          });
        }
      },

      initializeFromStorage: () => {
        try {
          console.log('Initializing timer store from storage...');
          
          const defaults = initializeSafeDefaults();
          set(defaults);
          
          const storedSessions = safeLocalStorage.getItem('grynd-timer-sessions');
          if (storedSessions) {
            const parsedSessions = JSON.parse(storedSessions);
            if (Array.isArray(parsedSessions)) {
              const sessions = parsedSessions.map((session: any) => ({
                ...session,
                startTime: session.startTime ? new Date(session.startTime) : new Date(),
                endTime: session.endTime ? new Date(session.endTime) : undefined,
                id: session.id || uuidv4(),
                sessionId: session.sessionId || uuidv4(),
                subject: session.subject || 'Untitled Session',
                type: session.type || 'focus',
                duration: typeof session.duration === 'number' && session.duration > 0 ? session.duration : 1500,
                actualDuration: typeof session.actualDuration === 'number' && session.actualDuration >= 0 ? session.actualDuration : undefined,
                completed: Boolean(session.completed),
                syllabusId: session.syllabusId || null,
                // Enhanced analytics fields
                pauseCount: session.pauseCount || 0,
                totalPauseDuration: session.totalPauseDuration || 0,
                interruptionCount: session.interruptionCount || 0,
                activeFocusSeconds: session.activeFocusSeconds || 0,
                productivityScore: session.productivityScore || 0,
              }));
              set({ sessions });
              console.log(`✅ Loaded ${sessions.length} sessions from storage`);
            }
          }
        } catch (error) {
          console.error('Failed to initialize from storage:', error);
          const defaults = initializeSafeDefaults();
          set(defaults);
        }
      },

      recoverActiveSession: () => {
        try {
          const snapshot = readActiveSessionSnapshot();
          if (!snapshot) {
            return;
          }

          if (Date.now() - snapshot.updatedAt > CROSS_TAB_SNAPSHOT_TTL_MS) {
            writeActiveSessionSnapshot(null);
            return;
          }

          const existingTimer = get().precisionTimer;
          if (existingTimer && typeof existingTimer.stop === 'function') {
            existingTimer.stop();
          }

          const remaining = Math.max(0, snapshot.duration - snapshot.currentSessionElapsedSeconds);
          const precisionTimer = new PrecisionTimer(remaining);
          attachPrecisionTimerHandlers(precisionTimer, snapshot.subject, snapshot.sessionType, set, get);

          if (snapshot.isRunning && remaining > 0) {
            precisionTimer.start();
            startHeartbeatInterval(snapshot.sessionId, get);
          }

          set({
            currentSessionId: snapshot.sessionId,
            timeLeft: Math.max(0, Math.ceil(remaining)),
            totalTime: snapshot.duration,
            preciseTimeLeft: remaining,
            isRunning: snapshot.isRunning,
            sessionType: snapshot.sessionType,
            subject: snapshot.subject,
            subjectId: snapshot.subjectId,
            topicId: snapshot.topicId,
            syllabusId: snapshot.syllabusId,
            startTime: snapshot.startedAt ? new Date(snapshot.startedAt).toISOString() : null,
            precisionTimer,
            sessionStartTime: snapshot.startedAt,
            isInterruptedMode: snapshot.isInterruptedMode,
            interruptedTime: snapshot.interruptedTime,
            elapsedOffsetSeconds: snapshot.currentSessionElapsedSeconds,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            pauseStartTime: snapshot.isRunning ? null : performance.now(),
            totalPauseTime: snapshot.totalPauseTime,
            pauseCount: snapshot.pauseCount,
            interruptionCount: snapshot.interruptionCount,
            lastActiveTime: snapshot.isRunning ? performance.now() : 0,
            activeFocusTime: snapshot.activeFocusTime,
            sessionEvents: [],
            currentState: snapshot.isInterruptedMode
              ? 'interrupted'
              : snapshot.isRunning
                ? 'focus'
                : 'paused',
            lastEventTime: snapshot.updatedAt,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          });

          const nextSnapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(nextSnapshot);
          if (nextSnapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot: nextSnapshot,
              sourceTabId: tabId
            });
          }
        } catch (error) {
          console.error('Failed to recover active session:', error);
        }
      },

      recoverUnfinishedSessionFromDatabase: async () => {
        try {
          if (get().currentSessionId) {
            return;
          }

          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            return;
          }

          const { data: latestEvents, error: latestEventsError } = await supabase
            .from('session_events')
            .select('session_id, event_type, event_timestamp, event_sequence, metadata')
            .eq('user_id', user.id)
            .order('event_timestamp', { ascending: false })
            .order('event_sequence', { ascending: false })
            .limit(500);

          if (latestEventsError) {
            throw latestEventsError;
          }

          const latestBySession = new Map<string, any>();
          (latestEvents || []).forEach((event) => {
            if (!event?.session_id || latestBySession.has(event.session_id)) {
              return;
            }
            latestBySession.set(event.session_id, event);
          });

          const pendingSessionEvent = Array.from(latestBySession.values())
            .filter((event) => {
              const eventType = String(event.event_type || '').toLowerCase();
              return !['complete', 'abandon', 'interrupt'].includes(eventType);
            })
            .sort(
              (left, right) =>
                new Date(right.event_timestamp).getTime() - new Date(left.event_timestamp).getTime()
            )[0];

          if (!pendingSessionEvent?.session_id) {
            return;
          }

          const { data: eventRows, error: eventsError } = await supabase
            .from('session_events')
            .select('event_type, event_timestamp, event_sequence, metadata')
            .eq('user_id', user.id)
            .eq('session_id', pendingSessionEvent.session_id)
            .order('event_timestamp', { ascending: true })
            .order('event_sequence', { ascending: true });

          if (eventsError) {
            throw eventsError;
          }

          const events = eventRows || [];
          const lastEventType = String(events[events.length - 1]?.event_type || '').toLowerCase();
          if (['complete', 'abandon', 'interrupt'].includes(lastEventType)) {
            return;
          }

          const maxHeartbeatElapsed = events.reduce((maxElapsed, event) => {
            const elapsed = getHeartbeatElapsedFromMetadata(event.metadata);
            return Math.max(maxElapsed, elapsed ?? 0);
          }, 0);

          const firstEvent = events[0];
          const startMetadata = (firstEvent?.metadata || {}) as Record<string, unknown>;
          const sessionStart = firstEvent?.event_timestamp
            ? new Date(firstEvent.event_timestamp)
            : new Date();
          const elapsedSeconds = Math.max(0, maxHeartbeatElapsed);
          const totalDuration = Math.max(
            60,
            typeof startMetadata.duration === 'number'
              ? Math.floor(startMetadata.duration)
              : 1500
          );
          const remaining = Math.max(0, totalDuration - elapsedSeconds);
          const isPaused = ['pause', 'away_detected', 'idle_detected', 'reflection_start', 'away', 'interrupted', 'return'].includes(lastEventType);
          const isInterrupted = String(startMetadata.sessionType || '').toLowerCase() === 'interrupted';
          const recoveredSubject = typeof startMetadata.subject === 'string' && startMetadata.subject
            ? startMetadata.subject
            : isInterrupted
              ? 'Recovered interrupted session'
              : 'Recovered session';
          const recoveredSubjectId =
            typeof startMetadata.subjectId === 'string' ? startMetadata.subjectId : undefined;
          const recoveredTopicId =
            typeof startMetadata.topicId === 'string' ? startMetadata.topicId : undefined;
          const recoveredType: TimerSession['type'] = isInterrupted ? 'interrupted' : 'focus';

          const precisionTimer = new PrecisionTimer(isInterrupted ? totalDuration : Math.max(remaining, 1));
          attachPrecisionTimerHandlers(precisionTimer, recoveredSubject, recoveredType, set, get);

          if (!isPaused && (!isInterrupted || remaining > 0)) {
            precisionTimer.start();
            startHeartbeatInterval(pendingSessionEvent.session_id, get);
          }

          const existingSessions = get().sessions || [];
          const existingSession = existingSessions.find((session) => session.sessionId === pendingSessionEvent.session_id);
          const recoveredSession: TimerSession = existingSession || {
            id: pendingSessionEvent.session_id,
            sessionId: pendingSessionEvent.session_id,
            subject: recoveredSubject,
            subjectId: recoveredSubjectId,
            topicId: recoveredTopicId,
            type: recoveredType,
            startTime: sessionStart,
            duration: totalDuration,
            actualDuration: elapsedSeconds,
            completed: false,
            pauseCount: 0,
            totalPauseDuration: 0,
            interruptionCount: isInterrupted ? 1 : 0,
            activeFocusSeconds: elapsedSeconds,
          };

          const mergedSessions = existingSession
            ? existingSessions.map((session) => (session.sessionId === recoveredSession.sessionId ? recoveredSession : session))
            : [recoveredSession, ...existingSessions];

          set({
            currentSessionId: pendingSessionEvent.session_id,
            timeLeft: isInterrupted ? totalDuration : Math.max(0, Math.ceil(remaining)),
            totalTime: totalDuration,
            preciseTimeLeft: isInterrupted ? totalDuration : remaining,
            isRunning: !isPaused,
            sessionType: recoveredType,
            subject: recoveredSession.subject,
            subjectId: recoveredSubjectId || null,
            topicId: recoveredTopicId || null,
            syllabusId: recoveredSession.syllabusId || null,
            startTime: sessionStart.toISOString(),
            precisionTimer,
            sessions: mergedSessions,
            sessionStartTime: sessionStart.getTime(),
            isInterruptedMode: isInterrupted,
            interruptedTime: isInterrupted ? elapsedSeconds : 0,
            elapsedOffsetSeconds: elapsedSeconds,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            pauseStartTime: isPaused ? performance.now() : null,
            totalPauseTime: 0,
            pauseCount: 0,
            interruptionCount: isInterrupted ? 1 : 0,
            lastActiveTime: !isPaused ? performance.now() : 0,
            activeFocusTime: elapsedSeconds,
            sessionEvents: [],
            currentState: isInterrupted
              ? 'interrupted'
              : !isPaused
                ? 'focus'
                : 'paused',
            lastEventTime: Date.now(),
            resumeReasonRequired: isPaused,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          });

          const snapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(snapshot);
          if (snapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot,
              sourceTabId: tabId
            });
          }
        } catch (error) {
          console.error('Failed to recover unfinished session from database:', error);
        }
      },

      transitionState: (newState, metadata = {}) => {
        const now = Date.now();
        const prevState = get().currentState;

        const forceEvent = Boolean((metadata as { force?: boolean }).force);
        if (newState === prevState && !forceEvent) {
          return null;
        }

        const lastTime = get().lastEventTime;
        const duration = typeof lastTime === 'number'
          ? Math.max(1, Math.floor((now - lastTime) / 1000))
          : 0;

        const overrideEventType = (metadata as { eventType?: TimerEventType }).eventType;
        let eventType = overrideEventType ?? mapStateToEvent(newState);
        if (
          !overrideEventType &&
          newState === 'focus' &&
          (
            prevState === 'paused' ||
            prevState === 'away' ||
            prevState === 'idle' ||
            prevState === 'away_running' ||
            prevState === 'interrupted_running' ||
            prevState === 'away_pending_explanation' ||
            prevState === 'interrupted_pending_reason'
          )
        ) {
          eventType = 'resume';
        }
        if (!overrideEventType && newState === 'idle' && (metadata as { completed?: boolean }).completed) {
          eventType = 'complete';
        }
        if (
          newState === 'paused' &&
          (prevState === 'away' || prevState === 'idle') &&
          (metadata as { reason?: string }).reason === 'awaiting_reflection'
        ) {
          set({
            reflectionRequired: true,
            reflectionType: prevState,
            reflectionStartTime: now,
          });
        }
        const eventIndex = get().sessionEvents.length;
        const eventCategory = getEventCategory(eventType as TimerEventType);
        const sessionPhase = getSessionPhase(newState, eventType as TimerEventType);
        const event: TimerEvent = { type: eventType as TimerEventType, timestamp: now };
        set((state) => ({
          currentState: newState,
          lastEventTime: now,
          sessionEvents: [...state.sessionEvents, event],
        }));

        const sessionId = get().currentSessionId;
        if (!sessionId) {
          console.error('BLOCKED: sessionId not ready');
          return event;
        }

        enqueueTransition(async () => {
          enqueueSessionEvent({
            sessionId,
            eventType,
            eventCategory,
            sessionPhase,
            metadata: {
              ...metadata,
              from: prevState,
              to: newState,
              duration,
              event_index: eventIndex
            }
          });
        });

        return event;
      },

      startSession: (subject, duration = 25 * 60, sessionType = 'focus', subjectId, topicId) => {
        try {
          console.log('Starting session:', { subject, duration, sessionType, subjectId, topicId });
          const externalSession = hasLiveExternalSession();
          if (externalSession) {
            console.warn('Active session already exists in another tab');
            get().recoverActiveSession();
            return;
          }

          const sessionId = uuidv4();
          const startTime = Date.now();
          
          if (!subject || typeof subject !== 'string' || subject.trim() === '') {
            console.error('Invalid subject provided');
            throw new Error('Invalid subject provided');
          }
          if (!duration || typeof duration !== 'number' || duration <= 0) {
            console.error('Invalid duration provided:', duration);
            duration = 1500;
          }

          duration = Math.max(60, Math.floor(duration));

          const precisionTimer = new PrecisionTimer(duration);
          
          precisionTimer.start();
          attachPrecisionTimerHandlers(precisionTimer, subject, sessionType, set, get);
          startHeartbeatInterval(sessionId, get);

          const deviceInfo = getDeviceInfo();
          const newSession: TimerSession = {
            id: sessionId,
            sessionId: sessionId,
            subject: subject.trim(),
            subjectId: subjectId,
            topicId: topicId,
            type: sessionType,
            startTime: new Date(startTime),
            duration,
            completed: false,
            syllabusId: null,
            // Enhanced analytics
            pauseCount: 0,
            totalPauseDuration: 0,
            interruptionCount: 0,
            activeFocusSeconds: 0,
            deviceType: deviceInfo.deviceType,
            browserInfo: deviceInfo.browserInfo,
          };

          const currentSessions = get().sessions || [];
          const updatedSessions = [newSession, ...currentSessions];

          set({
            currentSessionId: sessionId,
            timeLeft: duration,
            totalTime: duration,
            preciseTimeLeft: duration,
            isRunning: true,
            sessionType,
            subject: subject.trim(),
            subjectId: subjectId,
            topicId: topicId,
            syllabusId: null,
            startTime: new Date(startTime).toISOString(),
            precisionTimer,
            sessions: updatedSessions,
            sessionStartTime: startTime,
            isInterruptedMode: sessionType === 'interrupted',
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            // Reset analytics counters
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            interruptionCount: 0,
            lastActiveTime: performance.now(),
            activeFocusTime: 0,
            // Session events tracking
            sessionEvents: [],
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('focus', {
              sessionType,
              subject: subject.trim(),
              subjectId: subjectId || null,
              topicId: topicId || null,
              duration
            });
          }

          const latestEvents = get().sessionEvents;
          addToQueue('save_session_analytics', {
            session: serializeSessionForQueue(newSession),
            events: latestEvents,
          } as SaveSessionOutboxPayload);

          saveSessionsToStorage(updatedSessions);

          const snapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(snapshot);
          if (snapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot,
              sourceTabId: tabId
            });
          }
        } catch (error) {
          console.error('Failed to start session:', error);
          const currentDefaults = initializeSafeDefaults();
          set({
            ...currentDefaults,
            sessions: get().sessions || [],
          });
        }
      },

      pause: (reason, requireResumeReason = true, targetState: SessionState = 'paused') => {
        try {
          const trimmedReason = reason?.trim();

          const { precisionTimer, pauseCount } = get();
          if (precisionTimer && typeof precisionTimer.pause === 'function') {
            precisionTimer.pause();
          }
          
          // Update active focus time before pausing
          const updateActiveFocusTime = get().updateActiveFocusTime;
          if (updateActiveFocusTime) {
            updateActiveFocusTime();
          }
          
          // Log PAUSE event
          set({ 
            isRunning: false,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            pauseStartTime: performance.now(),
            pauseCount: pauseCount + 1,
            resumeReasonRequired: requireResumeReason,
            activeReflectionPrompt: null,
            lastUserInteractionAt: Date.now(),
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState(targetState, trimmedReason ? { reason: trimmedReason } : {});
          }

          const snapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(snapshot);
          if (snapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot,
              sourceTabId: tabId
            });
          }
        } catch (error) {
          console.error('Failed to pause timer:', error);
          set({ isRunning: false });
        }
      },

      resume: (reason) => {
        try {
          const {
            precisionTimer,
            pauseStartTime,
            totalPauseTime,
          } = get();

          const trimmedReason = reason?.trim();

          if (precisionTimer && typeof precisionTimer.start === 'function') {
            precisionTimer.start();
          }
          
          // Calculate pause duration
          let newTotalPauseTime = totalPauseTime;
          if (pauseStartTime) {
            const pauseDuration = (performance.now() - pauseStartTime) / 1000;
            newTotalPauseTime += pauseDuration;
          }
          
          // Log RESUME event
          set({ 
            isRunning: true,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            pauseStartTime: null,
            totalPauseTime: newTotalPauseTime,
            lastActiveTime: performance.now(),
            resumeReasonRequired: false,
            awayReflectionRequired: false,
            activeReflectionPrompt: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
            lastUserInteractionAt: Date.now(),
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('focus', trimmedReason ? { reason: trimmedReason, eventType: 'RESUME' } : { eventType: 'RESUME' });
          }

          const snapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(snapshot);
          if (snapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot,
              sourceTabId: tabId
            });
          }
        } catch (error) {
          console.error('Failed to resume timer:', error);
          set({ isRunning: false });
        }
      },

      requestResume: () => {
        const state = get();
        if (state.currentState === 'away_running') {
          state.handleReturnFromAwayOrInterruption('activity');
          return;
        }
        if (state.currentState === 'interrupted_running') {
          state.handleReturnFromAwayOrInterruption('interrupt_return');
          return;
        }
        state.resume();
      },

      dismissReflectionPrompt: () => {
        set({ activeReflectionPrompt: null });
      },

      markAwayRunning: () => {
        const state = get();
        if (!state.currentSessionId || !state.isRunning || state.pendingEnforcement) {
          return;
        }

        const now = Date.now();
        const hasExistingRun =
          state.currentState === 'away_running' || state.currentState === 'interrupted_running';

        state.pause('away_detection', false, 'away_running');
        set({
          lastAwayOrInterruptionAt: hasExistingRun
            ? state.lastAwayOrInterruptionAt ?? now
            : now,
          resumeReasonRequired: false,
          activeReflectionPrompt: null,
          lastEnforcementError: null,
        });
      },

      markInterruptedRunning: () => {
        const state = get();
        if (!state.currentSessionId || state.pendingEnforcement) {
          return;
        }

        const now = Date.now();
        const { precisionTimer, pauseCount } = state;
        const wasRunning = state.isRunning;
        if (wasRunning && precisionTimer && typeof precisionTimer.pause === 'function') {
          precisionTimer.pause();
        }
        const updateActiveFocusTime = get().updateActiveFocusTime;
        if (wasRunning && updateActiveFocusTime) {
          updateActiveFocusTime();
        }
        const hasExistingRun =
          state.currentState === 'away_running' || state.currentState === 'interrupted_running';

        set({
          isRunning: false,
          currentState: 'interrupted_running',
          pauseStartTime: performance.now(),
          pauseCount: wasRunning ? pauseCount + 1 : pauseCount,
          lastAwayOrInterruptionAt: hasExistingRun
            ? state.lastAwayOrInterruptionAt ?? now
            : now,
          interruptionStartTime: now,
          resumeReasonRequired: false,
          activeReflectionPrompt: null,
          lastEnforcementError: null,
          lastUserInteractionAt: now,
        });

        const sessionId = state.currentSessionId;
        if (sessionId) {
          enqueueTransition(async () => {
            enqueueSessionEvent({
              sessionId,
              eventType: 'INTERRUPTED',
              eventCategory: 'session',
              sessionPhase: 'inactive',
              metadata: {
                reason: 'manual_interrupt',
                from: state.currentState,
                to: 'interrupted_running',
                interruptionStartTime: now,
              },
            });
          });
        }
      },

      handleReturnFromAwayOrInterruption: (trigger) => {
        const state = get();
        if (!state.currentSessionId) {
          return;
        }

        const wasAway = state.currentState === 'away_running';
        const wasInterrupted = state.currentState === 'interrupted_running';
        if (!wasAway && !wasInterrupted) {
          return;
        }

        const now = Date.now();
        const startedAt = state.lastAwayOrInterruptionAt ?? state.lastEventTime ?? now;
        const durationSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
        console.log('RETURN HANDLER CALLED', {
          lastAwayOrInterruptionAt: state.lastAwayOrInterruptionAt,
          now,
          duration: durationSeconds,
          trigger,
        });
        console.log('DURATION:', durationSeconds);
        const isLongInterrupted = wasInterrupted && durationSeconds >= 10 * 60;
        const baseMinWords = isLongInterrupted
          ? 50
          : getMinimumWordsForDuration(durationSeconds);
        const enforcementType: EnforcementType = wasAway ? 'AWAY' : 'INTERRUPTED';
        const normalizedStats = normalizeDailyEnforcementStats(state.dailyEnforcementStats);
        const relaxedMinWords = isLongInterrupted
          ? 50
          : applyEnforcementGrace(baseMinWords, normalizedStats.totalEnforcements);
        const nextStats: DailyEnforcementStats = {
          ...normalizedStats,
          totalLostSeconds: normalizedStats.totalLostSeconds + durationSeconds,
          totalEnforcements: relaxedMinWords > 0
            ? normalizedStats.totalEnforcements + 1
            : normalizedStats.totalEnforcements,
        };
        const lostMinutes = Math.round(nextStats.totalLostSeconds / 60);
        const feedback = `You lost ${lostMinutes} minute${lostMinutes === 1 ? '' : 's'} today due to interruptions.`;

        if (relaxedMinWords <= 0) {
          set({
            pendingEnforcement: null,
            activeReflectionPrompt: null,
            lastAwayOrInterruptionAt: null,
            interruptionStartTime: null,
            lastEnforcementError: null,
            awayReflectionRequired: false,
            dailyEnforcementStats: nextStats,
            lastEnforcementFeedback: feedback,
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('paused', {
              eventType: 'RETURN',
              trigger,
              from: enforcementType,
              duration_seconds: durationSeconds,
              enforcement_required: false,
            });
          }

          get().resume();
          return;
        }

        const pendingState: SessionState = wasAway
          ? 'away_pending_explanation'
          : 'interrupted_pending_reason';
        const promptState: ReflectionPromptState = {
          type: 'enforcement_reason',
          source: enforcementType,
          minWords: relaxedMinWords,
          triggeredAt: now,
          validationError: null,
        };

        set({
          pendingEnforcement: {
            type: enforcementType,
            minWords: relaxedMinWords,
            startedAt,
            durationSeconds,
          },
          activeReflectionPrompt: promptState,
          resumeReasonRequired: false,
          awayReflectionRequired: false,
          lastEnforcementError: null,
          interruptionStartTime: null,
          dailyEnforcementStats: nextStats,
          lastEnforcementFeedback: feedback,
        });

        const transitionState = get().transitionState;
        if (transitionState) {
          transitionState(pendingState, {
            eventType: 'RETURN',
            trigger,
            from: enforcementType,
            duration_seconds: durationSeconds,
            enforcement_required: true,
            min_words: relaxedMinWords,
            min_words_base: baseMinWords,
          });
        }
      },

      submitEnforcementExplanation: (reflection, typingTimeMs = 0) => {
        const state = get();
        const pending = state.pendingEnforcement;
        if (!pending) {
          return false;
        }

        const validation = validateExplanation(reflection, pending.minWords, typingTimeMs);
        if (!validation.isValid) {
          const errorMessage = validation.message || 'Please provide a better explanation before resuming.';
          set({
            lastEnforcementError: errorMessage,
            activeReflectionPrompt: {
              type: 'enforcement_reason',
              source: pending.type,
              minWords: pending.minWords,
              triggeredAt: Date.now(),
              validationError: errorMessage,
            }
          });
          return false;
        }

        const normalizedStats = normalizeDailyEnforcementStats(state.dailyEnforcementStats);
        const lostMinutes = Math.round(normalizedStats.totalLostSeconds / 60);
        const warningSuffix = validation.warning ? ` ${validation.warning}` : '';
        const feedback = `You lost ${lostMinutes} minute${lostMinutes === 1 ? '' : 's'} today due to interruptions.${warningSuffix}`;

        set({
          pendingEnforcement: null,
          activeReflectionPrompt: null,
          lastAwayOrInterruptionAt: null,
          interruptionStartTime: null,
          lastEnforcementError: null,
          awayReflectionRequired: false,
          resumeReasonRequired: false,
          lastUserInteractionAt: Date.now(),
          dailyEnforcementStats: normalizedStats,
          lastEnforcementFeedback: feedback,
        });

        const {
          precisionTimer,
          pauseStartTime,
          totalPauseTime,
        } = state;

        if (precisionTimer && typeof precisionTimer.start === 'function') {
          precisionTimer.start();
        }

        let newTotalPauseTime = totalPauseTime;
        if (pauseStartTime) {
          const pauseDuration = (performance.now() - pauseStartTime) / 1000;
          newTotalPauseTime += pauseDuration;
        }

        set({
          isRunning: true,
          sessionOwnerTabId: tabId,
          isSessionLeader: true,
          pauseStartTime: null,
          totalPauseTime: newTotalPauseTime,
          lastActiveTime: performance.now(),
          resumeReasonRequired: false,
          awayReflectionRequired: false,
          activeReflectionPrompt: null,
          pendingEnforcement: null,
          lastAwayOrInterruptionAt: null,
          lastEnforcementError: null,
          lastUserInteractionAt: Date.now(),
        });

        const transitionState = get().transitionState;
        if (transitionState) {
          transitionState('focus', {
            reason: reflection.trim(),
            eventType: 'RESUME',
            enforcement_completed: true,
          });
        }

        const snapshot = createCrossTabSnapshot(get());
        writeActiveSessionSnapshot(snapshot);
        if (snapshot) {
          emitCrossTabEvent({
            type: 'SYNC_ACTIVE_SESSION',
            snapshot,
            sourceTabId: tabId
          });
        }
        return true;
      },

      useQuickBreakShortcut: () => {
        const state = get();
        const pending = state.pendingEnforcement;
        if (!pending) {
          return false;
        }

        const normalizedStats = normalizeDailyEnforcementStats(state.dailyEnforcementStats);
        if (normalizedStats.quickBreakUses >= QUICK_BREAK_LIMIT_PER_DAY) {
          const message = `Quick break limit reached for today (${QUICK_BREAK_LIMIT_PER_DAY}/${QUICK_BREAK_LIMIT_PER_DAY}).`;
          set({
            lastEnforcementError: message,
            activeReflectionPrompt: {
              type: 'enforcement_reason',
              source: pending.type,
              minWords: pending.minWords,
              triggeredAt: Date.now(),
              validationError: message,
            }
          });
          return false;
        }

        const nextStats: DailyEnforcementStats = {
          ...normalizedStats,
          quickBreakUses: normalizedStats.quickBreakUses + 1,
        };
        const lostMinutes = Math.round(nextStats.totalLostSeconds / 60);

        set({
          pendingEnforcement: null,
          activeReflectionPrompt: null,
          lastAwayOrInterruptionAt: null,
          interruptionStartTime: null,
          lastEnforcementError: null,
          awayReflectionRequired: false,
          resumeReasonRequired: false,
          dailyEnforcementStats: nextStats,
          lastEnforcementFeedback: `Quick break used (${nextStats.quickBreakUses}/${QUICK_BREAK_LIMIT_PER_DAY} today). You lost ${lostMinutes} minute${lostMinutes === 1 ? '' : 's'} today due to interruptions.`,
          lastUserInteractionAt: Date.now(),
        });

        get().resume('quick_break_shortcut');
        return true;
      },

      restorePendingEnforcement: () => {
        const pending = get().pendingEnforcement;
        const normalizedStats = normalizeDailyEnforcementStats(get().dailyEnforcementStats);
        if (!pending) {
          set({ dailyEnforcementStats: normalizedStats });
          return;
        }

        const pendingState: SessionState = pending.type === 'AWAY'
          ? 'away_pending_explanation'
          : 'interrupted_pending_reason';
        set({
          isRunning: false,
          resumeReasonRequired: false,
          awayReflectionRequired: false,
          currentState: pendingState,
          dailyEnforcementStats: normalizedStats,
          activeReflectionPrompt: {
            type: 'enforcement_reason',
            source: pending.type,
            minWords: pending.minWords,
            triggeredAt: Date.now(),
            validationError: null,
          }
        });
      },

      triggerAwayReflection: () => {
        get().markAwayRunning();
      },

      submitAwayReflection: (reflection) => {
        const pending = get().pendingEnforcement;
        if (pending) {
          get().submitEnforcementExplanation(reflection, pending.minWords * 300);
          return;
        }

        const trimmedReflection = reflection.trim();
        if (countWords(trimmedReflection) < 50) {
          set({
            activeReflectionPrompt: {
              type: 'away_reflection',
              minWords: 50,
              triggeredAt: Date.now(),
            }
          });
          return;
        }

        set({
          awayReflectionRequired: false,
          activeReflectionPrompt: null,
          lastUserInteractionAt: Date.now(),
        });

        get().resume(trimmedReflection);
      },

      submitReturnReflection: (reflection) => {
        const trimmedReflection = reflection.trim();
        if (countWords(trimmedReflection) < 50) {
          return;
        }

        const reflectionType = get().reflectionType;

        const transitionState = get().transitionState;
        if (transitionState) {
          transitionState('paused', {
            eventType: 'reflection_submitted',
            reflection: trimmedReflection,
            wordCount: countWords(trimmedReflection),
            returnedFrom: reflectionType || undefined,
            force: true
          });
        }

        set({
          reflectionRequired: false,
          reflectionType: null,
          reflectionStartTime: null,
        });

        if (transitionState) {
          transitionState('focus', {
            returned: true,
            returnedFrom: reflectionType || undefined
          });
        }
      },

      stop: (reason, details, wasEndedEarly = true) => {
        try {
          const trimmedReason = reason?.trim();
          const trimmedDetails = details?.trim();
          if (wasEndedEarly && (!trimmedReason || !trimmedDetails)) {
            console.warn('Stop blocked: interruption reason and details are required.');
            return;
          }

          const { 
            precisionTimer, 
            currentSessionId, 
            sessions, 
            sessionStartTime, 
            totalTime, 
            timeLeft, 
            elapsedOffsetSeconds,
            syllabusId,
            activeFocusTime,
            pauseCount,
            totalPauseTime,
            interruptionCount,
          } = get();

          // Final active focus time update
          const updateActiveFocusTime = get().updateActiveFocusTime;
          if (updateActiveFocusTime) {
            updateActiveFocusTime();
          }

          let shouldStartInterrupted = false;
          let interruptedTimeValue = 0;

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('idle', { completed: false, reason: trimmedReason, details: trimmedDetails, wasEndedEarly, eventType: 'abandon' });
          }
          const updatedEvents = get().sessionEvents;

          if (currentSessionId && Array.isArray(sessions)) {
            const sessionIndex = sessions.findIndex(s => s && s.id === currentSessionId);
            if (sessionIndex !== -1 && sessions[sessionIndex]) {
              const updatedSessions = [...sessions];
              const actualDuration = getElapsedSeconds({
                precisionTimer,
                elapsedOffsetSeconds,
                sessionStartTime,
                totalTime,
                timeLeft,
              });

              if (precisionTimer && typeof precisionTimer.stop === 'function') {
                precisionTimer.stop();
              }
              
              const updatedSession = {
                ...updatedSessions[sessionIndex],
                endTime: new Date(),
                actualDuration,
                activeFocusSeconds: Math.floor(activeFocusTime),
                completed: false,
                stopReason: trimmedReason,
                stopReasonDetails: trimmedDetails,
                wasEndedEarly,
                syllabusId: syllabusId,
                pauseCount: pauseCount,
                totalPauseDuration: Math.floor(totalPauseTime),
                interruptionCount: interruptionCount + 1,
                productivityScore: activeFocusTime > 0 && actualDuration > 0 
                  ? Math.min(1.0, activeFocusTime / actualDuration)
                  : 0
              };

              updatedSessions[sessionIndex] = updatedSession;

              console.log('🎯 Session stopped:', updatedSession);

              // Save to database
              const updateFocusPatterns = get().updateFocusPatterns;

              addToQueue('save_session_analytics', {
                session: serializeSessionForQueue(updatedSession),
                events: updatedEvents,
              } as SaveSessionOutboxPayload);
              if (updateFocusPatterns) {
                updateFocusPatterns(updatedSession);
              }

              if (trimmedReason && wasEndedEarly && updatedSession.type === 'focus') {
                shouldStartInterrupted = true;
                interruptedTimeValue = actualDuration;
                console.log('🎯 Will start interrupted timer from:', interruptedTimeValue);
              }

              set({
                sessions: updatedSessions,
                lastCompletedSession: updatedSession,
                interruptedTime: interruptedTimeValue,
              });
              
              saveSessionsToStorage(updatedSessions);
            }
          }

          if (currentSessionId) {
            stopHeartbeatInterval(currentSessionId);
          }

          set({
            currentSessionId: null,
            timeLeft: 0,
            totalTime: 0,
            preciseTimeLeft: 0,
            isRunning: false,
            subject: '',
            subjectId: null,
            topicId: null,
            syllabusId: null,
            startTime: null,
            precisionTimer: null,
            sessionStartTime: null,
            isInterruptedMode: false,
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: null,
            isSessionLeader: true,
            // Reset analytics counters
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            lastActiveTime: 0,
            activeFocusTime: 0,
            // Session events tracking
            sessionEvents: [],
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          });

          setSafeTitle('GRYND - Build Relentless Consistency');
          writeActiveSessionSnapshot(null);
          emitCrossTabEvent({
            type: 'CLEAR_ACTIVE_SESSION',
            sessionId: currentSessionId,
            sourceTabId: tabId
          });

          if (shouldStartInterrupted) {
            console.log('🎯 Auto-starting interrupted timer...');
            setTimeout(() => {
              const startInterruptedMethod = get().startInterruptedTimer;
              if (startInterruptedMethod) {
                startInterruptedMethod();
              }
            }, 100);
          }

        } catch (error) {
          console.error('Failed to stop timer:', error);
          const resetDefaults: Partial<TimerState> = {
            currentSessionId: null,
            timeLeft: 0,
            totalTime: 0,
            preciseTimeLeft: 0,
            isRunning: false,
            subject: '',
            subjectId: null,
            topicId: null,
            syllabusId: null,
            startTime: null,
            precisionTimer: null,
            sessionStartTime: null,
            isInterruptedMode: false,
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: null,
            isSessionLeader: true,
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            lastActiveTime: 0,
            activeFocusTime: 0,
            sessionEvents: [],
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          };
          set(resetDefaults);
          setSafeTitle('GRYND - Build Relentless Consistency');
        }
      },

      startInterruptedTimer: () => {
        try {
          const externalSession = hasLiveExternalSession();
          if (externalSession) {
            console.warn('Active session already exists in another tab');
            get().recoverActiveSession();
            return;
          }

          const { interruptedTime, lastCompletedSession } = get();
          
          console.log('🎯 Starting interrupted timer from:', interruptedTime);
          
          if (!lastCompletedSession) {
            console.error('No last completed session found for interrupted timer');
            return;
          }

          const sessionId = uuidv4();
          const startTime = Date.now();
          const subject = `${lastCompletedSession.subject} (Continued)`;
          
          const maxDuration = 24 * 60 * 60;
          const precisionTimer = new PrecisionTimer(maxDuration);
          
          precisionTimer.start();
          attachPrecisionTimerHandlers(precisionTimer, subject, 'interrupted', set, get);
          startHeartbeatInterval(sessionId, get);

          const deviceInfo = getDeviceInfo();
          const newSession: TimerSession = {
            id: sessionId,
            sessionId: sessionId,
            subject: subject,
            subjectId: lastCompletedSession.subjectId,
            topicId: lastCompletedSession.topicId,
            type: 'interrupted',
            startTime: new Date(startTime),
            duration: maxDuration,
            completed: false,
            syllabusId: lastCompletedSession.syllabusId,
            pauseCount: 0,
            totalPauseDuration: 0,
            interruptionCount: 0,
            activeFocusSeconds: 0,
            deviceType: deviceInfo.deviceType,
            browserInfo: deviceInfo.browserInfo,
          };

          const currentSessions = get().sessions || [];
          const updatedSessions = [newSession, ...currentSessions];

          set({
            currentSessionId: sessionId,
            timeLeft: maxDuration,
            totalTime: maxDuration,
            preciseTimeLeft: maxDuration,
            isRunning: true,
            sessionType: 'interrupted',
            subject: subject,
            subjectId: lastCompletedSession.subjectId,
            topicId: lastCompletedSession.topicId,
            syllabusId: lastCompletedSession.syllabusId,
            startTime: new Date(startTime).toISOString(),
            precisionTimer,
            sessions: updatedSessions,
            sessionStartTime: startTime,
            isInterruptedMode: true,
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: tabId,
            isSessionLeader: true,
            // Reset analytics counters
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            lastActiveTime: performance.now(),
            activeFocusTime: 0,
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            sessionEvents: [],
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
            pendingEnforcement: null,
            lastAwayOrInterruptionAt: null,
            lastEnforcementError: null,
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('interrupted', {
              sessionType: 'interrupted',
              subject,
              subjectId: lastCompletedSession.subjectId || null,
              topicId: lastCompletedSession.topicId || null,
              duration: maxDuration
            });
          }

          const latestEvents = get().sessionEvents;
          addToQueue('save_session_analytics', {
            session: serializeSessionForQueue(newSession),
            events: latestEvents,
          } as SaveSessionOutboxPayload);

          console.log('🎯 Interrupted timer started:', newSession);
          saveSessionsToStorage(updatedSessions);
          const snapshot = createCrossTabSnapshot(get());
          writeActiveSessionSnapshot(snapshot);
          if (snapshot) {
            emitCrossTabEvent({
              type: 'SYNC_ACTIVE_SESSION',
              snapshot,
              sourceTabId: tabId
            });
          }

        } catch (error) {
          console.error('Failed to start interrupted timer:', error);
        }
      },

      complete: (focusRating, reflection, tags, takeBreak = true) => {
        try {
          const { 
            precisionTimer, 
            currentSessionId, 
            sessions, 
            totalTime, 
            timeLeft, 
            sessionStartTime, 
            sessionType,
            subject,
            subjectId,
            topicId,
            isInterruptedMode, 
            interruptedTime, 
            elapsedOffsetSeconds,
            syllabusId,
            activeFocusTime,
            pauseCount,
            totalPauseTime,
            interruptionCount,
          } = get();
          let shouldStartBreak = false;

          // Final active focus time update
          const updateActiveFocusTime = get().updateActiveFocusTime;
          if (updateActiveFocusTime) {
            updateActiveFocusTime();
          }

          const transitionState = get().transitionState;
          if (transitionState && sessionType === 'break') {
            transitionState('idle', { eventType: 'BREAK_END', completed: true });
          } else if (transitionState) {
            transitionState('idle', { completed: true, reflection });
          }
          const updatedEvents = get().sessionEvents;

          if (currentSessionId && Array.isArray(sessions)) {
            const sessionIndex = sessions.findIndex(s => s && s.id === currentSessionId);
            if (sessionIndex !== -1 && sessions[sessionIndex]) {
              const updatedSessions = [...sessions];
              const actualDuration = getElapsedSeconds({
                precisionTimer,
                elapsedOffsetSeconds,
                sessionStartTime,
                totalTime,
                timeLeft,
                interruptedTime: isInterruptedMode ? interruptedTime : 0,
              });

              if (precisionTimer && typeof precisionTimer.stop === 'function') {
                precisionTimer.stop();
              }
              
              // Calculate final productivity score
              const finalActiveFocusTime = get().activeFocusTime;
              const productivityScore = finalActiveFocusTime > 0 && actualDuration > 0 
                ? Math.min(1.0, finalActiveFocusTime / actualDuration)
                : 0;
              
              const completedSession = {
                ...updatedSessions[sessionIndex],
                endTime: new Date(),
                actualDuration,
                activeFocusSeconds: Math.floor(finalActiveFocusTime),
                completed: true,
                focusRating,
                reflection,
                tags,
                wasEndedEarly: false,
                syllabusId: syllabusId,
                pauseCount: pauseCount,
                totalPauseDuration: Math.floor(totalPauseTime),
                interruptionCount: interruptionCount,
                productivityScore: productivityScore,
              };

              updatedSessions[sessionIndex] = completedSession;

              console.log('🎯 Session completed:', completedSession);

              // Save to database and update patterns
              const updateFocusPatterns = get().updateFocusPatterns;
              const generateBehavioralInsights = get().generateBehavioralInsights;

              addToQueue('save_session_analytics', {
                session: serializeSessionForQueue(completedSession),
                events: updatedEvents,
              } as SaveSessionOutboxPayload);
              if (updateFocusPatterns) {
                updateFocusPatterns(completedSession);
              }
              if (generateBehavioralInsights) {
                generateBehavioralInsights();
              }

              set({
                sessions: updatedSessions,
                lastCompletedSession: completedSession,
                showBreakPrompt: false,
                interruptedTime: 0,
              });
              shouldStartBreak = sessionType === 'focus' && !isInterruptedMode && Boolean(takeBreak);
              
              saveSessionsToStorage(updatedSessions);
            }
          }

          if (currentSessionId) {
            stopHeartbeatInterval(currentSessionId);
          }

          set({
            currentSessionId: null,
            timeLeft: 0,
            totalTime: 0,
            preciseTimeLeft: 0,
            isRunning: false,
            subject: '',
            subjectId: null,
            topicId: null,
            syllabusId: null,
            startTime: null,
            precisionTimer: null,
            breakStartTime: null,
            sessionStartTime: null,
            isInterruptedMode: false,
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: null,
            isSessionLeader: true,
            // Reset analytics counters
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            lastActiveTime: 0,
            activeFocusTime: 0,
            // Session events tracking
            sessionEvents: [],
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
          });

          setSafeTitle('GRYND - Build Relentless Consistency');
          writeActiveSessionSnapshot(null);
          emitCrossTabEvent({
            type: 'CLEAR_ACTIVE_SESSION',
            sessionId: currentSessionId,
            sourceTabId: tabId
          });

          if (shouldStartBreak) {
            get().startBreakTimer(5 * 60);
            return;
          }
        } catch (error) {
          console.error('Failed to complete timer:', error);
          const resetDefaults: Partial<TimerState> = {
            currentSessionId: null,
            timeLeft: 0,
            totalTime: 0,
            preciseTimeLeft: 0,
            isRunning: false,
            subject: '',
            subjectId: null,
            topicId: null,
            syllabusId: null,
            startTime: null,
            precisionTimer: null,
            showBreakPrompt: false,
            sessionStartTime: null,
            isInterruptedMode: false,
            elapsedOffsetSeconds: 0,
            sessionOwnerTabId: null,
            isSessionLeader: true,
            pauseStartTime: null,
            totalPauseTime: 0,
            pauseCount: 0,
            lastActiveTime: 0,
            activeFocusTime: 0,
            sessionEvents: [],
            resumeReasonRequired: false,
            activeReflectionPrompt: null,
            awayReflectionRequired: false,
            lastUserInteractionAt: Date.now(),
            currentState: 'idle' as SessionState,
            lastEventTime: null,
            reflectionRequired: false,
            reflectionType: null,
            reflectionStartTime: null,
          };
          set(resetDefaults);
          setSafeTitle('GRYND - Build Relentless Consistency');
        }
      },

      endBreak: (reason = 'manual_end') => {
        const state = get();
        if (!state.currentSessionId || state.sessionType !== 'break') {
          return;
        }

        if (state.precisionTimer && typeof state.precisionTimer.stop === 'function') {
          state.precisionTimer.stop();
        }
        stopHeartbeatInterval(state.currentSessionId);

        const transitionState = get().transitionState;
        if (transitionState) {
          transitionState('idle', {
            eventType: 'BREAK_END',
            reason,
            completed: true,
          });
        }

        set({
          currentSessionId: null,
          timeLeft: 0,
          totalTime: 0,
          preciseTimeLeft: 0,
          isRunning: false,
          subject: '',
          subjectId: null,
          topicId: null,
          syllabusId: null,
          startTime: null,
          precisionTimer: null,
          breakStartTime: null,
          sessionStartTime: null,
          isInterruptedMode: false,
          elapsedOffsetSeconds: 0,
          sessionOwnerTabId: null,
          isSessionLeader: true,
          pauseStartTime: null,
          totalPauseTime: 0,
          pauseCount: 0,
          lastActiveTime: 0,
          activeFocusTime: 0,
          sessionEvents: [],
          resumeReasonRequired: false,
          activeReflectionPrompt: null,
          awayReflectionRequired: false,
          lastUserInteractionAt: Date.now(),
          currentState: 'idle' as SessionState,
          lastEventTime: null,
          reflectionRequired: false,
          reflectionType: null,
          reflectionStartTime: null,
          pendingEnforcement: null,
          lastAwayOrInterruptionAt: null,
          interruptionStartTime: null,
          lastEnforcementError: null,
          showBreakPrompt: false,
        });

        setSafeTitle('GRYND - Build Relentless Consistency');
        writeActiveSessionSnapshot(null);
        emitCrossTabEvent({
          type: 'CLEAR_ACTIVE_SESSION',
          sessionId: state.currentSessionId,
          sourceTabId: tabId
        });
      },

      startBreakTimer: (durationSeconds) => {
        try {
          if (!durationSeconds || typeof durationSeconds !== 'number' || durationSeconds <= 0) {
            console.error('Invalid break duration:', durationSeconds);
            throw new Error('Invalid break duration');
          }
          
          const safeDuration = Math.max(60, Math.floor(durationSeconds));

          const startSessionMethod = get().startSession;
          if (startSessionMethod) {
            startSessionMethod('Break Time', safeDuration, 'break', undefined, undefined);
            set({ breakStartTime: performance.now() });
          }
        } catch (error) {
          console.error('Failed to start break timer:', error);
        }
      },

      dismissBreakPrompt: () => {
        set({ showBreakPrompt: false });
      },

      updatePreciseTime: () => {
        try {
          const { precisionTimer } = get();
          if (precisionTimer && typeof precisionTimer.getRemaining === 'function') {
            const remaining = precisionTimer.getRemaining();
            const safeRemaining = typeof remaining === 'number' && !isNaN(remaining) && remaining >= 0 ? remaining : 0;
            const safeTimeLeft = Math.max(0, Math.ceil(safeRemaining));
            
            set({
              preciseTimeLeft: safeRemaining,
              timeLeft: safeTimeLeft,
              lastPrecisionUpdate: performance.now(),
            });
          }
        } catch (error) {
          console.error('Failed to update precise time:', error);
          set({
            preciseTimeLeft: 0,
            timeLeft: 0,
            lastPrecisionUpdate: performance.now(),
          });
        }
      },
    }),
    {
      name: 'timer-storage',
      partialize: (state) => ({
        sessions: Array.isArray(state.sessions) ? state.sessions : [],
        lastCompletedSession: state.lastCompletedSession || null,
        interruptedTime: state.interruptedTime || 0,
        pendingEnforcement: state.pendingEnforcement || null,
        dailyEnforcementStats: state.dailyEnforcementStats,
      }),
      onRehydrateStorage: () => (state) => {
        try {
          if (state) {
            console.log('Store rehydrated successfully');
            if (!Array.isArray(state.sessions)) {
              state.sessions = [];
            }
            // Reset active timer state but preserve sessions and interrupted time
            const resetFields = {
              timeLeft: 0,
              totalTime: 0,
              preciseTimeLeft: 0,
              isRunning: false,
              currentSessionId: null,
              precisionTimer: null,
              subject: '',
              subjectId: null,
              topicId: null,
              syllabusId: null,
              startTime: null,
              sessionType: 'focus' as const,
              showBreakPrompt: false,
              breakStartTime: null,
              lastPrecisionUpdate: 0,
              sessionStartTime: null,
              isInterruptedMode: false,
              elapsedOffsetSeconds: 0,
              sessionOwnerTabId: null,
              isSessionLeader: true,
              // Reset analytics counters
              pauseStartTime: null,
              totalPauseTime: 0,
              pauseCount: 0,
              lastActiveTime: 0,
              activeFocusTime: 0,
              sessionEvents: [],
              resumeReasonRequired: false,
              activeReflectionPrompt: null,
              awayReflectionRequired: false,
              lastUserInteractionAt: Date.now(),
              currentState: 'idle' as SessionState,
              lastEventTime: null,
              reflectionRequired: false,
              reflectionType: null,
              reflectionStartTime: null,
              pendingEnforcement: state.pendingEnforcement || null,
              lastAwayOrInterruptionAt: state.pendingEnforcement?.startedAt || null,
              lastEnforcementError: null,
              dailyEnforcementStats: normalizeDailyEnforcementStats(state.dailyEnforcementStats),
              lastEnforcementFeedback: null,
            };
            
            Object.assign(state, resetFields);
            
            if (typeof state.interruptedTime !== 'number') {
              state.interruptedTime = 0;
            }
          }
        } catch (error) {
          console.error('Failed to rehydrate store:', error);
          if (state) {
            const defaults = initializeSafeDefaults();
            Object.assign(state, defaults);
          }
        }
      },
    }
  )
);

let crossTabSyncInitialized = false;
let outboxHandlersRegistered = false;

const registerOutboxHandlers = () => {
  if (outboxHandlersRegistered) {
    return;
  }

  outboxHandlersRegistered = true;
  registerOutboxHandler('save_session_analytics', async (payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid outbox payload for session analytics');
    }

    const typedPayload = payload as SaveSessionOutboxPayload;
    if (!typedPayload.session || typeof typedPayload.session !== 'object') {
      throw new Error('Missing session payload');
    }

    const session = hydrateSessionFromQueue(typedPayload.session);
    const events = Array.isArray(typedPayload.events)
      ? typedPayload.events.filter(
          (event): event is TimerEvent =>
            Boolean(event) &&
            typeof (event as TimerEvent).type === 'string' &&
            typeof (event as TimerEvent).timestamp === 'number'
        )
      : [];

    await useTimerStore.getState().saveSessionToDatabase(session, events);
  });

  registerOutboxHandler('log_session_event', async (payload) => {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid outbox payload for session event');
    }

    const typedPayload = payload as Partial<LogSessionEventOutboxPayload>;
    if (!typedPayload.sessionId || !typedPayload.eventType) {
      throw new Error('Missing session event payload fields');
    }

    const error = await logEvent({
      sessionId: typedPayload.sessionId,
      type: typedPayload.eventType,
      eventCategory: typedPayload.eventCategory,
      sessionPhase: typedPayload.sessionPhase,
      metadata: (typedPayload.metadata || {}) as Record<string, unknown>,
    });

    if (error) {
      throw error;
    }
  });
};

const applyRemoteSnapshot = (snapshot: CrossTabSessionSnapshot) => {
  const state = useTimerStore.getState();
  const existingTimer = state.precisionTimer;
  if (existingTimer && typeof existingTimer.stop === 'function') {
    existingTimer.stop();
  }
  if (state.currentSessionId) {
    stopHeartbeatInterval(state.currentSessionId);
  }

  const remaining = Math.max(0, snapshot.duration - snapshot.currentSessionElapsedSeconds);
  const precisionTimer = new PrecisionTimer(remaining);
  attachPrecisionTimerHandlers(
    precisionTimer,
    snapshot.subject,
    snapshot.sessionType,
    (partial) => useTimerStore.setState(partial),
    () => useTimerStore.getState()
  );

  if (snapshot.isRunning && remaining > 0) {
    precisionTimer.start();
  }

  useTimerStore.setState({
    currentSessionId: snapshot.sessionId,
    timeLeft: Math.max(0, Math.ceil(remaining)),
    totalTime: snapshot.duration,
    preciseTimeLeft: remaining,
    isRunning: snapshot.isRunning,
    sessionType: snapshot.sessionType,
    subject: snapshot.subject,
    subjectId: snapshot.subjectId,
    topicId: snapshot.topicId,
    syllabusId: snapshot.syllabusId,
    startTime: snapshot.startedAt ? new Date(snapshot.startedAt).toISOString() : null,
    precisionTimer,
    sessionStartTime: snapshot.startedAt,
    isInterruptedMode: snapshot.isInterruptedMode,
    interruptedTime: snapshot.interruptedTime,
    elapsedOffsetSeconds: snapshot.currentSessionElapsedSeconds,
    sessionOwnerTabId: snapshot.ownerTabId,
    isSessionLeader: snapshot.ownerTabId === tabId,
    pauseStartTime: snapshot.isRunning ? null : performance.now(),
    totalPauseTime: snapshot.totalPauseTime,
    pauseCount: snapshot.pauseCount,
    interruptionCount: snapshot.interruptionCount,
    lastActiveTime: snapshot.isRunning ? performance.now() : 0,
    activeFocusTime: snapshot.activeFocusTime,
    sessionEvents: [],
    currentState: snapshot.isInterruptedMode
      ? 'interrupted'
      : snapshot.isRunning
        ? 'focus'
        : 'paused',
    lastEventTime: snapshot.updatedAt,
    resumeReasonRequired: false,
    activeReflectionPrompt: null,
    awayReflectionRequired: false,
    lastUserInteractionAt: Date.now(),
    reflectionRequired: false,
    reflectionType: null,
    reflectionStartTime: null,
    pendingEnforcement: null,
    lastAwayOrInterruptionAt: null,
    lastEnforcementError: null,
    dailyEnforcementStats: normalizeDailyEnforcementStats(state.dailyEnforcementStats),
    lastEnforcementFeedback: null,
  });
};

const clearRemoteSession = () => {
  const state = useTimerStore.getState();
  if (state.precisionTimer && typeof state.precisionTimer.stop === 'function') {
    state.precisionTimer.stop();
  }
  if (state.currentSessionId) {
    stopHeartbeatInterval(state.currentSessionId);
  }

  useTimerStore.setState({
    currentSessionId: null,
    timeLeft: 0,
    totalTime: 0,
    preciseTimeLeft: 0,
    isRunning: false,
    subject: '',
    subjectId: null,
    topicId: null,
    syllabusId: null,
    startTime: null,
    precisionTimer: null,
    sessionStartTime: null,
    isInterruptedMode: false,
    elapsedOffsetSeconds: 0,
    sessionOwnerTabId: null,
    isSessionLeader: true,
    pauseStartTime: null,
    totalPauseTime: 0,
    pauseCount: 0,
    lastActiveTime: 0,
    activeFocusTime: 0,
    resumeReasonRequired: false,
    activeReflectionPrompt: null,
    awayReflectionRequired: false,
    lastUserInteractionAt: Date.now(),
    currentState: 'idle' as SessionState,
    lastEventTime: null,
    reflectionRequired: false,
    reflectionType: null,
    reflectionStartTime: null,
    pendingEnforcement: null,
    lastAwayOrInterruptionAt: null,
    lastEnforcementError: null,
    dailyEnforcementStats: normalizeDailyEnforcementStats(state.dailyEnforcementStats),
    lastEnforcementFeedback: null,
  });
};

const handleCrossTabEvent = (event: CrossTabSyncEvent) => {
  if (event.sourceTabId === tabId) {
    return;
  }

  if (event.type === 'SYNC_ACTIVE_SESSION') {
    writeActiveSessionSnapshot(event.snapshot);
    applyRemoteSnapshot(event.snapshot);
    return;
  }

  writeActiveSessionSnapshot(null);
  clearRemoteSession();
};

if (typeof window !== 'undefined' && !crossTabSyncInitialized) {
  crossTabSyncInitialized = true;
  registerOutboxHandlers();
  startQueueProcessor();

  getSyncChannel()?.addEventListener('message', (messageEvent: MessageEvent<CrossTabSyncEvent>) => {
    handleCrossTabEvent(messageEvent.data);
  });

  window.addEventListener('storage', (event) => {
    if (!event.newValue || event.key !== ACTIVE_SESSION_EVENT_KEY) {
      return;
    }

    try {
      const payload = JSON.parse(event.newValue) as CrossTabSyncEvent & { emittedAt: number };
      handleCrossTabEvent(payload);
    } catch (error) {
      console.warn('Failed to parse cross-tab storage event:', error);
    }
  });

  window.addEventListener('beforeunload', () => {
    const snapshot = createCrossTabSnapshot(useTimerStore.getState());
    if (snapshot && snapshot.ownerTabId === tabId) {
      writeActiveSessionSnapshot(snapshot);
    }
  });

  window.setInterval(() => {
    const snapshot = createCrossTabSnapshot(useTimerStore.getState());
    if (snapshot && snapshot.ownerTabId === tabId) {
      writeActiveSessionSnapshot(snapshot);
    }
  }, 2000);
}


