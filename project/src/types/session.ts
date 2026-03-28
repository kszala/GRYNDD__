// src/types/session.ts
// Unified session types with all necessary corrections

export interface BaseSession {
  id: string;
  sessionId: string;
  subject: string;
  type: 'focus' | 'break' | 'interrupted';
  startTime: Date;
  endTime?: Date;
  duration: number;
  actualDuration?: number;
  completed: boolean;
  wasEndedEarly: boolean;
  syllabusId?: string | null;
}

export interface SessionData {
  id: string;
  sessionId: string;
  subject: string;
  type: 'focus' | 'break' | 'interrupted';
  startTime: Date;
  endTime?: Date;
  duration: number;
  actualDuration?: number;
  completed: boolean;
  wasEndedEarly: boolean;
  syllabusId?: string | null;
}

export interface TimerSession extends BaseSession {
  focusRating?: number;
  reflection?: string;
  tags?: string[];
  stopReason?: string;
  stopReasonDetails?: string;
  precisionData?: PreciseSessionData;
}

export interface CompleteSessionData extends SessionData {
  status: 'completed';
  timestamp: string;
}

export interface IncompleteSessionData extends SessionData {
  status: 'incomplete';
  reason: string;
  details?: string;
  timestamp: string;
}

export interface HistoryEntry {
  sessionId: string;
  subject: string;
  duration: number;
  status: 'completed' | 'incomplete';
  reason?: string;
  timestamp: string;
}

export interface AnalyticsMetrics {
  sessionId: string;
  eventType: 'session_complete' | 'session_interrupt';
  interruptReason?: string;
  duration: number;
  subject: string;
  timestamp: string;
}

export interface SessionSummary {
  subject: string;
  duration: number;
  type: 'focus' | 'break' | 'interrupted';
  actualDuration?: number;
}

export interface SessionAnalytics {
  id: string;
  date: string;
  focusTime: number;
  interruptedTime: number;
  lectureTime: number;
  efficiency: number;
  totalSessions: number;
  completedSessions: number;
  lecturesWatched: number;
}

export interface PartialSessionData {
  id?: string;
  sessionId?: string;
  subject?: string;
  type?: 'focus' | 'break' | 'interrupted';
  duration?: number;
  actualDuration?: number;
  startTime?: Date;
  endTime?: Date;
  completed?: boolean;
  wasEndedEarly?: boolean;
  syllabusId?: string | null;
  focusRating?: number;
  reflection?: string;
  tags?: string[];
  stopReason?: string;
  stopReasonDetails?: string;
}

export interface PreciseSessionData {
  startTimestamp: number;
  endTimestamp?: number;
  pausedDuration: number;
  actualElapsed: number;
}

// Type guards
export function isCompleteSession(session: PartialSessionData | TimerSession | null | undefined): session is TimerSession {
  return !!(
    session &&
    typeof session.id === 'string' &&
    typeof session.sessionId === 'string' &&
    (session.type === 'focus' || session.type === 'break' || session.type === 'interrupted') &&
    session.startTime instanceof Date &&
    typeof session.duration === 'number' &&
    typeof session.completed === 'boolean' &&
    typeof session.wasEndedEarly === 'boolean'
  );
}

export function isSessionData(session: unknown): session is SessionData {
  return !!(
    session &&
    typeof (session as SessionData).sessionId === 'string' &&
    (session as SessionData).startTime instanceof Date
  );
}

// Normalization functions
export function normalizeSession(partialSession: PartialSessionData | null | undefined): TimerSession {
  const now = new Date();
  
  return {
    id: partialSession?.id || `session-${Date.now()}`,
    sessionId: partialSession?.sessionId || `sess-${Date.now()}`,
    subject: partialSession?.subject || 'Untitled Session',
    type: partialSession?.type || 'focus',
    startTime: partialSession?.startTime || now,
    endTime: partialSession?.endTime,
    duration: partialSession?.duration || 0,
    actualDuration: partialSession?.actualDuration,
    completed: partialSession?.completed ?? false,
    wasEndedEarly: partialSession?.wasEndedEarly ?? false,
    syllabusId: partialSession?.syllabusId ?? null,
    focusRating: partialSession?.focusRating,
    reflection: partialSession?.reflection,
    tags: partialSession?.tags,
    stopReason: partialSession?.stopReason,
    stopReasonDetails: partialSession?.stopReasonDetails,
  };
}

export function createSessionData(partial: PartialSessionData): SessionData {
  const base = normalizeSession(partial);
  return {
    ...base,
    actualDuration: partial.actualDuration,
  };
}

// Helper types for Pomodoro
export interface PomodoroSessionState {
  start?: () => void;
  actualDuration?: number;
  // Add other timer state properties as needed
}

export type PomodoroSession = Omit<TimerSession, 'type'> & {
  type: 'focus' | 'break';
  startTime: Date | undefined;
};