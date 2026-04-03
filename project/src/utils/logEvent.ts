import supabase from '../supabaseClient';

type LogEventInput = {
  sessionId: string;
  type: string;
  eventCategory?: string;
  sessionPhase?: string;
  metadata?: Record<string, unknown>;
};

const sessionEventSequence = new Map<string, number>();

const nextEventSequence = (sessionId: string) => {
  const current = sessionEventSequence.get(sessionId) ?? Date.now() * 1000;
  const next = current + 1;
  sessionEventSequence.set(sessionId, next);
  return next;
};

export const logEvent = async ({
  sessionId,
  type,
  eventCategory,
  sessionPhase,
  metadata = {},
}: LogEventInput) => {
  console.log('LOG EVENT CALLED:', type);

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    console.log('USER DATA:', userData, userError);

    const user = userData?.user;

    if (!user) {
      console.error('BLOCKED: user not ready');
      return new Error('User not ready');
    }

    const durationSeconds = typeof metadata?.duration === 'number' ? metadata.duration : null;
    const eventSequence = nextEventSequence(sessionId);
    const eventTimestamp = new Date().toISOString();
    const eventId = `${sessionId}:${type}:${eventSequence}:${eventTimestamp}`;

    const payload = {
      event_id: eventId,
      event_sequence: eventSequence,
      session_id: sessionId,
      user_id: user.id,
      event_type: type,
      event_timestamp: eventTimestamp,
      event_category: eventCategory ?? null,
      session_phase: sessionPhase ?? null,
      duration_since_last_event_seconds: durationSeconds,
      metadata,
    };

    console.log('INSERT PAYLOAD:', payload);

    const { data, error } = await supabase
      .from('session_events')
      .upsert([payload], {
        onConflict: 'event_id',
        ignoreDuplicates: true,
      })
      .select();

    console.log('INSERT RESPONSE:', data, error);

    if (error) {
      console.error('INSERT FAILED:', error.message, error.details);
      return error;
    }

    console.log('INSERT SUCCESS');
    return null;
  } catch (err) {
    console.error('CRASH:', err);
    return err instanceof Error ? err : new Error('Unknown error');
  }
};
