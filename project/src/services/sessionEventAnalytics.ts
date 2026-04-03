import supabase from '../supabaseClient';

export type SessionEventRow = {
  session_id: string;
  event_type: string;
  event_timestamp: string;
  duration_since_last_event_seconds: number | null;
  session_phase: string | null;
  metadata: Record<string, unknown> | null;
};

export type SessionAggregate = {
  sessionId: string;
  startedAt: string;
  endedAt: string;
  completionStatus: 'completed' | 'interrupted' | 'abandoned';
  focusSeconds: number;
  inactiveSeconds: number;
  pauseCount: number;
  interruptionCount: number;
  subjectLabel: string;
};

const roundDuration = (value: unknown) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
};

const getSubjectLabel = (metadata: Record<string, unknown> | null) => {
  if (!metadata) {
    return 'Unknown';
  }

  const candidate = metadata.subject;
  if (typeof candidate === 'string' && candidate.trim()) {
    return candidate.trim();
  }

  return 'Unknown';
};

export const fetchSessionEvents = async (
  userId: string,
  fromIso?: string,
  toIso?: string
): Promise<SessionEventRow[]> => {
  let query = supabase
    .from('session_events')
    .select('session_id, event_type, event_timestamp, duration_since_last_event_seconds, session_phase, metadata')
    .eq('user_id', userId)
    .order('event_timestamp', { ascending: true })
    .order('event_sequence', { ascending: true });

  if (fromIso) {
    query = query.gte('event_timestamp', fromIso);
  }

  if (toIso) {
    query = query.lte('event_timestamp', toIso);
  }

  const { data, error } = await query;
  if (error || !data) {
    return [];
  }

  return data as SessionEventRow[];
};

export const aggregateSessionsFromEvents = (rows: SessionEventRow[]): SessionAggregate[] => {
  const bySession = new Map<string, SessionAggregate>();

  for (const row of rows) {
    const existing = bySession.get(row.session_id);
    const duration = roundDuration(row.duration_since_last_event_seconds);
    const phase = (row.session_phase || '').toLowerCase();
    const eventType = (row.event_type || '').toLowerCase();

    const current = existing || {
      sessionId: row.session_id,
      startedAt: row.event_timestamp,
      endedAt: row.event_timestamp,
      completionStatus: 'abandoned' as const,
      focusSeconds: 0,
      inactiveSeconds: 0,
      pauseCount: 0,
      interruptionCount: 0,
      subjectLabel: getSubjectLabel(row.metadata),
    };

    current.endedAt = row.event_timestamp;
    if (!current.subjectLabel || current.subjectLabel === 'Unknown') {
      current.subjectLabel = getSubjectLabel(row.metadata);
    }

    if (phase === 'active') {
      current.focusSeconds += duration;
    } else if (phase === 'inactive' || phase === 'reflection') {
      current.inactiveSeconds += duration;
    }

    if (eventType === 'pause') {
      current.pauseCount += 1;
    }

    if (eventType === 'interrupt') {
      current.interruptionCount += 1;
      current.completionStatus = 'interrupted';
    }

    if (eventType === 'complete') {
      current.completionStatus = 'completed';
    } else if (eventType === 'abandon' && current.completionStatus !== 'completed') {
      current.completionStatus = 'abandoned';
    }

    bySession.set(row.session_id, current);
  }

  return Array.from(bySession.values());
};
