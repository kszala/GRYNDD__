import supabase from '../supabaseClient';

type LogEventInput = {
  sessionId: string;
  type: string;
  eventCategory?: string;
  sessionPhase?: string;
  metadata?: Record<string, unknown>;
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

    const payload = {
      session_id: sessionId,
      user_id: user.id,
      event_type: type,
      event_timestamp: new Date().toISOString(),
      event_category: eventCategory ?? null,
      session_phase: sessionPhase ?? null,
      duration_since_last_event_seconds: durationSeconds,
      metadata,
    };

    console.log('INSERT PAYLOAD:', payload);

    const { data, error } = await supabase
      .from('session_events')
      .insert([payload])
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
