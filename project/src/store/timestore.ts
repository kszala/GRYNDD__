import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PrecisionTimer, formatPreciseTime, PreciseSessionData, createPreciseSessionData } from '../utils/precisionTiming';
import supabase from '../supabaseClient';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { calculateFocusScore } from '../services/focusScore';
import { computeIdealVsActual } from '../services/idealVsActual';
import { logEvent } from '../utils/logEvent';

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

type TimerEventType = 'start' | 'pause' | 'resume' | 'interrupt' | 'abandon' | 'complete' | 'away_detected' | 'idle_detected' | 'reflection_start' | 'reflection_submitted';

type EventCategory = 'session' | 'reflection' | 'system';
type SessionPhase = 'active' | 'inactive' | 'reflection' | 'system' | 'completed';

type TimerEvent = {
  type: TimerEventType;
  timestamp: number;
};

type SessionState =
  | 'idle'
  | 'focus'
  | 'paused'
  | 'interrupted'
  | 'away';

type ReflectionPromptType = 'resume_reason' | 'away_reflection';

interface ReflectionPromptState {
  type: ReflectionPromptType;
  minWords?: number;
  triggeredAt: number;
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
  
  // Actions
  startSession: (subject: string, duration?: number, sessionType?: 'focus' | 'break' | 'interrupted', subjectId?: string, topicId?: string) => void;
  pause: (reason?: string, requireResumeReason?: boolean, targetState?: SessionState) => void;
  resume: (reason?: string) => void;
  requestResume: () => void;
  dismissReflectionPrompt: () => void;
  triggerAwayReflection: () => void;
  submitAwayReflection: (reflection: string) => void;
  submitReturnReflection: (reflection: string) => void;
  stop: (reason?: string, details?: string, wasEndedEarly?: boolean) => void;
  complete: (focusRating?: number, reflection?: string, tags?: string[], takeBreak?: boolean) => void;
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
    if (event.type === 'start' || event.type === 'resume') {
      if (pauseStart !== null) {
        pauseMs += Math.max(0, event.timestamp - pauseStart);
        pauseStart = null;
      }
      if (activeStart === null) {
        activeStart = event.timestamp;
      }
      continue;
    }

    if (event.type === 'pause' || event.type === 'away_detected' || event.type === 'idle_detected' || event.type === 'reflection_start') {
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

const mapStateToEvent = (state: SessionState) => {
  switch (state) {
    case 'focus':
      return 'start';
    case 'paused':
      return 'pause';
    case 'interrupted':
      return 'interrupt';
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
  if (['start', 'resume', 'pause', 'interrupt'].includes(eventType)) return 'session';
  return 'system';
};

const getSessionPhase = (state: SessionState, eventType: TimerEventType): SessionPhase => {
  if (eventType.includes('reflection')) return 'reflection';
  if (eventType === 'complete') return 'completed';
  if (state === 'focus') return 'active';
  if (state === 'away' || state === 'idle') return 'inactive';
  return 'system';
};

let transitionQueue: Promise<void> = Promise.resolve();
const enqueueTransition = (task: () => Promise<void>) => {
  transitionQueue = transitionQueue
    .then(task)
    .catch((error) => {
      console.error('Failed to process transition queue:', error);
    });
};

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

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
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.warn('No authenticated user for session save');
            return;
          }

          const deviceInfo = getDeviceInfo();
          const derivedMetrics = computeBasicSessionMetrics(events);
          const shouldUseFallback = events.length === 0;
          const fallbackFocusSeconds = Math.max(0, Math.round(session.activeFocusSeconds || 0));
          const fallbackPauseSeconds = Math.max(0, Math.round(session.totalPauseDuration || 0));
          const focusSeconds = shouldUseFallback ? fallbackFocusSeconds : derivedMetrics.focusSeconds;
          const pauseSeconds = shouldUseFallback ? fallbackPauseSeconds : derivedMetrics.pauseSeconds;
          const pauseCount = shouldUseFallback ? (session.pauseCount || 0) : derivedMetrics.pauseCount;
          const totalTrackedSeconds = focusSeconds + pauseSeconds;
          
          // Calculate productivity score
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
            start_time: session.startTime.toISOString(),
            end_time: session.endTime?.toISOString(),
            planned_duration_seconds: session.duration,
            actual_duration_seconds: Math.max(0, session.actualDuration || totalTrackedSeconds),
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
            .insert(sessionData);

          if (error) {
            console.error('Failed to save session to database:', error);
          } else {
            console.log('✅ Session saved to database:', session.sessionId);
          }
        } catch (error) {
          console.error('Error saving session to database:', error);
        }
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
        if (!overrideEventType && newState === 'focus' && (prevState === 'paused' || prevState === 'away' || prevState === 'idle')) {
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
          try {
            const error = await logEvent({
              sessionId,
              type: eventType,
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
            if (error) {
              console.error('Event insert failed:', {
                sessionId,
                eventType,
                from: prevState,
                to: newState,
                duration,
                error
              });
            }
          } catch (error) {
            console.error('Event insert failed:', {
              sessionId,
              eventType,
              from: prevState,
              to: newState,
              duration,
              error
            });
          }
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
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('focus', {
              sessionType,
              subject: subject.trim(),
              duration
            });
          }

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
            transitionState(targetState, reason ? { reason } : {});
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
            currentSessionId,
            pauseCount,
            resumeReasonRequired,
            awayReflectionRequired,
          } = get();

          if (awayReflectionRequired) {
            set({
              activeReflectionPrompt: {
                type: 'away_reflection',
                minWords: 50,
                triggeredAt: Date.now(),
              }
            });
            return;
          }

          const trimmedReason = reason?.trim();
          if (resumeReasonRequired && !trimmedReason) {
            set({
              activeReflectionPrompt: {
                type: 'resume_reason',
                triggeredAt: Date.now(),
              }
            });
            return;
          }

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
            activeReflectionPrompt: null,
            lastUserInteractionAt: Date.now(),
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('focus', trimmedReason ? { reason: trimmedReason } : {});
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
        const { awayReflectionRequired, resumeReasonRequired } = get();

        if (awayReflectionRequired) {
          set({
            activeReflectionPrompt: {
              type: 'away_reflection',
              minWords: 50,
              triggeredAt: Date.now(),
            }
          });
          return;
        }

        if (resumeReasonRequired) {
          set({
            activeReflectionPrompt: {
              type: 'resume_reason',
              triggeredAt: Date.now(),
            }
          });
          return;
        }

        get().resume();
      },

      dismissReflectionPrompt: () => {
        set({ activeReflectionPrompt: null });
      },

      triggerAwayReflection: () => {
        const state = get();

        if (!state.currentSessionId || !state.isRunning || state.awayReflectionRequired) {
          return;
        }

        state.pause('away_detection', false, 'away');
        set({
          awayReflectionRequired: true,
          resumeReasonRequired: false,
          activeReflectionPrompt: {
            type: 'away_reflection',
            minWords: 50,
            triggeredAt: Date.now(),
          },
        });
      },

      submitAwayReflection: (reflection) => {
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

        get().resume();
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
            transitionState('idle', { completed: false, reason, details, wasEndedEarly, eventType: 'abandon' });
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
                stopReason: reason,
                stopReasonDetails: details,
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
              const saveSessionToDatabase = get().saveSessionToDatabase;
              const updateFocusPatterns = get().updateFocusPatterns;
              
              if (saveSessionToDatabase) {
                saveSessionToDatabase(updatedSession, updatedEvents);
              }
              if (updateFocusPatterns) {
                updateFocusPatterns(updatedSession);
              }

              if (reason && wasEndedEarly && updatedSession.type === 'focus') {
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
          });

          const transitionState = get().transitionState;
          if (transitionState) {
            transitionState('interrupted', {
              sessionType: 'interrupted',
              subject,
              duration: maxDuration
            });
          }

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
            isInterruptedMode, 
            interruptedTime, 
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

          const transitionState = get().transitionState;
          if (transitionState) {
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
              const saveSessionToDatabase = get().saveSessionToDatabase;
              const updateFocusPatterns = get().updateFocusPatterns;
              const generateBehavioralInsights = get().generateBehavioralInsights;
              
              if (saveSessionToDatabase) {
                saveSessionToDatabase(completedSession, updatedEvents);
              }
              if (updateFocusPatterns) {
                updateFocusPatterns(completedSession);
              }
              if (generateBehavioralInsights) {
                generateBehavioralInsights();
              }

              set({
                sessions: updatedSessions,
                lastCompletedSession: completedSession,
                showBreakPrompt: takeBreak && !isInterruptedMode,
                interruptedTime: 0,
              });
              
              saveSessionsToStorage(updatedSessions);
            }
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
          });

          setSafeTitle('GRYND - Build Relentless Consistency');
          writeActiveSessionSnapshot(null);
          emitCrossTabEvent({
            type: 'CLEAR_ACTIVE_SESSION',
            sessionId: currentSessionId,
            sourceTabId: tabId
          });
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

      startBreakTimer: (durationSeconds) => {
        try {
          if (!durationSeconds || typeof durationSeconds !== 'number' || durationSeconds <= 0) {
            console.error('Invalid break duration:', durationSeconds);
            throw new Error('Invalid break duration');
          }
          
          const safeDuration = Math.max(60, Math.floor(durationSeconds));
          
          set({ showBreakPrompt: false });
          const startSessionMethod = get().startSession;
          if (startSessionMethod) {
            startSessionMethod('Break Time', safeDuration, 'break', undefined, undefined);
            set({ breakStartTime: performance.now() });
          }
        } catch (error) {
          console.error('Failed to start break timer:', error);
          set({ showBreakPrompt: false });
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

const applyRemoteSnapshot = (snapshot: CrossTabSessionSnapshot) => {
  const state = useTimerStore.getState();
  const existingTimer = state.precisionTimer;
  if (existingTimer && typeof existingTimer.stop === 'function') {
    existingTimer.stop();
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
  });
};

const clearRemoteSession = () => {
  const state = useTimerStore.getState();
  if (state.precisionTimer && typeof state.precisionTimer.stop === 'function') {
    state.precisionTimer.stop();
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

