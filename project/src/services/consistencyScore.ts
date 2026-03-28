import supabase from '../supabaseClient';

export async function computeConsistencyScore(userId: string): Promise<number> {
  const now = new Date();

  const windowStart = new Date(now);
  windowStart.setUTCDate(now.getUTCDate() - 7);
  windowStart.setUTCHours(0, 0, 0, 0);

  const windowEnd = new Date(now);
  windowEnd.setUTCDate(now.getUTCDate() - 1);
  windowEnd.setUTCHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from('session_events')
    .select('event_timestamp')
    .eq('user_id', userId)
    .eq('event_type', 'start')
    .gte('event_timestamp', windowStart.toISOString())
    .lte('event_timestamp', windowEnd.toISOString());

  if (error || !data) {
    return 0;
  }

  const uniqueDays = new Set(
    data.map((event: { event_timestamp: string }) => event.event_timestamp.slice(0, 10))
  );

  return Math.round((uniqueDays.size / 7) * 100);
}
