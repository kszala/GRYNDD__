import supabase from '../supabaseClient';

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

const isCleanAnalyticsSession = (session: {
  start_time?: string | null;
  end_time?: string | null;
  actual_duration_seconds?: number | null;
  completion_status?: string | null;
}) => {
  return Boolean(
    session?.start_time &&
    session?.end_time &&
    session?.completion_status &&
    (session?.actual_duration_seconds || 0) > 0
  );
};

function formatHour(hour: number): string {
  const hourNum = hour % 24;
  const suffix = hourNum >= 12 ? 'PM' : 'AM';
  const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
  return `${displayHour}:00 ${suffix}`;
}

function getMinutesUntilHour(targetHour: number): number {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();

  let hourDiff = targetHour - currentHour;
  if (hourDiff <= 0) {
    hourDiff += 24;
  }

  return hourDiff * 60 - currentMinutes;
}

export async function getPeakFocusWindow(userId: string): Promise<PeakFocusWindow> {
  try {
    const { data, error } = await supabase
      .from('focus_patterns')
      .select('hour_of_day, peak_focus_score, session_count')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return {
        peakHour: 9,
        peakHourLabel: '9:00 AM',
        minutesUntilPeak: 0,
        avgFocusScore: 0,
        confidence: 'low',
      };
    }

    const hourlyStats: { [key: number]: { totalScore: number; count: number; sessionCount: number } } = {};

    data.forEach((pattern: any) => {
      const hour = pattern.hour_of_day;
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = { totalScore: 0, count: 0, sessionCount: 0 };
      }
      hourlyStats[hour].totalScore += pattern.peak_focus_score || 0;
      hourlyStats[hour].count += 1;
      hourlyStats[hour].sessionCount += pattern.session_count || 0;
    });

    let peakHour = 9;
    let maxAvgScore = 0;
    let totalSessions = 0;

    Object.entries(hourlyStats).forEach(([hour, stats]) => {
      const avgScore = stats.count > 0 ? stats.totalScore / stats.count : 0;
      totalSessions += stats.sessionCount;
      if (avgScore > maxAvgScore) {
        maxAvgScore = avgScore;
        peakHour = parseInt(hour, 10);
      }
    });

    const avgFocusScore = maxAvgScore;
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (totalSessions > 15) confidence = 'high';
    else if (totalSessions >= 5) confidence = 'medium';

    return {
      peakHour,
      peakHourLabel: formatHour(peakHour),
      minutesUntilPeak: getMinutesUntilHour(peakHour),
      avgFocusScore: Math.round(avgFocusScore * 100) / 100,
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
    const { data, error } = await supabase
      .from('session_analytics')
      .select('start_time, end_time, actual_duration_seconds, completion_status')
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return {
        avgMinutes: 0,
        avgBeforeQuit: 0,
        longestSession: 0,
        shortestSession: 0,
      };
    }

    const completed: number[] = [];
    const incomplete: number[] = [];
    let longest = 0;
    let shortest = Infinity;

    data.filter(isCleanAnalyticsSession).forEach((session: any) => {
      const durationSeconds = session.actual_duration_seconds || 0;
      const durationMinutes = durationSeconds / 60;

      if (session.completion_status === 'completed') {
        completed.push(durationMinutes);
      } else if (session.completion_status === 'interrupted') {
        incomplete.push(durationMinutes);
      }

      longest = Math.max(longest, durationMinutes);
      if (durationSeconds > 60) {
        shortest = Math.min(shortest, durationMinutes);
      }
    });

    const avgMinutes = completed.length > 0 ? completed.reduce((a, b) => a + b, 0) / completed.length : 0;
    const avgBeforeQuit = incomplete.length > 0 ? incomplete.reduce((a, b) => a + b, 0) / incomplete.length : 0;

    return {
      avgMinutes: Math.round(avgMinutes * 100) / 100,
      avgBeforeQuit: Math.round(avgBeforeQuit * 100) / 100,
      longestSession: Math.round(longest * 100) / 100,
      shortestSession: shortest === Infinity ? 0 : Math.round(shortest * 100) / 100,
    };
  } catch {
    return {
      avgMinutes: 0,
      avgBeforeQuit: 0,
      longestSession: 0,
      shortestSession: 0,
    };
  }
}

export async function getSubjectAbandonmentRate(userId: string): Promise<SubjectAbandonment[]> {
  try {
    const { data, error } = await supabase
      .from('session_analytics')
      .select(
        `
        start_time,
        end_time,
        subject_id,
        completion_status,
        actual_duration_seconds,
        subjects (
          name
        )
      `
      )
      .eq('user_id', userId);

    if (error || !data || data.length === 0) {
      return [];
    }

    const subjectStats: {
      [key: string]: {
        name: string;
        totalSessions: number;
        abandonedSessions: number;
        abandonDurations: number[];
      };
    } = {};

    data.filter(isCleanAnalyticsSession).forEach((session: any) => {
      const subjectName = session.subjects?.name || 'Unknown';
      const subjectId = session.subject_id;

      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = {
          name: subjectName,
          totalSessions: 0,
          abandonedSessions: 0,
          abandonDurations: [],
        };
      }

      subjectStats[subjectId].totalSessions += 1;

      if (session.completion_status === 'interrupted' || session.completion_status === 'abandoned') {
        subjectStats[subjectId].abandonedSessions += 1;
        subjectStats[subjectId].abandonDurations.push(session.actual_duration_seconds || 0);
      }
    });

    const result: SubjectAbandonment[] = Object.values(subjectStats).map((stat) => {
      const abandonmentRate = (stat.abandonedSessions / stat.totalSessions) * 100;
      const avgTimeBeforeAbandon =
        stat.abandonDurations.length > 0
          ? stat.abandonDurations.reduce((a, b) => a + b, 0) / stat.abandonDurations.length
          : 0;

      return {
        subjectName: stat.name,
        totalSessions: stat.totalSessions,
        abandonedSessions: stat.abandonedSessions,
        abandonmentRate: Math.round(abandonmentRate * 100) / 100,
        avgTimeBeforeAbandon: Math.round((avgTimeBeforeAbandon / 60) * 100) / 100,
      };
    });

    return result.sort((a, b) => b.abandonmentRate - a.abandonmentRate);
  } catch {
    return [];
  }
}

export async function getPausePatterns(userId: string): Promise<PausePatterns> {
  try {
    const { data, error } = await supabase
      .from('session_analytics')
      .select(
        `
        end_time,
        pause_count,
        total_pause_duration_seconds,
        start_time,
        subject_id,
        subjects (
          name
        ),
        created_at
      `
      )
      .eq('user_id', userId)
      .gt('pause_count', 0);

    if (error || !data || data.length === 0) {
      return {
        avgPausesPerSession: 0,
        avgPauseDurationSeconds: 0,
        mostPausedHour: 9,
        mostPausedSubject: 'Unknown',
        pauseTrend: 'stable',
      };
    }

    const cleanData = data.filter(isCleanAnalyticsSession);
    if (cleanData.length === 0) {
      return {
        avgPausesPerSession: 0,
        avgPauseDurationSeconds: 0,
        mostPausedHour: 9,
        mostPausedSubject: 'Unknown',
        pauseTrend: 'stable',
      };
    }

    const pauseCounts = cleanData.map((s: any) => s.pause_count || 0);
    const avgPausesPerSession = pauseCounts.reduce((a, b) => a + b, 0) / pauseCounts.length;

    const pauseDurations = cleanData
      .filter((s: any) => s.pause_count > 0)
      .map((s: any) => (s.total_pause_duration_seconds || 0) / (s.pause_count || 1));
    const avgPauseDurationSeconds =
      pauseDurations.length > 0 ? pauseDurations.reduce((a, b) => a + b, 0) / pauseDurations.length : 0;

    const hourlyPauseStats: { [key: number]: number[] } = {};
    cleanData.forEach((session: any) => {
      const hour = new Date(session.start_time).getHours();
      if (!hourlyPauseStats[hour]) {
        hourlyPauseStats[hour] = [];
      }
      hourlyPauseStats[hour].push(session.pause_count || 0);
    });

    let mostPausedHour = 9;
    let maxAvgPauseCount = 0;
    Object.entries(hourlyPauseStats).forEach(([hour, counts]) => {
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg > maxAvgPauseCount) {
        maxAvgPauseCount = avg;
        mostPausedHour = parseInt(hour, 10);
      }
    });

    const subjectPauseStats: { [key: string]: number[] } = {};
    cleanData.forEach((session: any) => {
      const subjectName = session.subjects?.name || 'Unknown';
      if (!subjectPauseStats[subjectName]) {
        subjectPauseStats[subjectName] = [];
      }
      subjectPauseStats[subjectName].push(session.pause_count || 0);
    });

    let mostPausedSubject = 'Unknown';
    let maxSubjectAvgPauses = 0;
    Object.entries(subjectPauseStats).forEach(([subject, counts]) => {
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg > maxSubjectAvgPauses) {
        maxSubjectAvgPauses = avg;
        mostPausedSubject = subject;
      }
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const lastSevenDays = cleanData.filter((s: any) => new Date(s.created_at) >= sevenDaysAgo);
    const priorSevenDays = cleanData.filter((s: any) => new Date(s.created_at) >= fourteenDaysAgo && new Date(s.created_at) < sevenDaysAgo);

    const lastSevenAvg = lastSevenDays.length > 0 ? lastSevenDays.reduce((sum, s: any) => sum + (s.pause_count || 0), 0) / lastSevenDays.length : 0;
    const priorSevenAvg = priorSevenDays.length > 0 ? priorSevenDays.reduce((sum, s: any) => sum + (s.pause_count || 0), 0) / priorSevenDays.length : 0;

    let pauseTrend: 'improving' | 'worsening' | 'stable' = 'stable';
    if (priorSevenAvg > 0) {
      const percentChange = ((lastSevenAvg - priorSevenAvg) / priorSevenAvg) * 100;
      if (percentChange > 10) {
        pauseTrend = 'worsening';
      } else if (percentChange < -10) {
        pauseTrend = 'improving';
      }
    }

    return {
      avgPausesPerSession: Math.round(avgPausesPerSession * 100) / 100,
      avgPauseDurationSeconds: Math.round(avgPauseDurationSeconds * 100) / 100,
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
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = todayStart;

    const { data: todayData, error: todayError } = await supabase
      .from('session_analytics')
      .select(
        `
        start_time,
        end_time,
        actual_duration_seconds,
        completion_status,
        productivity_score,
        subject_id,
        subjects (
          name
        )
      `
      )
      .eq('user_id', userId)
      .gte('start_time', todayStart.toISOString());

    const { data: yesterdayData, error: yesterdayError } = await supabase
      .from('session_analytics')
      .select('start_time, end_time, actual_duration_seconds, completion_status')
      .eq('user_id', userId)
      .gte('start_time', yesterdayStart.toISOString())
      .lt('start_time', yesterdayEnd.toISOString());

    if (todayError || !todayData) {
      return {
        todayFocusSeconds: 0,
        todaySessionCount: 0,
        todayCompletionRate: 0,
        todayAvgProductivity: 0,
        comparedToYesterday: 'same',
        bestSubjectToday: 'N/A',
      };
    }

    const cleanTodayData = todayData.filter(isCleanAnalyticsSession);
    const cleanYesterdayData = (yesterdayData || []).filter(isCleanAnalyticsSession);

    const todayFocusSeconds = cleanTodayData.reduce((sum, session: any) => sum + (session.actual_duration_seconds || 0), 0);
    const todaySessionCount = cleanTodayData.length;
    const completedSessions = cleanTodayData.filter((s: any) => s.completion_status === 'completed').length;
    const todayCompletionRate = todaySessionCount > 0 ? (completedSessions / todaySessionCount) * 100 : 0;

    const productivityScores = cleanTodayData.filter((s: any) => s.productivity_score !== null && s.productivity_score !== undefined).map((s: any) => s.productivity_score);
    const todayAvgProductivity = productivityScores.length > 0 ? productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length : 0;

    const subjectDurations: { [key: string]: number } = {};
    cleanTodayData.forEach((session: any) => {
      const subjectName = session.subjects?.name || 'Unknown';
      subjectDurations[subjectName] = (subjectDurations[subjectName] || 0) + (session.actual_duration_seconds || 0);
    });

    let bestSubjectToday = 'N/A';
    let maxDuration = 0;
    Object.entries(subjectDurations).forEach(([subject, duration]) => {
      if (duration > maxDuration) {
        maxDuration = duration;
        bestSubjectToday = subject;
      }
    });

    let comparedToYesterday: 'better' | 'worse' | 'same' = 'same';
    if (cleanYesterdayData.length > 0) {
      const yesterdayFocusSeconds = cleanYesterdayData.reduce((sum, session: any) => sum + (session.actual_duration_seconds || 0), 0);
      if (yesterdayFocusSeconds > 0) {
        const percentChange = ((todayFocusSeconds - yesterdayFocusSeconds) / yesterdayFocusSeconds) * 100;
        if (percentChange > 10) {
          comparedToYesterday = 'better';
        } else if (percentChange < -10) {
          comparedToYesterday = 'worse';
        }
      }
    }

    return {
      todayFocusSeconds,
      todaySessionCount,
      todayCompletionRate: Math.round(todayCompletionRate * 100) / 100,
      todayAvgProductivity: Math.round(todayAvgProductivity * 100) / 100,
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
