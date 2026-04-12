/** Row shape from `attention_blocks` (Supabase). */
export interface AttentionBlockRow {
  start_time: string;
  end_time: string | null;
  state: string;
  metadata?: Record<string, unknown> | null;
}

export interface FocusSessionSlice {
  duration: number;
  start: string;
}

export interface BehaviorAnalysis {
  focusSessions: FocusSessionSlice[];
  avgFocusDuration: number | null;
  dropPoints: number[];
  distractionTriggers: Array<string | undefined>;
}

const FOCUS_ACTIVE = 'FOCUS_ACTIVE';

function sortBlocks(blocks: AttentionBlockRow[]): AttentionBlockRow[] {
  return [...blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );
}

/**
 * Duration of a block in seconds. Open blocks use `nowMs` (default: Date.now()).
 */
export function getDuration(block: AttentionBlockRow, nowMs: number = Date.now()): number {
  const start = new Date(block.start_time).getTime();
  const end = block.end_time ? new Date(block.end_time).getTime() : nowMs;
  if (end <= start) return 0;
  return (end - start) / 1000;
}

export function detectFocusSessions(blocks: AttentionBlockRow[]): FocusSessionSlice[] {
  const sorted = sortBlocks(blocks);
  return sorted
    .filter((b) => b.state === FOCUS_ACTIVE)
    .map((b) => ({
      duration: getDuration(b),
      start: b.start_time,
    }));
}

export function getAvgFocusDuration(blocks: AttentionBlockRow[]): number | null {
  const sessions = detectFocusSessions(blocks);
  if (sessions.length === 0) return null;
  const total = sessions.reduce((sum, s) => sum + s.duration, 0);
  return total / sessions.length;
}

export function detectDropPoints(blocks: AttentionBlockRow[]): number[] {
  const sorted = sortBlocks(blocks);
  const drops: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    if (prev.state === FOCUS_ACTIVE && (curr.state === 'IDLE' || curr.state === 'AWAY')) {
      drops.push(getDuration(prev));
    }
  }

  return drops;
}

export function detectDistractions(blocks: AttentionBlockRow[]): Array<string | undefined> {
  return sortBlocks(blocks)
    .filter((b) => b.state === 'AWAY')
    .map((b) => {
      const reason = b.metadata?.reason;
      return typeof reason === 'string' ? reason : undefined;
    });
}

export function analyzeBehavior(blocks: AttentionBlockRow[]): BehaviorAnalysis {
  const sorted = sortBlocks(blocks);
  return {
    focusSessions: detectFocusSessions(sorted),
    avgFocusDuration: getAvgFocusDuration(sorted),
    dropPoints: detectDropPoints(sorted),
    distractionTriggers: detectDistractions(sorted),
  };
}

/** Median of positive finite numbers; empty → null */
export function medianSeconds(values: number[]): number | null {
  const nums = values.filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function formatRoundedMinutes(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const m = Math.round(seconds / 60);
  return `${m}`;
}

/** Labeled distraction reasons only; picks highest frequency (stable tie-break: lexicographic). */
export function getTopDistractionReason(triggers: Array<string | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const t of triggers) {
    if (t == null || t.trim() === '') continue;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: string | null = null;
  let bestCount = -1;
  for (const [label, c] of counts) {
    if (c > bestCount || (c === bestCount && best !== null && label.localeCompare(best) < 0)) {
      best = label;
      bestCount = c;
    }
  }
  return best;
}

export function getBestFocusSessionSecondsToday(
  blocks: AttentionBlockRow[],
  now: Date = new Date()
): number | null {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const startMs = startOfDay.getTime();
  const endMs = endOfDay.getTime();

  const sessions = detectFocusSessions(blocks);
  let best: number | null = null;

  for (const s of sessions) {
    const t = new Date(s.start).getTime();
    if (t >= startMs && t <= endMs) {
      if (best === null || s.duration > best) best = s.duration;
    }
  }

  return best;
}
