export type Metrics = {
  focus_time: number | null;
  distraction_time: number | null;
  reflection_time: number | null;
  total_time: number | null;
  interruptions: number | null;
  sessions_completed: number | null;
};

export type PeakHour = {
  hour: number;
  focus_time: number | null;
};

export type DistractionProfile = {
  idle_count: number | null;
  away_count: number | null;
  interrupt_count: number | null;
};

export type Insight = {
  text: string;
  level: 'good' | 'warning' | 'critical';
};

export const generateInsights = ({
  metrics,
  peakHours,
  distraction,
}: {
  metrics: Metrics | null;
  peakHours: PeakHour[] | null;
  distraction: DistractionProfile | null;
}) => {
  if (!metrics || (metrics.total_time || 0) <= 0) return [];

  const insights: Insight[] = [];

  const totalTime = metrics.total_time || 0;
  const focusRatio = totalTime > 0 ? (metrics.focus_time || 0) / totalTime : 0;
  
  const focusMinutes = Math.floor((metrics.focus_time || 0) / 60);
  const distractionMinutes = Math.floor((metrics.distraction_time || 0) / 60);

  if (focusRatio < 0.5) {
    insights.push({
      text: `You spent ${distractionMinutes} min distracted vs ${focusMinutes} min focused. You're losing more time than you're using.`,
      level: 'critical',
    });
  } else if (focusRatio < 0.7) {
    insights.push({
      text: `You're getting there, but ${distractionMinutes} minutes of distraction is still pulling you down.`,
      level: 'warning',
    });
  } else {
    insights.push({
      text: `Strong focus: ${focusMinutes} minutes of real work. Keep this consistency.`,
      level: 'good',
    });
  }

  if ((distraction?.idle_count || 0) >= 5) {
    insights.push({
      text: `You went idle ${distraction?.idle_count} times. That's not fatigue - that's leakage.`,
      level: 'warning',
    });
  }

  if ((distraction?.away_count || 0) >= 3) {
    insights.push({
      text: `You left your session ${distraction?.away_count} times. Your environment is breaking your flow.`,
      level: 'critical',
    });
  }

  if ((metrics.interruptions || 0) >= 3) {
    insights.push({
      text: `Frequent interruptions (${metrics.interruptions}). You need stronger boundaries while studying.`,
      level: 'warning',
    });
  }

  if (peakHours && peakHours.length > 0) {
    const best = peakHours[0].hour;
    insights.push({
      text: `You focus best around ${best}:00. Protect that time - it's your peak.`,
      level: 'good',
    });
  }

  if ((metrics.reflection_time || 0) > 0) {
    const reflectionMin = Math.floor((metrics.reflection_time || 0) / 60);
    insights.push({
      text: `You spent ${reflectionMin} min explaining distractions. That awareness is good - now reduce the cause.`,
      level: 'warning',
    });
  }

  insights.sort(() => Math.random() - 0.5);

  return insights.slice(0, 5);
};

