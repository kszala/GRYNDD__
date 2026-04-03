/**
 * Analytics Engine
 * Event-first computation of session and daily metrics
 * Source of truth: session_events table
 */

export interface SessionEvent {
  session_id: string;
  event_type: string;
  event_timestamp: string;
  duration_since_last_event_seconds: number | null;
  metadata?: Record<string, any> | null;
}

export interface SessionMetrics {
  sessionId: string;
  focusTime: number; // seconds
  pauseTime: number; // seconds
  interruptionTime: number; // seconds
  awayTime: number; // seconds
  totalTime: number; // seconds
  completionStatus: 'completed' | 'interrupted' | 'abandoned';
  startedAt: string;
  endedAt: string;
}

export interface DailyMetrics {
  focusTime: number; // seconds
  pauseTime: number; // seconds
  interruptionTime: number; // seconds
  awayTime: number; // seconds
  lostTime: number; // away + interruption
  totalTime: number; // all tracked time
  disciplineScore: number; // percentage: focus / (focus + pause + away + interruption)
  sessionsCount: number;
  avgSessionDuration: number; // minutes
}

/**
 * Compute metrics for a single session from its events
 * Events must be ordered by event_timestamp
 * CRITICAL: Duration between events is assigned to the PREVIOUS state
 */
export const computeSessionMetrics = (events: SessionEvent[]): SessionMetrics | null => {
  if (!events.length) return null;

  // Sort events by timestamp first (safety)
  const sortedEvents = [...events].sort((a, b) => {
    const timeA = new Date(a.event_timestamp).getTime();
    const timeB = new Date(b.event_timestamp).getTime();
    return timeA - timeB;
  });

  const sessionId = sortedEvents[0].session_id;
  let focusTime = 0;
  let pauseTime = 0;
  let interruptionTime = 0;
  let awayTime = 0;

  // Track current state
  let currentState: 'focus' | 'pause' | 'interruption' | 'away' = 'focus';
  let completionStatus: 'completed' | 'interrupted' | 'abandoned' = 'abandoned';
  let lastEventTime: Date = new Date(sortedEvents[0].event_timestamp);

  for (let i = 1; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventType = event.event_type?.toLowerCase();
    const eventTime = new Date(event.event_timestamp);

    // Calculate duration between this event and the previous one
    const duration = Math.max(0, (eventTime.getTime() - lastEventTime.getTime()) / 1000);

    // CRITICAL: Assign duration to the PREVIOUS state (not current)
    if (duration > 0) {
      switch (currentState) {
        case 'focus':
          focusTime += duration;
          break;
        case 'pause':
          pauseTime += duration;
          break;
        case 'interruption':
          interruptionTime += duration;
          break;
        case 'away':
          awayTime += duration;
          break;
      }
    }

    // Transition to next state based on event type
    switch (eventType) {
      case 'start':
        currentState = 'focus';
        break;
      case 'pause':
        currentState = 'pause';
        break;
      case 'resume':
        currentState = 'focus';
        break;
      case 'interrupt':
        currentState = 'interruption';
        completionStatus = 'interrupted';
        break;
      case 'away_detected':
      case 'idle_detected':
        currentState = 'away';
        break;
      case 'complete':
        completionStatus = 'completed';
        break;
      case 'abandon':
        completionStatus = 'abandoned';
        break;
      // For any other event, check if we're returning from away/interruption
      default:
        if (currentState === 'away' || currentState === 'interruption') {
          // Return to focus (context-based, not event name)
          currentState = 'focus';
        }
        break;
    }

    lastEventTime = eventTime;
  }

  // Handle case where session ends without explicit completion
  // Close session at the last event time
  const startedAt = new Date(sortedEvents[0].event_timestamp).toISOString();
  const endedAt = lastEventTime.toISOString();
  const totalTime = focusTime + pauseTime + interruptionTime + awayTime;

  return {
    sessionId,
    focusTime: Math.round(focusTime),
    pauseTime: Math.round(pauseTime),
    interruptionTime: Math.round(interruptionTime),
    awayTime: Math.round(awayTime),
    totalTime: Math.round(totalTime),
    completionStatus,
    startedAt,
    endedAt,
  };
};

/**
 * Compute daily metrics from all events for a user today
 * Automatically groups events by session_id
 */
export const computeDailyMetrics = (events: SessionEvent[]): DailyMetrics => {
  // Group events by session_id
  const sessionMap = new Map<string, SessionEvent[]>();

  for (const event of events) {
    const sessionId = event.session_id;
    if (!sessionMap.has(sessionId)) {
      sessionMap.set(sessionId, []);
    }
    sessionMap.get(sessionId)!.push(event);
  }

  // Compute metrics for each session
  const sessionMetrics: SessionMetrics[] = [];
  for (const [, sessionEvents] of sessionMap) {
    // computeSessionMetrics now handles sorting internally
    const metrics = computeSessionMetrics(sessionEvents);
    if (metrics) {
      sessionMetrics.push(metrics);
    }
  }

  // Aggregate all sessions
  let totalFocusTime = 0;
  let totalPauseTime = 0;
  let totalInterruptionTime = 0;
  let totalAwayTime = 0;

  for (const metrics of sessionMetrics) {
    totalFocusTime += metrics.focusTime;
    totalPauseTime += metrics.pauseTime;
    totalInterruptionTime += metrics.interruptionTime;
    totalAwayTime += metrics.awayTime;
  }

  const lostTime = totalInterruptionTime + totalAwayTime;
  const totalTime = totalFocusTime + totalPauseTime + totalInterruptionTime + totalAwayTime;

  // Calculate discipline score: focus / total engagement
  const disciplineDenominator = totalFocusTime + totalPauseTime + totalAwayTime + totalInterruptionTime;
  const disciplineScore = disciplineDenominator > 0
    ? Math.round((totalFocusTime / disciplineDenominator) * 100)
    : 0;

  const avgSessionDuration = sessionMetrics.length > 0
    ? Math.round((totalTime / sessionMetrics.length) / 60)
    : 0;

  return {
    focusTime: totalFocusTime,
    pauseTime: totalPauseTime,
    interruptionTime: totalInterruptionTime,
    awayTime: totalAwayTime,
    lostTime,
    totalTime,
    disciplineScore,
    sessionsCount: sessionMetrics.length,
    avgSessionDuration,
  };
};

/**
 * Format seconds to human-readable duration (HH:MM:SS or MM:SS)
 */
export const formatDurationSeconds = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${secs}s`;
};

/**
 * Format percentage with optional decimal places
 */
export const formatPercentage = (value: number, decimals: number = 0): string => {
  return `${Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)}%`;
};
