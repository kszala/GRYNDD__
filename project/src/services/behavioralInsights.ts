import { fetchSessionEvents, aggregateSessionsFromEvents } from './sessionEventAnalytics';

export interface HourlyFocusInsight {
  hour: number;
  avgFocusScore: number;
  sessionCount: number;
}

export interface InterruptionPatternInsight {
  hour: number;
  totalInterruptions: number;
  sessionCount: number;
  avgInterruptionsPerSession: number;
}

export interface SubjectPerformanceInsight {
  subjectId: string;
  avgFocusScore: number;
  avgAdherenceScore: number;
  sessionCount: number;
  totalActiveSeconds: number;
}

const buildFocusScore = (focusSeconds: number, inactiveSeconds: number) => {
  const total = focusSeconds + inactiveSeconds;
  if (total <= 0) {
    return 0;
  }

  return Math.round((focusSeconds / total) * 100);
};

const buildAdherenceScore = (focusSeconds: number, inactiveSeconds: number) => {
  const total = focusSeconds + inactiveSeconds;
  if (total <= 0) {
    return 0;
  }

  return Math.round((1 - Math.min(1, inactiveSeconds / total)) * 100);
};

export async function computeBestStudyHours(
  userId: string
): Promise<HourlyFocusInsight[]> {
  const events = await fetchSessionEvents(userId);
  if (!events.length) {
    return [];
  }

  const hourMap = new Map<number, { total: number; count: number }>();
  const sessions = aggregateSessionsFromEvents(events);

  sessions.forEach((session) => {
    const hour = new Date(session.startedAt).getUTCHours();
    const score = buildFocusScore(session.focusSeconds, session.inactiveSeconds);
    const existing = hourMap.get(hour) ?? { total: 0, count: 0 };
    hourMap.set(hour, {
      total: existing.total + score,
      count: existing.count + 1,
    });
  });

  return Array.from(hourMap.entries())
    .map(([hour, { total, count }]) => ({
      hour,
      avgFocusScore: Math.round(total / count),
      sessionCount: count,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export async function computeInterruptionPatterns(
  userId: string
): Promise<InterruptionPatternInsight[]> {
  const events = await fetchSessionEvents(userId);
  if (!events.length) {
    return [];
  }

  const hourMap = new Map<number, { totalInterruptions: number; count: number }>();
  const sessions = aggregateSessionsFromEvents(events);

  sessions.forEach((session) => {
    const hour = new Date(session.startedAt).getUTCHours();
    const existing = hourMap.get(hour) ?? { totalInterruptions: 0, count: 0 };
    hourMap.set(hour, {
      totalInterruptions: existing.totalInterruptions + session.interruptionCount,
      count: existing.count + 1,
    });
  });

  return Array.from(hourMap.entries())
    .map(([hour, { totalInterruptions, count }]) => ({
      hour,
      totalInterruptions,
      sessionCount: count,
      avgInterruptionsPerSession: Math.round((totalInterruptions / count) * 10) / 10,
    }))
    .sort((a, b) => a.hour - b.hour);
}

export async function computeSubjectPerformance(
  userId: string
): Promise<SubjectPerformanceInsight[]> {
  const events = await fetchSessionEvents(userId);
  if (!events.length) {
    return [];
  }

  const sessions = aggregateSessionsFromEvents(events);
  const subjectMap = new Map<string, {
    focusTotal: number;
    adherenceTotal: number;
    activeTotal: number;
    count: number;
  }>();

  sessions.forEach((session) => {
    const id = session.subjectLabel || 'unknown';
    const existing = subjectMap.get(id) ?? {
      focusTotal: 0,
      adherenceTotal: 0,
      activeTotal: 0,
      count: 0,
    };

    subjectMap.set(id, {
      focusTotal: existing.focusTotal + buildFocusScore(session.focusSeconds, session.inactiveSeconds),
      adherenceTotal: existing.adherenceTotal + buildAdherenceScore(session.focusSeconds, session.inactiveSeconds),
      activeTotal: existing.activeTotal + session.focusSeconds,
      count: existing.count + 1,
    });
  });

  return Array.from(subjectMap.entries())
    .map(([subjectId, subject]) => ({
      subjectId,
      avgFocusScore: Math.round(subject.focusTotal / subject.count),
      avgAdherenceScore: Math.round(subject.adherenceTotal / subject.count),
      sessionCount: subject.count,
      totalActiveSeconds: subject.activeTotal,
    }))
    .sort((a, b) => b.avgFocusScore - a.avgFocusScore);
}
