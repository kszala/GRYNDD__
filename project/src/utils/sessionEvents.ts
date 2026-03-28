/**
 * Session Events Logging
 * Minimal event tracking for session state transitions
 * Events: start, pause, resume, interrupt, complete
 */

import supabase from '../supabaseClient';

export type SessionEventType =
  | 'start'
  | 'pause'
  | 'resume'
  | 'interrupt'
  | 'complete'
  | 'reflection_submitted';

export interface SessionEventLog {
  event_type: SessionEventType;
  timestamp: number;
  duration_since_last_event: number; // milliseconds
  state_before: SessionStateSnapshot;
  state_after: SessionStateSnapshot;
}

export interface SessionStateSnapshot {
  isRunning: boolean;
  sessionType: 'focus' | 'break' | 'interrupted';
  timeLeft: number;
  totalTime: number;
  pauseCount: number;
  interruptionCount: number;
  activeFocusTime: number;
}

export interface PersistedSessionEvent {
  event_id: string;
  session_id: string;
  user_id: string;
  event_type: SessionEventType;
  event_timestamp: string;
  duration_since_last_event_seconds: number | null;
  state_before: SessionStateSnapshot;
  state_after: SessionStateSnapshot;
  reason: string | null;
  reflection: string | null;
  inserted_at: string;
}

export interface ReconstructedSessionMetrics {
  totalActiveSeconds: number;
  totalPauseSeconds: number;
  totalInterruptionSeconds: number;
  pauseCount: number;
  interruptionCount: number;
  totalTrackedSeconds: number;
  startedAt: string | null;
  endedAt: string | null;
  completionStatus: 'completed' | 'interrupted' | 'abandoned';
}

/**
 * Create a session state snapshot for event logging
 */
export const createStateSnapshot = (state: {
  isRunning: boolean;
  sessionType: 'focus' | 'break' | 'interrupted';
  timeLeft: number;
  totalTime: number;
  pauseCount: number;
  interruptionCount: number;
  activeFocusTime: number;
}): SessionStateSnapshot => ({
  isRunning: state.isRunning,
  sessionType: state.sessionType,
  timeLeft: state.timeLeft,
  totalTime: state.totalTime,
  pauseCount: state.pauseCount,
  interruptionCount: state.interruptionCount,
  activeFocusTime: state.activeFocusTime,
});

/**
 * Log a session event with state before and after
 */
export const logSessionEvent = (
  eventType: SessionEventType,
  stateBefore: SessionStateSnapshot,
  stateAfter: SessionStateSnapshot,
  lastEventTimestamp: number | null
): SessionEventLog => {
  const currentTimestamp = Date.now();
  const durationSinceLastEvent = lastEventTimestamp ? currentTimestamp - lastEventTimestamp : 0;

  return {
    event_type: eventType,
    timestamp: currentTimestamp,
    duration_since_last_event: durationSinceLastEvent,
    state_before: stateBefore,
    state_after: stateAfter,
  };
};

/**
 * Safe event log storage for a session
 * Keeps recent events in memory (max 100 events per session)
 */
export class SessionEventStore {
  private events: Map<string, SessionEventLog[]> = new Map();
  private maxEventsPerSession = 100;

  recordEvent(sessionId: string, event: SessionEventLog): void {
    if (!this.events.has(sessionId)) {
      this.events.set(sessionId, []);
    }

    const sessionEvents = this.events.get(sessionId)!;
    sessionEvents.push(event);

    // Keep only recent events
    if (sessionEvents.length > this.maxEventsPerSession) {
      sessionEvents.shift();
    }
  }

  getEvents(sessionId: string): SessionEventLog[] {
    return this.events.get(sessionId) || [];
  }

  clearSession(sessionId: string): void {
    this.events.delete(sessionId);
  }

  getLastEventTimestamp(sessionId: string): number | null {
    const events = this.events.get(sessionId);
    if (!events || events.length === 0) return null;
    return events[events.length - 1].timestamp;
  }
}

// Singleton instance for event tracking
export const sessionEventStore = new SessionEventStore();

/**
 * Persist a session event to Supabase with retry logic and deduplication
 * Fire-and-forget pattern: async, non-blocking
 * Retry once after 1s on failure
 */
export const insertSessionEvent = async (
  sessionId: string,
  event: SessionEventLog,
  userId: string | null,
  options?: {
    reason?: string;
    reflection?: string;
  },
  retryCount: number = 0
): Promise<void> => {
  try {
    // Skip if no user
    if (!userId) {
      console.warn('⚠️ No user_id for event insert, skipping');
      return;
    }

    // Generate deterministic event_id for deduplication
    // Format: sessionId_eventType_timestamp (guarantees uniqueness)
    const eventId = `${sessionId}_${event.event_type}_${event.timestamp}`;

    // Convert duration from milliseconds to seconds
    const durationSeconds = Math.round(event.duration_since_last_event / 1000);

    // Prepare event data for Supabase
    const eventData = {
      event_id: eventId,
      session_id: sessionId,
      user_id: userId,
      event_type: event.event_type,
      event_timestamp: new Date(event.timestamp).toISOString(),
      duration_since_last_event_seconds: durationSeconds,
      state_before: event.state_before,
      state_after: event.state_after,
      reason: options?.reason || null,
      reflection: options?.reflection || null,
      inserted_at: new Date().toISOString(),
    };

    // Insert into session_events table
    const { error } = await supabase
      .from('session_events')
      .insert([eventData]);

    if (error) {
      // Retry once after 1s on failure
      if (retryCount === 0) {
        console.warn('⚠️ Event insert failed, retrying in 1s:', {
          sessionId,
          eventId,
          eventType: event.event_type,
          error: error.message
        });

        setTimeout(() => {
          insertSessionEvent(sessionId, event, userId, options, 1).catch(() => {
            // Final failure already logged
          });
        }, 1000);
        return;
      }

      // Final attempt failed
      console.error('❌ Event insert failed after retry:', {
        sessionId,
        eventId,
        eventType: event.event_type,
        error: error.message
      });
      return;
    }

    console.log('✅ Session event persisted:', {
      sessionId,
      eventId,
      eventType: event.event_type,
      timestamp: event.timestamp
    });
  } catch (error) {
    // Retry once on exception
    if (retryCount === 0) {
      console.warn('⚠️ Event insert exception, retrying in 1s:', error);
      setTimeout(() => {
        insertSessionEvent(sessionId, event, userId, options, 1).catch(() => {
          // Final failure already logged
        });
      }, 1000);
      return;
    }

    // Final attempt failed
    console.error('❌ Error persisting session event after retry:', error);
  }
};

/**
 * Fire-and-forget wrapper for insertSessionEvent
 * Ensures UI is not blocked by async operations
 */
export const persistSessionEventAsync = (
  sessionId: string,
  event: SessionEventLog,
  userId: string | null,
  options?: { reason?: string; reflection?: string }
): void => {
  // Use Promise.catch() instead of try-catch to avoid blocking
  insertSessionEvent(sessionId, event, userId, options).catch((_error) => {
    // Error already logged in insertSessionEvent
  });
};

const getStateBucket = (snapshot: SessionStateSnapshot): 'active' | 'paused' | 'interrupted' => {
  if (!snapshot.isRunning) {
    return 'paused';
  }

  return snapshot.sessionType === 'interrupted' ? 'interrupted' : 'active';
};

export const reconstructSessionFromEvents = (
  events: PersistedSessionEvent[]
): ReconstructedSessionMetrics => {
  const sortedEvents = [...events].sort(
    (left, right) =>
      new Date(left.event_timestamp).getTime() - new Date(right.event_timestamp).getTime()
  );

  let totalActiveSeconds = 0;
  let totalPauseSeconds = 0;
  let totalInterruptionSeconds = 0;

  for (let index = 0; index < sortedEvents.length - 1; index += 1) {
    const currentEvent = sortedEvents[index];
    const nextEvent = sortedEvents[index + 1];

    const currentTime = new Date(currentEvent.event_timestamp).getTime();
    const nextTime = new Date(nextEvent.event_timestamp).getTime();
    const durationSeconds = Math.max(0, Math.round((nextTime - currentTime) / 1000));
    const bucket = getStateBucket(currentEvent.state_after);

    if (bucket === 'active') {
      totalActiveSeconds += durationSeconds;
    } else if (bucket === 'paused') {
      totalPauseSeconds += durationSeconds;
    } else {
      totalInterruptionSeconds += durationSeconds;
    }
  }

  const pauseCount = sortedEvents.filter((event) => event.event_type === 'pause').length;
  const interruptionCount = sortedEvents.filter((event) => event.event_type === 'interrupt').length;
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  let completionStatus: ReconstructedSessionMetrics['completionStatus'] = 'abandoned';
  if (lastEvent?.event_type === 'complete') {
    completionStatus = 'completed';
  } else if (lastEvent?.event_type === 'interrupt') {
    completionStatus = 'interrupted';
  }

  return {
    totalActiveSeconds,
    totalPauseSeconds,
    totalInterruptionSeconds,
    pauseCount,
    interruptionCount,
    totalTrackedSeconds: totalActiveSeconds + totalPauseSeconds + totalInterruptionSeconds,
    startedAt: sortedEvents[0]?.event_timestamp || null,
    endedAt: lastEvent?.event_timestamp || null,
    completionStatus,
  };
};

export const fetchSessionEventMetrics = async (
  sessionId: string,
  userId: string
): Promise<ReconstructedSessionMetrics | null> => {
  const { data, error } = await supabase
    .from('session_events')
    .select(`
      event_id,
      session_id,
      user_id,
      event_type,
      event_timestamp,
      duration_since_last_event_seconds,
      state_before,
      state_after,
      reason,
      reflection,
      inserted_at
    `)
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .order('event_timestamp', { ascending: true });

  if (error) {
    console.error('Failed to load session events for analytics reconstruction:', error);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return reconstructSessionFromEvents(data as PersistedSessionEvent[]);
};
