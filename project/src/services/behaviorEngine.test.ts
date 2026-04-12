import { describe, expect, it } from 'vitest';
import {
  analyzeBehavior,
  detectDropPoints,
  detectFocusSessions,
  getAvgFocusDuration,
  getBestFocusSessionSecondsToday,
  getDuration,
  getTopDistractionReason,
  medianSeconds,
  type AttentionBlockRow,
} from './behaviorEngine';

const row = (
  start: string,
  end: string | null,
  state: string,
  metadata?: Record<string, unknown> | null
): AttentionBlockRow => ({ start_time: start, end_time: end, state, metadata });

describe('getDuration', () => {
  it('returns seconds for a closed block', () => {
    const b = row('2026-04-05T10:00:00.000Z', '2026-04-05T10:05:00.000Z', 'FOCUS_ACTIVE');
    expect(getDuration(b)).toBe(300);
  });

  it('uses now for open block when end_time is null', () => {
    const b = row('2026-04-05T10:00:00.000Z', null, 'FOCUS_ACTIVE');
    const now = new Date('2026-04-05T10:01:00.000Z').getTime();
    expect(getDuration(b, now)).toBe(60);
  });

  it('returns 0 when end is not after start', () => {
    const b = row('2026-04-05T10:05:00.000Z', '2026-04-05T10:00:00.000Z', 'FOCUS_ACTIVE');
    expect(getDuration(b)).toBe(0);
  });
});

describe('detectFocusSessions', () => {
  it('returns empty for no FOCUS_ACTIVE blocks', () => {
    expect(detectFocusSessions([row('2026-04-05T10:00:00.000Z', '2026-04-05T10:01:00.000Z', 'IDLE')])).toEqual([]);
  });

  it('sorts by start_time before filtering', () => {
    const blocks = [
      row('2026-04-05T12:00:00.000Z', '2026-04-05T12:10:00.000Z', 'FOCUS_ACTIVE'),
      row('2026-04-05T10:00:00.000Z', '2026-04-05T10:20:00.000Z', 'FOCUS_ACTIVE'),
    ];
    const sessions = detectFocusSessions(blocks);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].start).toBe('2026-04-05T10:00:00.000Z');
    expect(sessions[0].duration).toBe(1200);
  });
});

describe('getAvgFocusDuration', () => {
  it('returns null when there are no focus sessions', () => {
    expect(getAvgFocusDuration([])).toBeNull();
    expect(
      getAvgFocusDuration([row('2026-04-05T10:00:00.000Z', '2026-04-05T10:01:00.000Z', 'AWAY')])
    ).toBeNull();
  });

  it('averages focus session durations in seconds', () => {
    const blocks = [
      row('2026-04-05T10:00:00.000Z', '2026-04-05T10:10:00.000Z', 'FOCUS_ACTIVE'),
      row('2026-04-05T11:00:00.000Z', '2026-04-05T11:20:00.000Z', 'FOCUS_ACTIVE'),
    ];
    expect(getAvgFocusDuration(blocks)).toBe(900);
  });
});

describe('detectDropPoints', () => {
  it('records duration of prior FOCUS_ACTIVE when next is IDLE or AWAY', () => {
    const blocks = [
      row('2026-04-05T10:00:00.000Z', '2026-04-05T10:30:00.000Z', 'FOCUS_ACTIVE'),
      row('2026-04-05T10:30:00.000Z', '2026-04-05T10:35:00.000Z', 'IDLE'),
    ];
    expect(detectDropPoints(blocks)).toEqual([1800]);
  });

  it('handles unsorted input', () => {
    const blocks = [
      row('2026-04-05T10:30:00.000Z', '2026-04-05T10:35:00.000Z', 'AWAY'),
      row('2026-04-05T10:00:00.000Z', '2026-04-05T10:30:00.000Z', 'FOCUS_ACTIVE'),
    ];
    expect(detectDropPoints(blocks)).toEqual([1800]);
  });
});

describe('analyzeBehavior', () => {
  it('returns consistent structure', () => {
    const blocks = [
      row('2026-04-05T10:00:00.000Z', '2026-04-05T10:10:00.000Z', 'FOCUS_ACTIVE'),
      row('2026-04-05T10:10:00.000Z', '2026-04-05T10:15:00.000Z', 'AWAY', { reason: 'tab_hidden' }),
    ];
    const a = analyzeBehavior(blocks);
    expect(a.focusSessions).toHaveLength(1);
    expect(a.avgFocusDuration).toBe(600);
    expect(a.dropPoints).toEqual([600]);
    expect(a.distractionTriggers).toEqual(['tab_hidden']);
  });
});

describe('medianSeconds', () => {
  it('returns null for empty', () => {
    expect(medianSeconds([])).toBeNull();
  });

  it('returns middle value', () => {
    expect(medianSeconds([10, 30, 20])).toBe(20);
  });
});

describe('getTopDistractionReason', () => {
  it('returns null when no labeled reasons', () => {
    expect(getTopDistractionReason([undefined, undefined])).toBeNull();
  });

  it('picks mode with lexicographic tie-break', () => {
    expect(getTopDistractionReason(['b', 'a', 'b', 'a'])).toBe('a');
  });
});

describe('getBestFocusSessionSecondsToday', () => {
  it('returns null when no focus today', () => {
    const now = new Date(2026, 3, 5, 12, 0, 0);
    const yesterday = new Date(2026, 3, 4, 10, 0, 0);
    const yesterdayEnd = new Date(2026, 3, 4, 10, 30, 0);
    const blocks = [row(yesterday.toISOString(), yesterdayEnd.toISOString(), 'FOCUS_ACTIVE')];
    expect(getBestFocusSessionSecondsToday(blocks, now)).toBeNull();
  });

  it('returns longest focus slice that starts today', () => {
    const now = new Date(2026, 3, 5, 22, 0, 0);
    const s1 = new Date(2026, 3, 5, 9, 0, 0);
    const e1 = new Date(2026, 3, 5, 9, 20, 0);
    const s2 = new Date(2026, 3, 5, 14, 0, 0);
    const e2 = new Date(2026, 3, 5, 14, 45, 0);
    const blocks = [
      row(s1.toISOString(), e1.toISOString(), 'FOCUS_ACTIVE'),
      row(s2.toISOString(), e2.toISOString(), 'FOCUS_ACTIVE'),
    ];
    expect(getBestFocusSessionSecondsToday(blocks, now)).toBe(2700);
  });
});
