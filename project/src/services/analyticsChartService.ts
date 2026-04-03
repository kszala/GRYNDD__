import { supabase } from '@/supabaseClient';

export interface DailyFocusTrend {
  date: string;
  day: string;
  focusMinutes: number;
  distractionMinutes: number;
  videoWatchMinutes: number;
}

export interface FocusVsDistractionData {
  day: string;
  focusPercentage: number;
  distractionPercentage: number;
  otherPercentage: number;
}

export interface PeakHourData {
  hour: number;
  day: string;
  dayIndex: number;
  focusScore: number;
}

export interface PauseInterruptionData {
  date: string;
  day: string;
  pauseCount: number;
  interruptionCount: number;
}

export interface VideoMetricsData {
  videoId: string;
  videoTitle: string;
  channelName: string;
  totalWatchedSeconds: number;
  totalDurationSeconds: number;
  completionPercentage: number;
  sessionCount: number;
  lastWatchedAt: string;
}

export interface VideoChannelData {
  channelName: string;
  totalWatchedSeconds: number;
  sessionCount: number;
  videoCount: number;
}

// Daily focus trend with video hours overlay
export async function getChartDataDailyFocusTrend(userId: string, days: number = 7) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc('get_session_analytics', {
      p_user_id: userId,
      p_from_date: from.toISOString(),
      p_to_date: to.toISOString(),
    });

    if (error) throw error;

    // Get video data
    const { data: videoData } = await supabase
      .from('video_sessions')
      .select('watched_seconds, started_at')
      .eq('user_id', userId)
      .gte('started_at', from.toISOString())
      .lte('started_at', to.toISOString());

    // Aggregate by day
    const dailyMap = new Map<string, DailyFocusTrend>();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap.set(dateStr, {
        date: dateStr,
        day: dayName,
        focusMinutes: 0,
        distractionMinutes: 0,
        videoWatchMinutes: 0,
      });
    }

    // Add session data
    if (data) {
      data.forEach((row: any) => {
        const date = row.date || row.session_date;
        if (date) {
          const entry = dailyMap.get(date) || {
            date,
            day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            focusMinutes: 0,
            distractionMinutes: 0,
            videoWatchMinutes: 0,
          };
          entry.focusMinutes += Math.round((row.focus_minutes || row.focusMinutes || 0) / 60);
          entry.distractionMinutes += Math.round(
            (row.distraction_minutes || row.distractionMinutes || 0) / 60
          );
          dailyMap.set(date, entry);
        }
      });
    }

    // Add video watch data
    if (videoData) {
      videoData.forEach((row: any) => {
        const date = new Date(row.started_at).toISOString().split('T')[0];
        const entry = dailyMap.get(date);
        if (entry) {
          entry.videoWatchMinutes += Math.round((row.watched_seconds || 0) / 60);
        }
      });
    }

    return Array.from(dailyMap.values()).slice(0, days);
  } catch (error) {
    console.error('Error fetching daily focus trend:', error);
    return [];
  }
}

// Focus vs distraction breakdown for bar chart
export async function getChartDataFocusVsDistraction(userId: string, days: number = 7) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc('get_session_analytics', {
      p_user_id: userId,
      p_from_date: from.toISOString(),
      p_to_date: to.toISOString(),
    });

    if (error) throw error;

    let totalFocus = 0;
    let totalDistraction = 0;
    let totalOther = 0;

    if (data) {
      data.forEach((row: any) => {
        totalFocus += row.focus_minutes || row.focusMinutes || 0;
        totalDistraction += row.distraction_minutes || row.distractionMinutes || 0;
        totalOther += (row.pause_minutes || row.pauseMinutes || 0) + (row.other_minutes || 0);
      });
    }

    const total = totalFocus + totalDistraction + totalOther || 1;

    return [
      {
        day: 'Last ' + days + ' Days',
        focusPercentage: Math.round((totalFocus / total) * 100),
        distractionPercentage: Math.round((totalDistraction / total) * 100),
        otherPercentage: Math.round((totalOther / total) * 100),
      },
    ];
  } catch (error) {
    console.error('Error fetching focus vs distraction:', error);
    return [];
  }
}

// Peak hours heatmap data
export async function getChartDataPeakHours(userId: string) {
  try {
    const { data, error } = await supabase.rpc('get_peak_hours_with_day', {
      p_user_id: userId,
    });

    if (error) throw error;

    const heatmapData: PeakHourData[] = [];
    const dayMap: { [key: string]: number } = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };

    if (data) {
      data.forEach((row: any) => {
        const day = row.day_of_week || 'Monday';
        heatmapData.push({
          hour: row.hour_of_day || 0,
          day,
          dayIndex: dayMap[day] || 0,
          focusScore: row.focus_score || row.peak_focus_score || 0,
        });
      });
    }

    return heatmapData;
  } catch (error) {
    console.error('Error fetching peak hours:', error);
    return [];
  }
}

// Pause and interruption patterns
export async function getChartDataPauseInterruptions(userId: string, days: number = 7) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: events, error } = await supabase
      .from('session_events')
      .select('*')
      .eq('user_id', userId)
      .gte('event_timestamp', from.toISOString())
      .lte('event_timestamp', to.toISOString());

    if (error) throw error;

    const dailyMap = new Map<string, PauseInterruptionData>();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap.set(dateStr, {
        date: dateStr,
        day: dayName,
        pauseCount: 0,
        interruptionCount: 0,
      });
    }

    // Count events
    if (events) {
      events.forEach((event: any) => {
        const date = event.event_timestamp.split('T')[0];
        const entry = dailyMap.get(date);
        if (entry) {
          if (event.event_type === 'pause') entry.pauseCount++;
          if (event.event_type === 'interrupt') entry.interruptionCount++;
        }
      });
    }

    return Array.from(dailyMap.values());
  } catch (error) {
    console.error('Error fetching pause/interruptions:', error);
    return [];
  }
}

// Video watch hours trend
export async function getChartDataVideoWatchHours(userId: string, days: number = 7) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: videoSessions, error } = await supabase
      .from('video_sessions')
      .select('watched_seconds, started_at')
      .eq('user_id', userId)
      .gte('started_at', from.toISOString())
      .lte('started_at', to.toISOString());

    if (error) throw error;

    const dailyMap = new Map<string, any>();

    // Initialize days
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      dailyMap.set(dateStr, {
        date: dateStr,
        day: dayName,
        videoWatchHours: 0,
      });
    }

    // Aggregate video time
    if (videoSessions) {
      videoSessions.forEach((session: any) => {
        const date = new Date(session.started_at).toISOString().split('T')[0];
        const entry = dailyMap.get(date);
        if (entry) {
          entry.videoWatchHours += (session.watched_seconds || 0) / 3600;
        }
      });
    }

    return Array.from(dailyMap.values());
  } catch (error) {
    console.error('Error fetching video watch hours:', error);
    return [];
  }
}

// Video performance metrics (top videos)
export async function getChartDataVideoPerformance(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('video_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('watched_seconds', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const videoMetrics: VideoMetricsData[] = [];

    if (data) {
      data.forEach((row: any) => {
        const completion =
          row.total_duration_seconds > 0
            ? (row.watched_seconds / row.total_duration_seconds) * 100
            : 0;

        videoMetrics.push({
          videoId: row.video_id,
          videoTitle: row.video_title || 'Untitled',
          channelName: row.channel_name || 'Unknown',
          totalWatchedSeconds: row.watched_seconds || 0,
          totalDurationSeconds: row.total_duration_seconds || 0,
          completionPercentage: completion,
          sessionCount: 1, // Could be aggregated if needed
          lastWatchedAt: row.ended_at || row.started_at,
        });
      });
    }

    return videoMetrics;
  } catch (error) {
    console.error('Error fetching video performance:', error);
    return [];
  }
}

// Channel analytics
export async function getChartDataVideoChannels(userId: string, limit: number = 10) {
  try {
    const { data, error } = await supabase
      .from('video_sessions')
      .select('channel_name, watched_seconds')
      .eq('user_id', userId)
      .not('channel_name', 'is', null);

    if (error) throw error;

    const channelMap = new Map<string, VideoChannelData>();

    if (data) {
      data.forEach((row: any) => {
        const channel = row.channel_name || 'Unknown';
        const existing = channelMap.get(channel) || {
          channelName: channel,
          totalWatchedSeconds: 0,
          sessionCount: 0,
          videoCount: 0,
        };
        existing.totalWatchedSeconds += row.watched_seconds || 0;
        existing.sessionCount++;
        channelMap.set(channel, existing);
      });
    }

    // Sort by watched seconds and limit
    const sorted = Array.from(channelMap.values())
      .sort((a, b) => b.totalWatchedSeconds - a.totalWatchedSeconds)
      .slice(0, limit);

    return sorted;
  } catch (error) {
    console.error('Error fetching video channels:', error);
    return [];
  }
}
