import { supabase } from '../supabaseClient';
import { mapBlock } from './attentionMapper';
import type { AttentionBlockRow } from './behaviorEngine';

export type AttentionState =
  | 'FOCUS_ACTIVE'
  | 'VIDEO_ENGAGED'
  | 'VIDEO_PASSIVE'
  | 'PAUSED'
  | 'IDLE'
  | 'AWAY';

/** Seconds per bucket over the queried window (clipped, not DB duration). */
export interface AttentionSummary {
  focus: number;
  learning: number;
  light: number;
  break: number;
  idle: number;
  distraction: number;
  interruption: number;
  paused: number;
  total: number;
}

export interface FocusMetrics {
  realFocus: number;
  learning: number;
  productive: number;
  lostTime: number;
  neutralTime: number;
  interruptionTime: number;
  paused: number;
  total: number;
  focusScore: number;
}

export interface BiggestLeak {
  category: 'distraction' | 'interruption' | 'idle' | 'light' | 'paused' | 'none';
  duration: number;
  percentage: number;
}

export type ClippedBlockInterval = {
  durationSec: number;
  clipStartMs: number;
  clipEndMs: number;
};

type BlockForClip = Pick<AttentionBlockRow, 'start_time' | 'end_time'>;

/** Seconds; allow small tolerance for clock skew / rounding */
const INFLATION_RANGE_BUFFER_SEC = 120;

export type AttentionBlocksIntegrity = {
  hasOverlap: boolean;
  multipleOpen: boolean;
  openCount: number;
};

/**
 * Detect overlapping intervals (sorted sweep) and multiple rows with end_time null.
 * Uses `nowMs` as effective end for open blocks.
 */
export function findAttentionBlocksIntegrityIssues(
  blocks: AttentionBlockRow[],
  nowMs: number = Date.now()
): AttentionBlocksIntegrity {
  const openCount = blocks.filter((b) => !b.end_time).length;
  const multipleOpen = openCount > 1;

  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  let maxEnd = -Infinity;
  let hasOverlap = false;
  for (const b of sorted) {
    const s = new Date(b.start_time).getTime();
    const e = b.end_time ? new Date(b.end_time).getTime() : nowMs;
    if (s < maxEnd) {
      hasOverlap = true;
      break;
    }
    if (e > maxEnd) maxEnd = e;
  }

  return { hasOverlap, multipleOpen, openCount };
}

function logAttentionBlocksIntegrity(integrity: AttentionBlocksIntegrity): void {
  if (integrity.hasOverlap || integrity.multipleOpen) {
    if (integrity.hasOverlap) {
      console.warn('OVERLAP DETECTED', integrity);
    } else {
      console.warn('[ATTENTION_ANALYTICS] Block integrity issues (multiple open rows)', integrity);
    }
  }
}

function warnIfSummaryInflated(totalSec: number, from: Date, to: Date): void {
  const rangeSec = Math.max(0, (to.getTime() - from.getTime()) / 1000);
  if (totalSec > rangeSec + INFLATION_RANGE_BUFFER_SEC) {
    console.warn('[ATTENTION_ANALYTICS] Inflation detected: clipped total exceeds wall-clock range', {
      totalSec,
      expectedRange: rangeSec,
      bufferSec: INFLATION_RANGE_BUFFER_SEC,
    });
  }
}

/**
 * Clips a block to [from, to], uses wall-clock end - start (not stored duration).
 * Open blocks use min(now, to) as effective end inside the window.
 */
export function getClippedBlockInterval(
  block: BlockForClip,
  from: Date,
  to: Date,
  nowMs: number = Date.now()
): ClippedBlockInterval | null {
  const windowStart = from.getTime();
  const windowEnd = to.getTime();
  const blockStart = Math.max(new Date(block.start_time).getTime(), windowStart);
  const blockEnd = block.end_time
    ? Math.min(new Date(block.end_time).getTime(), windowEnd)
    : Math.min(nowMs, windowEnd);

  if (blockEnd <= blockStart) return null;

  return {
    durationSec: (blockEnd - blockStart) / 1000,
    clipStartMs: blockStart,
    clipEndMs: blockEnd,
  };
}

/**
 * Core function: attention summary from attention_blocks with overlap query + clipped duration.
 */
export async function getAttentionSummary(
  userId: string,
  from: Date,
  to: Date,
  sessionId?: string
): Promise<AttentionSummary | null> {
  try {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    let query = supabase
      .from('attention_blocks')
      .select('*')
      .eq('user_id', userId)
      .lt('start_time', toIso)
      .or(`end_time.gt.${fromIso},end_time.is.null`)
      .order('start_time', { ascending: true });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch attention blocks:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return {
        focus: 0,
        learning: 0,
        light: 0,
        break: 0,
        idle: 0,
        distraction: 0,
        interruption: 0,
        paused: 0,
        total: 0,
      };
    }

    logAttentionBlocksIntegrity(findAttentionBlocksIntegrityIssues(data, Date.now()));

    const summary: AttentionSummary = {
      focus: 0,
      learning: 0,
      light: 0,
      break: 0,
      idle: 0,
      distraction: 0,
      interruption: 0,
      paused: 0,
      total: 0,
    };

    let maxEndMs = from.getTime();

    data.forEach((block: AttentionBlockRow) => {
      const clip = getClippedBlockInterval(block, from, to);
      if (!clip) return;

      const actualStartMs = Math.max(clip.clipStartMs, maxEndMs);
      if (actualStartMs >= clip.clipEndMs) {
        return; // completely overlapped
      }

      const duration = (clip.clipEndMs - actualStartMs) / 1000;
      maxEndMs = Math.max(maxEndMs, clip.clipEndMs);

      summary.total += duration;

      if (block.state === 'PAUSED') {
        summary.paused += duration;
        return;
      }

      const category = mapBlock(block);

      switch (category) {
        case 'focus':
          summary.focus += duration;
          break;
        case 'learning':
          summary.learning += duration;
          break;
        case 'light':
          summary.light += duration;
          break;
        case 'break':
          summary.break += duration;
          break;
        case 'idle':
          summary.idle += duration;
          break;
        case 'distraction':
          summary.distraction += duration;
          break;
        case 'interruption':
          summary.interruption += duration;
          break;
      }
    });

    warnIfSummaryInflated(summary.total, from, to);

    return summary;
  } catch (err) {
    console.error('Error in getAttentionSummary:', err);
    return null;
  }
}

export function calculateFocusMetrics(summary: AttentionSummary): FocusMetrics {
  const realFocus = summary.focus;
  const learning = summary.learning;
  const productive = realFocus + learning;
  const lostTime = summary.distraction;
  const neutralTime = summary.light + summary.break + summary.idle;
  const interruptionTime = summary.interruption;
  const focusScore =
    summary.total > 0 ? Math.round((productive / summary.total) * 100) : 0;

  return {
    realFocus,
    learning,
    productive,
    lostTime,
    neutralTime,
    interruptionTime,
    paused: summary.paused,
    total: summary.total,
    focusScore,
  };
}

export function findBiggestLeak(summary: AttentionSummary): BiggestLeak {
  const { distraction, interruption, light, break: breakSec, paused, total } = summary;

  const lightAndBreak = light + breakSec;
  const idleDuration = summary.idle;

  type Cat = BiggestLeak['category'];
  let category: Cat = 'none';
  let maxDuration = 0;

  const consider = (cat: Cat, dur: number) => {
    if (dur > maxDuration) {
      category = cat;
      maxDuration = dur;
    }
  };

  consider('distraction', distraction);
  consider('interruption', interruption);
  consider('idle', idleDuration);
  consider('light', lightAndBreak);
  consider('paused', paused);

  const percentage = total > 0 ? Math.round((maxDuration / total) * 100) : 0;

  return {
    category,
    duration: maxDuration,
    percentage,
  };
}

/**
 * Get attention blocks for date range (overlap with window).
 */
export async function getAttentionBlocks(
  userId: string,
  from: Date,
  to: Date,
  sessionId?: string
) {
  try {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    let query = supabase
      .from('attention_blocks')
      .select('*')
      .eq('user_id', userId)
      .lt('start_time', toIso)
      .or(`end_time.gt.${fromIso},end_time.is.null`);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });

    if (error) {
      console.error('Failed to fetch attention blocks:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error in getAttentionBlocks:', err);
    return [];
  }
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${Math.round(secs)}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function getAttentionBreakdown(summary: AttentionSummary) {
  const productive = summary.focus + summary.learning;
  const neutral = summary.light + summary.break + summary.idle;

  return {
    productive: {
      duration: productive,
      percentage:
        summary.total > 0 ? Math.round((productive / summary.total) * 100) : 0,
      label: 'Productive',
      details: `${summary.focus}s focus + ${summary.learning}s learning`,
    },
    neutral: {
      duration: neutral,
      percentage: summary.total > 0 ? Math.round((neutral / summary.total) * 100) : 0,
      label: 'Light / breaks / idle',
      details: `${summary.light}s light + ${summary.break}s break + ${summary.idle}s idle`,
    },
    distraction: {
      duration: summary.distraction,
      percentage:
        summary.total > 0 ? Math.round((summary.distraction / summary.total) * 100) : 0,
      label: 'Distraction',
    },
    interruption: {
      duration: summary.interruption,
      percentage:
        summary.total > 0 ? Math.round((summary.interruption / summary.total) * 100) : 0,
      label: 'Interruption',
    },
    paused: {
      duration: summary.paused,
      percentage: summary.total > 0 ? Math.round((summary.paused / summary.total) * 100) : 0,
      label: 'Paused',
    },
  };
}
