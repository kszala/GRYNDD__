import { supabase } from '../supabaseClient';

type SessionAnalyticsRow = {
  start_time: string;
  end_time: string | null;
  actual_duration_seconds: number | null;
  completion_status: 'completed' | 'interrupted' | 'abandoned' | null;
  subject_id?: string | null;
  subjects?: { name?: string | null } | { name?: string | null }[] | null;
};

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

const getSubjectName = (subjects: SessionAnalyticsRow['subjects']): string => {
  if (Array.isArray(subjects)) {
    return subjects[0]?.name || 'Unknown';
  }

  return subjects?.name || 'Unknown';
};

const isCleanSession = (session: SessionAnalyticsRow): boolean => {
  if (!session.start_time) return false;
  if (!session.end_time) return false;
  if (!session.completion_status) return false;
  return (session.actual_duration_seconds || 0) > 0;
};

export async function getSessionAnalytics(userId: string, days = 7): Promise<SessionAnalyticsPoint[]> {
  try {
    const today = startOfLocalDay(new Date());
    const since = shiftLocalDays(today, -(days - 1));

    const { data, error } = await supabase
      .from('session_analytics')
      .select('start_time, end_time, actual_duration_seconds, completion_status')
      .eq('user_id', userId)
      .gte('start_time', since.toISOString())
      .order('start_time', { ascending: true });

    if (error || !data) return [];

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

    (data as SessionAnalyticsRow[])
      .filter(isCleanSession)
      .forEach((session) => {
        const key = toLocalDateKey(new Date(session.start_time));
        if (!byDay[key]) return;

        const minutes = Math.round((session.actual_duration_seconds || 0) / 60);
        if (session.completion_status === 'completed') {
          byDay[key].focusMinutes += minutes;
        } else {
          byDay[key].interruptedMinutes += minutes;
        }
      });

    return Object.values(byDay);
  } catch {
    return [];
  }
}

export async function getFocusPatterns(userId: string) {
  try {
    const { data, error } = await supabase
      .from('focus_patterns')
      .select('*')
      .eq('user_id', userId)
      .order('hour_of_day', { ascending: true });

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getBehavioralInsights(userId: string) {
  try {
    const { data, error } = await supabase
      .from('behavioral_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getSubjectBreakdown(userId: string): Promise<SubjectBreakdownItem[]> {
  try {
    const { data, error } = await supabase
      .from('session_analytics')
      .select('start_time, end_time, actual_duration_seconds, completion_status, subject_id, subjects(name)')
      .eq('user_id', userId)
      .not('subject_id', 'is', null);

    if (error || !data) return [];

    const bySubject: Record<string, SubjectBreakdownItem> = {};

    (data as SessionAnalyticsRow[])
      .filter(isCleanSession)
      .forEach((session) => {
        const subject = getSubjectName(session.subjects);
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

        bySubject[subject].totalSeconds += session.actual_duration_seconds || 0;
        bySubject[subject].sessions += 1;
        if (session.completion_status === 'completed') {
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
    const { data, error } = await supabase
      .from('focus_patterns')
      .select('hour_of_day, peak_focus_score, session_count')
      .eq('user_id', userId)
      .order('peak_focus_score', { ascending: false })
      .limit(3);

    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

export async function getStreakData(userId: string): Promise<StreakData> {
  try {
    const { data, error } = await supabase
      .from('session_analytics')
      .select('start_time, end_time, actual_duration_seconds, completion_status')
      .eq('user_id', userId)
      .eq('completion_status', 'completed')
      .order('start_time', { ascending: false });

    if (error || !data || data.length === 0) {
      return { currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
    }

    const studyDays = Array.from(
      new Set(
        (data as SessionAnalyticsRow[])
          .filter(isCleanSession)
          .map((session) => toLocalDateKey(new Date(session.start_time)))
      )
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
