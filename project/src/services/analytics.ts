import { fetchSessionEvents, aggregateSessionsFromEvents } from './sessionEventAnalytics';

export interface SessionAnalyticsPoint {
  date: string;
  day: string;
  focusMinutes: number;
  interruptedMinutes: number;
}

export interface SubjectBreakdownItem {
  subject: string;
  totalSeconds: number;
  totalMinutes: number;
  sessions: number;
  completedSessions: number;
  completionRate: number;
  percentage: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
}

const startOfLocalDay = (date: Date): Date => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const shiftLocalDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export async function getSessionAnalytics(userId: string, days = 7): Promise<SessionAnalyticsPoint[]> {
  try {
    const today = startOfLocalDay(new Date());
    const since = shiftLocalDays(today, -(days - 1));

    const rows = await fetchSessionEvents(userId, since.toISOString());
    const sessions = aggregateSessionsFromEvents(rows);
    const byDay: Record<string, SessionAnalyticsPoint> = {};

    for (let offset = 0; offset < days; offset += 1) {
      const current = shiftLocalDays(since, offset);
      const key = toLocalDateKey(current);
      byDay[key] = {
        date: key,
        day: current.toLocaleDateString('en-IN', { weekday: 'short' }),
        focusMinutes: 0,
        interruptedMinutes: 0,
      };
    }

    sessions.forEach((session) => {
      const key = toLocalDateKey(new Date(session.startedAt));
      if (!byDay[key]) return;

      byDay[key].focusMinutes += Math.round(session.focusSeconds / 60);
      if (session.completionStatus !== 'completed') {
        byDay[key].interruptedMinutes += Math.round(session.inactiveSeconds / 60);
      }
    });

    return Object.values(byDay);
  } catch {
    return [];
  }
}

export async function getFocusPatterns(userId: string) {
  try {
    const rows = await fetchSessionEvents(userId);
    const byHour = new Map<number, { focusSeconds: number; sessionIds: Set<string> }>();

    rows.forEach((row) => {
      if ((row.session_phase || '').toLowerCase() !== 'active') {
        return;
      }

      const hour = new Date(row.event_timestamp).getHours();
      const duration = typeof row.duration_since_last_event_seconds === 'number'
        ? Math.max(0, Math.floor(row.duration_since_last_event_seconds))
        : 0;
      const existing = byHour.get(hour) || { focusSeconds: 0, sessionIds: new Set<string>() };
      existing.focusSeconds += duration;
      existing.sessionIds.add(row.session_id);
      byHour.set(hour, existing);
    });

    return Array.from(byHour.entries())
      .map(([hour, value]) => ({
        hour_of_day: hour,
        peak_focus_score: Math.round(value.focusSeconds / Math.max(1, value.sessionIds.size)),
        session_count: value.sessionIds.size,
      }))
      .sort((a, b) => a.hour_of_day - b.hour_of_day);
  } catch {
    return [];
  }
}

export async function getBehavioralInsights(userId: string) {
  try {
    const rows = await fetchSessionEvents(userId);
    const sessions = aggregateSessionsFromEvents(rows);
    const completed = sessions.filter((session) => session.completionStatus === 'completed');
    const completionRate = sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0;
    const totalFocusSeconds = sessions.reduce((sum, session) => sum + session.focusSeconds, 0);
    return [
      {
        insight_type: 'event_first_summary',
        insight_data: {
          total_sessions: sessions.length,
          completed_sessions: completed.length,
          completion_rate: completionRate,
          total_focus_seconds: totalFocusSeconds,
        },
      },
    ];
  } catch {
    return [];
  }
}

export async function getSubjectBreakdown(userId: string): Promise<SubjectBreakdownItem[]> {
  try {
    const rows = await fetchSessionEvents(userId);
    const sessions = aggregateSessionsFromEvents(rows);
    const bySubject: Record<string, SubjectBreakdownItem> = {};

    sessions.forEach((session) => {
      const subject = session.subjectLabel || 'Unknown';
      if (!bySubject[subject]) {
        bySubject[subject] = {
          subject,
          totalSeconds: 0,
          totalMinutes: 0,
          sessions: 0,
          completedSessions: 0,
          completionRate: 0,
          percentage: 0,
        };
      }

      bySubject[subject].totalSeconds += session.focusSeconds;
      bySubject[subject].sessions += 1;
      if (session.completionStatus === 'completed') {
        bySubject[subject].completedSessions += 1;
      }
    });

    const items = Object.values(bySubject);
    const totalSeconds = items.reduce((sum, item) => sum + item.totalSeconds, 0);

    return items
      .map((item) => ({
        ...item,
        totalMinutes: Math.round(item.totalSeconds / 60),
        completionRate: item.sessions > 0 ? Math.round((item.completedSessions / item.sessions) * 100) : 0,
        percentage: totalSeconds > 0 ? Math.round((item.totalSeconds / totalSeconds) * 100) : 0,
      }))
      .sort((left, right) => right.totalSeconds - left.totalSeconds)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export async function getPeakHours(userId: string) {
  try {
    const rows = await fetchSessionEvents(userId);
    const byHour = new Map<number, number>();

    rows.forEach((row) => {
      if ((row.session_phase || '').toLowerCase() !== 'active') {
        return;
      }

      const hour = new Date(row.event_timestamp).getHours();
      const duration = typeof row.duration_since_last_event_seconds === 'number'
        ? Math.max(0, Math.floor(row.duration_since_last_event_seconds))
        : 0;
      byHour.set(hour, (byHour.get(hour) || 0) + duration);
    });

    return Array.from(byHour.entries())
      .map(([hour, focusTime]) => ({ hour_of_day: hour, peak_focus_score: focusTime, session_count: 1 }))
      .sort((a, b) => b.peak_focus_score - a.peak_focus_score)
      .slice(0, 3);
  } catch {
    return [];
  }
}

export async function getStreakData(userId: string): Promise<StreakData> {
  try {
    const rows = await fetchSessionEvents(userId);
    const sessions = aggregateSessionsFromEvents(rows).filter((session) => session.completionStatus === 'completed');
    if (sessions.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
    }

    const studyDays = Array.from(
      new Set(sessions.map((session) => toLocalDateKey(new Date(session.endedAt || session.startedAt))))
    ).sort();

    if (studyDays.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
    }

    const localToday = startOfLocalDay(new Date());
    const localYesterday = shiftLocalDays(localToday, -1);
    const newestDay = studyDays[studyDays.length - 1];

    let currentStreak = 0;
    if (newestDay === toLocalDateKey(localToday) || newestDay === toLocalDateKey(localYesterday)) {
      let cursor = new Date(newestDay);
      for (let index = studyDays.length - 1; index >= 0; index -= 1) {
        const expected = toLocalDateKey(cursor);
        if (studyDays[index] !== expected) {
          break;
        }
        currentStreak += 1;
        cursor = shiftLocalDays(cursor, -1);
      }
    }

    let longestStreak = 1;
    let runningStreak = 1;
    for (let index = 1; index < studyDays.length; index += 1) {
      const previous = new Date(studyDays[index - 1]);
      const current = new Date(studyDays[index]);
      const diffDays = Math.round((current.getTime() - previous.getTime()) / 86400000);

      if (diffDays === 1) {
        runningStreak += 1;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 1;
      }
    }

    return {
      currentStreak,
      longestStreak,
      totalStudyDays: studyDays.length,
    };
  } catch {
    return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
  }
}
