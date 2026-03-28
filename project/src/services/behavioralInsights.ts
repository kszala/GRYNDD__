import supabase from '../supabaseClient';

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

type BestHoursRow = {
  start_time: string | null;
  focus_score: number | null;
};

type InterruptionPatternsRow = {
  start_time: string | null;
  interruption_count: number | null;
};

type SubjectPerformanceRow = {
  subject_id: string | null;
  focus_score: number | null;
  adherence_score: number | null;
  active_focus_seconds: number | null;
};

export async function computeBestStudyHours(
  userId: string
): Promise<HourlyFocusInsight[]> {
  const { data, error } = await supabase
    .from('session_analytics')
    .select('start_time, focus_score')
    .eq('user_id', userId)
    .not('focus_score', 'is', null)
    .not('start_time', 'is', null);

  if (error || !data) {
    return [];
  }

  const hourMap = new Map<number, { total: number; count: number }>();

  for (const row of data as BestHoursRow[]) {
    if (!row.start_time || row.focus_score == null) {
      continue;
    }

    const hour = new Date(row.start_time).getUTCHours();
    const existing = hourMap.get(hour) ?? { total: 0, count: 0 };
    hourMap.set(hour, {
      total: existing.total + row.focus_score,
      count: existing.count + 1,
    });
  }

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
  const { data, error } = await supabase
    .from('session_analytics')
    .select('start_time, interruption_count')
    .eq('user_id', userId)
    .not('start_time', 'is', null);

  if (error || !data) {
    return [];
  }

  const hourMap = new Map<number, { totalInterruptions: number; count: number }>();

  for (const row of data as InterruptionPatternsRow[]) {
    if (!row.start_time) {
      continue;
    }

    const hour = new Date(row.start_time).getUTCHours();
    const interruptions = row.interruption_count ?? 0;
    const existing = hourMap.get(hour) ?? { totalInterruptions: 0, count: 0 };

    hourMap.set(hour, {
      totalInterruptions: existing.totalInterruptions + interruptions,
      count: existing.count + 1,
    });
  }

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
  const { data, error } = await supabase
    .from('session_analytics')
    .select('subject_id, focus_score, adherence_score, active_focus_seconds')
    .eq('user_id', userId)
    .not('subject_id', 'is', null);

  if (error || !data) {
    return [];
  }

  const subjectMap = new Map<string, {
    focusTotal: number;
    adherenceTotal: number;
    adherenceCount: number;
    activeTotal: number;
    count: number;
  }>();

  for (const row of data as SubjectPerformanceRow[]) {
    const id = row.subject_id ?? 'unknown';
    const existing = subjectMap.get(id) ?? {
      focusTotal: 0,
      adherenceTotal: 0,
      adherenceCount: 0,
      activeTotal: 0,
      count: 0,
    };

    subjectMap.set(id, {
      focusTotal: existing.focusTotal + (row.focus_score ?? 0),
      adherenceTotal: existing.adherenceTotal + (row.adherence_score ?? 0),
      adherenceCount: existing.adherenceCount + (row.adherence_score != null ? 1 : 0),
      activeTotal: existing.activeTotal + (row.active_focus_seconds ?? 0),
      count: existing.count + 1,
    });
  }

  return Array.from(subjectMap.entries())
    .map(([subjectId, subject]) => ({
      subjectId,
      avgFocusScore: Math.round(subject.focusTotal / subject.count),
      avgAdherenceScore: subject.adherenceCount > 0
        ? Math.round(subject.adherenceTotal / subject.adherenceCount)
        : 0,
      sessionCount: subject.count,
      totalActiveSeconds: subject.activeTotal,
    }))
    .sort((a, b) => b.avgFocusScore - a.avgFocusScore);
}
