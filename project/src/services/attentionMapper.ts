import type { AttentionBlockRow } from './behaviorEngine';

export type AttentionCategory =
  | 'focus'
  | 'learning'
  | 'light'
  | 'break'
  | 'idle'
  | 'distraction'
  | 'interruption';

export function mapBlock(block: Pick<AttentionBlockRow, 'state' | 'metadata'>): AttentionCategory {
  const { state, metadata } = block;

  if (state === 'FOCUS_ACTIVE') return 'focus';

  if (state === 'VIDEO_ENGAGED') return 'learning';

  if (state === 'VIDEO_PASSIVE') return 'light';

  if (state === 'IDLE') {
    if (metadata?.reason === 'break') return 'break';
    if (metadata?.reason === 'session_complete') return 'light';
    return 'idle';
  }

  if (state === 'AWAY') {
    if (metadata?.reason === 'interruption') return 'interruption';
    return 'distraction';
  }

  return 'light';
}
