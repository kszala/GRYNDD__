import { fetchSessionEvents, aggregateSessionsFromEvents } from './sessionEventAnalytics';

interface PeakFocusWindow {
  peakHour: number;
  peakHourLabel: string;
  minutesUntilPeak: number;
  avgFocusScore: number;
  confidence: 'high' | 'medium' | 'low';
}

interface SessionLengthMetrics {
  avgMinutes: number;
  avgBeforeQuit: number;
  longestSession: number;
  shortestSession: number;
}

interface SubjectAbandonment {
  subjectName: string;
  totalSessions: number;
  abandonedSessions: number;
  abandonmentRate: number;
  avgTimeBeforeAbandon: number;
}

interface PausePatterns {
  avgPausesPerSession: number;
  avgPauseDurationSeconds: number;
  mostPausedHour: number;
  mostPausedSubject: string;
  pauseTrend: 'improving' | 'worsening' | 'stable';
}

interface DailyBehaviorSummary {
  todayFocusSeconds: number;
  todaySessionCount: number;
  todayCompletionRate: number;
  todayAvgProductivity: number;
  comparedToYesterday: 'better' | 'worse' | 'same';
  bestSubjectToday: string;
}

const formatHour = (hour: number): string => {
  const hourNum = hour % 24;
  const suffix = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${displayHour}:00 ${suffix}`;
};

const getMinutesUntilHour = (targetHour: number): number => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  let hourDiff = targetHour - currentHour;
  if (hourDiff <= 0) {
    hourDiff += 24;
  }

  return hourDiff * 60 - currentMinutes;
};

const toDateKey = (value: Date) => {
  const y = value.getFullYear();
  const m = `${value.getMonth() + 1}`.padStart(2, '0');
  const d = `${value.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const focusScore = (focusSeconds: number, inactiveSeconds: number) => {
  const total = focusSeconds + inactiveSeconds;
  if (total <= 0) return 0;
  return Number((focusSeconds / total).toFixed(2));
};

export async function getPeakFocusWindow(userId: string): Promise<PeakFocusWindow> {
  try {
    const rows = await fetchSessionEvents(userId);
    const sessions = aggregateSessionsFromEvents(rows);
    if (!sessions.length) {
      return {
        peakHour: 9,
        peakHourLabel: '9:00 AM',
        minutesUntilPeak: 0,
        avgFocusScore: 0,
        confidence: 'low',
      };
    }

    const hourlyStats = new Map<number, { totalScore: number; count: number }>();
    sessions.forEach((session) => {
      const hour = new Date(session.startedAt).getHours();
      const score = focusScore(session.focusSeconds, session.inactiveSeconds);
      const existing = hourlyStats.get(hour) || { totalScore: 0, count: 0 };
      existing.totalScore += score;
      existing.count += 1;
      hourlyStats.set(hour, existing);
    });

    let peakHour = 9;
    let maxAvgScore = 0;
    hourlyStats.forEach((stats, hour) => {
      const avg = stats.totalScore / Math.max(1, stats.count);
      if (avg > maxAvgScore) {
        maxAvgScore = avg;
        peakHour = hour;
      }
    });

    const confidence: PeakFocusWindow['confidence'] =
      sessions.length > 15 ? 'high' : sessions.length >= 5 ? 'medium' : 'low';

    return {
      peakHour,
      peakHourLabel: formatHour(peakHour),
      minutesUntilPeak: getMinutesUntilHour(peakHour),
      avgFocusScore: Number(maxAvgScore.toFixed(2)),
      confidence,
    };
  } catch {
    return {
      peakHour: 9,
      peakHourLabel: '9:00 AM',
      minutesUntilPeak: 0,
      avgFocusScore: 0,
      confidence: 'low',
    };
  }
}

export async function getAverageSessionLength(userId: string): Promise<SessionLengthMetrics> {
  try {
    const sessions = aggregateSessionsFromEvents(await fetchSessionEvents(userId));
    if (!sessions.length) {
      return { avgMinutes: 0, avgBeforeQuit: 0, longestSession: 0, shortestSession: 0 };
    }

    const completedMinutes = sessions
      .filter((session) => session.completionStatus === 'completed')
      .map((session) => session.focusSeconds / 60);
    const incompleteMinutes = sessions
      .filter((session) => session.completionStatus !== 'completed')
      .map((session) => session.focusSeconds / 60);
    const allMinutes = sessions.map((session) => session.focusSeconds / 60).filter((minutes) => minutes > 0);

    const avgMinutes = completedMinutes.length
      ? completedMinutes.reduce((sum, value) => sum + value, 0) / completedMinutes.length
      : 0;
    const avgBeforeQuit = incompleteMinutes.length
      ? incompleteMinutes.reduce((sum, value) => sum + value, 0) / incompleteMinutes.length
      : 0;
    const longestSession = allMinutes.length ? Math.max(...allMinutes) : 0;
    const shortestSession = allMinutes.length ? Math.min(...allMinutes) : 0;

    return {
      avgMinutes: Number(avgMinutes.toFixed(2)),
      avgBeforeQuit: Number(avgBeforeQuit.toFixed(2)),
      longestSession: Number(longestSession.toFixed(2)),
      shortestSession: Number(shortestSession.toFixed(2)),
    };
  } catch {
    return { avgMinutes: 0, avgBeforeQuit: 0, longestSession: 0, shortestSession: 0 };
  }
}

export async function getSubjectAbandonmentRate(userId: string): Promise<SubjectAbandonment[]> {
  try {
    const sessions = aggregateSessionsFromEvents(await fetchSessionEvents(userId));
    const stats = new Map<string, {
      totalSessions: number;
      abandonedSessions: number;
      abandonDurations: number[];
    }>();

    sessions.forEach((session) => {
      const key = session.subjectLabel || 'Unknown';
      const current = stats.get(key) || { totalSessions: 0, abandonedSessions: 0, abandonDurations: [] };
      current.totalSessions += 1;

      if (session.completionStatus !== 'completed') {
        current.abandonedSessions += 1;
        current.abandonDurations.push(session.focusSeconds);
      }

      stats.set(key, current);
    });

    return Array.from(stats.entries())
      .map(([subjectName, stat]) => {
        const abandonmentRate = stat.totalSessions > 0 ? (stat.abandonedSessions / stat.totalSessions) * 100 : 0;
        const avgTimeBeforeAbandon = stat.abandonDurations.length
          ? stat.abandonDurations.reduce((sum, value) => sum + value, 0) / stat.abandonDurations.length
          : 0;

        return {
          subjectName,
          totalSessions: stat.totalSessions,
          abandonedSessions: stat.abandonedSessions,
          abandonmentRate: Number(abandonmentRate.toFixed(2)),
          avgTimeBeforeAbandon: Number((avgTimeBeforeAbandon / 60).toFixed(2)),
        };
      })
      .sort((a, b) => b.abandonmentRate - a.abandonmentRate);
  } catch {
    return [];
  }
}

export async function getPausePatterns(userId: string): Promise<PausePatterns> {
  try {
    const sessions = aggregateSessionsFromEvents(await fetchSessionEvents(userId));
    if (!sessions.length) {
      return {
        avgPausesPerSession: 0,
        avgPauseDurationSeconds: 0,
        mostPausedHour: 9,
        mostPausedSubject: 'Unknown',
        pauseTrend: 'stable',
      };
    }

    const avgPausesPerSession = sessions.reduce((sum, session) => sum + session.pauseCount, 0) / sessions.length;
    const avgPauseDurationSeconds = sessions.reduce((sum, session) => sum + session.inactiveSeconds, 0) / sessions.length;

    const byHour = new Map<number, number>();
    const bySubject = new Map<string, number>();
    sessions.forEach((session) => {
      const hour = new Date(session.startedAt).getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + session.pauseCount);
      bySubject.set(session.subjectLabel, (bySubject.get(session.subjectLabel) || 0) + session.pauseCount);
    });

    const mostPausedHour = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 9;
    const mostPausedSubject = Array.from(bySubject.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown';

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const lastSeven = sessions.filter((session) => new Date(session.startedAt) >= sevenDaysAgo);
    const priorSeven = sessions.filter((session) => {
      const startedAt = new Date(session.startedAt);
      return startedAt >= fourteenDaysAgo && startedAt < sevenDaysAgo;
    });

    const lastSevenAvg = lastSeven.length
      ? lastSeven.reduce((sum, session) => sum + session.pauseCount, 0) / lastSeven.length
      : 0;
    const priorSevenAvg = priorSeven.length
      ? priorSeven.reduce((sum, session) => sum + session.pauseCount, 0) / priorSeven.length
      : 0;

    let pauseTrend: PausePatterns['pauseTrend'] = 'stable';
    if (priorSevenAvg > 0) {
      const change = ((lastSevenAvg - priorSevenAvg) / priorSevenAvg) * 100;
      if (change > 10) pauseTrend = 'worsening';
      else if (change < -10) pauseTrend = 'improving';
    }

    return {
      avgPausesPerSession: Number(avgPausesPerSession.toFixed(2)),
      avgPauseDurationSeconds: Number(avgPauseDurationSeconds.toFixed(2)),
      mostPausedHour,
      mostPausedSubject,
      pauseTrend,
    };
  } catch {
    return {
      avgPausesPerSession: 0,
      avgPauseDurationSeconds: 0,
      mostPausedHour: 9,
      mostPausedSubject: 'Unknown',
      pauseTrend: 'stable',
    };
  }
}

export async function getDailyBehaviorSummary(userId: string): Promise<DailyBehaviorSummary> {
  try {
    const sessions = aggregateSessionsFromEvents(await fetchSessionEvents(userId));
    const today = new Date();
    const todayKey = toDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKey(yesterday);

    const todaySessions = sessions.filter((session) => toDateKey(new Date(session.startedAt)) === todayKey);
    const yesterdaySessions = sessions.filter((session) => toDateKey(new Date(session.startedAt)) === yesterdayKey);

    const todayFocusSeconds = todaySessions.reduce((sum, session) => sum + session.focusSeconds, 0);
    const completedToday = todaySessions.filter((session) => session.completionStatus === 'completed').length;
    const todaySessionCount = todaySessions.length;
    const todayCompletionRate = todaySessionCount ? (completedToday / todaySessionCount) * 100 : 0;
    const todayAvgProductivity = todaySessionCount
      ? todaySessions.reduce((sum, session) => sum + focusScore(session.focusSeconds, session.inactiveSeconds), 0) / todaySessionCount
      : 0;

    const subjectDurations = new Map<string, number>();
    todaySessions.forEach((session) => {
      subjectDurations.set(session.subjectLabel, (subjectDurations.get(session.subjectLabel) || 0) + session.focusSeconds);
    });
    const bestSubjectToday = Array.from(subjectDurations.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    const yesterdayFocusSeconds = yesterdaySessions.reduce((sum, session) => sum + session.focusSeconds, 0);
    let comparedToYesterday: DailyBehaviorSummary['comparedToYesterday'] = 'same';
    if (yesterdayFocusSeconds > 0) {
      const percentChange = ((todayFocusSeconds - yesterdayFocusSeconds) / yesterdayFocusSeconds) * 100;
      if (percentChange > 10) comparedToYesterday = 'better';
      else if (percentChange < -10) comparedToYesterday = 'worse';
    }

    return {
      todayFocusSeconds,
      todaySessionCount,
      todayCompletionRate: Number(todayCompletionRate.toFixed(2)),
      todayAvgProductivity: Number(todayAvgProductivity.toFixed(2)),
      comparedToYesterday,
      bestSubjectToday,
    };
  } catch {
    return {
      todayFocusSeconds: 0,
      todaySessionCount: 0,
      todayCompletionRate: 0,
      todayAvgProductivity: 0,
      comparedToYesterday: 'same',
      bestSubjectToday: 'N/A',
    };
  }
}
