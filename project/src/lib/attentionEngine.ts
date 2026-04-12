import supabase from '../supabaseClient';

export type AttentionState =
  | 'FOCUS_ACTIVE'
  | 'VIDEO_ENGAGED'
  | 'VIDEO_PASSIVE'
  | 'PAUSED'
  | 'IDLE'
  | 'AWAY';

export type AttentionSource = 'timer' | 'presence' | 'video' | 'system';

type AttentionBlock = {
  id: string;
  state: AttentionState;
  startTime: number;
  source: AttentionSource;
  sessionId?: string | null;
};

const priority: Record<AttentionState, number> = {
  AWAY: 4,
  IDLE: 3,
  FOCUS_ACTIVE: 2,
  PAUSED: 2,
  VIDEO_ENGAGED: 1,
  VIDEO_PASSIVE: 1,
};

let currentBlock: AttentionBlock | null = null;

const createLocalBlockId = (): string => `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const canOverride = (currentState: AttentionState | null, newState: AttentionState): boolean => {
  if (!currentState) {
    return true;
  }

  return priority[newState] <= priority[currentState];
};

const canTransition = (current: AttentionState | null, next: AttentionState, source: AttentionSource): boolean => {
  // 1. prevent no-op
  if (current === next) return false;

  // 2. presence cannot override active focus
  if (source === 'presence' && current === 'FOCUS_ACTIVE') {
    if (next === 'IDLE') return true;
    if (next === 'AWAY') return true;
    return false;
  }

  // 3. prevent illegal jumps
  // (optional strict rules later)

  return true;
};

let transitionLock: Promise<void> = Promise.resolve();

const withTransitionLock = async <T>(fn: () => Promise<T>): Promise<T> => {
  const previous = transitionLock;
  let release!: () => void;
  transitionLock = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
};

const getUserId = async (): Promise<string | null> => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Attention engine failed to resolve user:', error);
    return null;
  }

  return data.user?.id ?? null;
};

/**
 * Persists end_time for the current block. On failure, leaves currentBlock intact so we can retry or abort.
 * @returns true if nothing to close, local-only block cleared, or DB close succeeded
 */
const closeCurrentBlock = async (now: number): Promise<boolean> => {
  if (!currentBlock) return true;

  if (currentBlock.id.startsWith('local-')) {
    currentBlock = null;
    return true;
  }

  const blockId = currentBlock.id;
  const endIso = new Date(now).toISOString();

  const tryUpdate = async (): Promise<boolean> => {
    const { error } = await supabase
      .from('attention_blocks')
      .update({ end_time: endIso })
      .eq('id', blockId);
    if (error) {
      console.error('Attention engine failed to close block:', error);
      return false;
    }
    return true;
  };

  // Exponential backoff: 200ms -> 500ms -> 1s
  let ok = await tryUpdate();
  let delay = 200;
  for (let i = 0; i < 3 && !ok; i++) {
    await new Promise((r) => setTimeout(r, delay));
    ok = await tryUpdate();
    delay = delay === 200 ? 500 : 1000;
  }

  if (!ok) {
    // If still fails, do NOT clear currentBlock so we don't silently lose state
    return false;
  }

  currentBlock = null;
  return true;
};

/** Closes every open row for this user except the latest one. */
const closeAllOpenBlocksForUser = async (userId: string, now: number): Promise<boolean> => {
  const { data, error } = await supabase
    .from('attention_blocks')
    .select('id, start_time')
    .eq('user_id', userId)
    .is('end_time', null);

  if (error) {
    console.error('Attention engine failed to fetch open blocks for user:', error);
    return false;
  }

  if (!data || data.length <= 1) {
    return true; // 0 or 1 open block is fine 
  }

  // Sort DESC
  const sorted = [...data].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // Keep latest (index 0) intact, close older ones
  const toClose = sorted.slice(1);

  for (const block of toClose) {
    const { error: updateError } = await supabase
      .from('attention_blocks')
      .update({ end_time: new Date(now).toISOString() })
      .eq('id', block.id);
    if (updateError) {
      console.error('Failed to close older open block:', updateError);
    }
  }

  return true;
};

const openNewBlock = async (
  nextState: AttentionState,
  source: AttentionSource,
  metadata?: Record<string, any>
): Promise<AttentionBlock> => {
  const now = Date.now();
  const sessionId = metadata?.sessionId ?? null;

  const userId = await getUserId();
  const shouldPersist = Boolean(userId);

  if (shouldPersist) {
    const { data, error } = await supabase
      .from('attention_blocks')
      .insert({
        user_id: userId,
        start_time: new Date(now).toISOString(),
        state: nextState,
        source,
        session_id: sessionId,
        metadata: metadata ?? {},
      })
      .select()
      .single();

    if (error || !data) {
      console.error('Attention engine failed to create block:', error);
      currentBlock = {
        id: createLocalBlockId(),
        state: nextState,
        startTime: now,
        source,
        sessionId: sessionId ?? null,
      };
      return currentBlock;
    }

    currentBlock = {
      id: data.id,
      state: nextState,
      startTime: now,
      source,
      sessionId: sessionId ?? null,
    };

    return currentBlock;
  }

  currentBlock = {
    id: createLocalBlockId(),
    state: nextState,
    startTime: now,
    source,
    sessionId: sessionId ?? null,
  };

  return currentBlock;
};

export const transitionAttention = async ({
  nextState,
  source,
  metadata,
}: {
  nextState: AttentionState;
  source: AttentionSource;
  metadata?: Record<string, any>;
}): Promise<AttentionBlock | null> => {
  // Multi-tab minimum protection
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && source !== 'system') {
    console.warn('[ATTENTION] skip transition: tab not visible');
    return currentBlock;
  }

  return await withTransitionLock(async () => {
    const userId = await getUserId();
    if (!userId) {
      console.warn('[ATTENTION] abort transition: no user id');
      return currentBlock;
    }

    const currentState = currentBlock?.state ?? null;

    if (currentState === nextState) {
      return currentBlock; 
    }

    console.warn('[ATTENTION]', {
      from: currentState,
      to: nextState,
      source,
      metadata,
    });

    if (!canTransition(currentState, nextState, source)) {
      return currentBlock;
    }

    if (!canOverride(currentState, nextState)) {
      return currentBlock;
    }

    const now = Date.now();

    const closed = await closeCurrentBlock(now);
    if (!closed) {
      console.error('[ATTENTION] abort transition: could not close current block');
      return currentBlock;
    }

    const cleaned = await closeAllOpenBlocksForUser(userId, now);
    if (!cleaned) {
      console.error('[ATTENTION] abort transition: could not clear open blocks for user');
      return currentBlock;
    }

    const newBlock = await openNewBlock(nextState, source, metadata);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('attention-state', nextState);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('attention-state-change', { detail: nextState }));
    }

    return newBlock;
  });
};

const closeStaleOpenBlock = async (): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const now = Date.now();

  const { data, error } = await supabase
    .from('attention_blocks')
    .select('id, start_time')
    .eq('user_id', userId)
    .is('end_time', null);

  if (error) {
    console.error('Failed to query open blocks:', error);
    return;
  }

  if (data && data.length > 0) {
    // Sort DESC by start_time
    const sorted = [...data].sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    const latest = sorted[0];
    const older = sorted.slice(1);

    if (older.length > 0) {
      console.warn('Found extra open blocks, closing older ones:', older.length);
      for (const block of older) {
        await supabase
          .from('attention_blocks')
          .update({ end_time: new Date(now).toISOString() })
          .eq('id', block.id);
      }
    }

    // Check if the latest is stale (> 24 hours old)
    const ageMs = now - new Date(latest.start_time).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      console.warn('Latest open block is stale, closing it:', latest.id);
      await supabase
        .from('attention_blocks')
        .update({ end_time: new Date(now).toISOString() })
        .eq('id', latest.id);
    }
  }
};

export const initAttentionEngine = async (): Promise<void> => {
  await closeStaleOpenBlock();
  await transitionAttention({
    nextState: 'IDLE',
    source: 'system',
    metadata: { initialized: true },
  });
};
