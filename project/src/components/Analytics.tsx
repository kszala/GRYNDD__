import React from 'react';
import { Clock, PauseCircle, TrendingUp, Brain, AlertTriangle } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { generateInsights, Insight } from '@/utils/insightEngine';

const Analytics = () => {
  const { metrics, peakHours, distraction } = useAnalytics();

  const safeMetrics = {
    focus_time: metrics?.focus_time ?? 0,
    distraction_time: metrics?.distraction_time ?? 0,
    reflection_time: metrics?.reflection_time ?? 0,
    total_time: metrics?.total_time ?? 1,
    interruptions: metrics?.interruptions ?? 0,
    sessions_completed: metrics?.sessions_completed ?? 0,
  };

  const insights = generateInsights({
    metrics: safeMetrics,
    peakHours,
    distraction,
  });

  const focusRatio = safeMetrics.focus_time / safeMetrics.total_time;

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const isLoading = metrics === null && peakHours.length === 0 && distraction === null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400 animate-pulse">Loading your data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-gray-500 mb-8">{new Date().toDateString()}</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Focus Time"
            value={formatDuration(safeMetrics.focus_time)}
            sub="total focused"
            icon={Clock}
            color="text-emerald-400"
          />
          <StatCard
            title="Distraction"
            value={formatDuration(safeMetrics.distraction_time)}
            sub="inactive time"
            icon={PauseCircle}
            color="text-amber-400"
          />
          <StatCard
            title="Focus Ratio"
            value={`${Math.round(focusRatio * 100)}%`}
            sub="focus / total"
            icon={TrendingUp}
            color="text-blue-400"
          />
          <StatCard
            title="Reflection"
            value={formatDuration(safeMetrics.reflection_time)}
            sub="reflection time"
            icon={Brain}
            color="text-purple-400"
          />
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-1">Insights</h3>
        <p className="text-gray-500 text-sm mb-6">Instant clarity from your behavior</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {insights.length === 0 && (
            <InsightCard
              text="We need more sessions to surface meaningful insights."
              level="good"
            />
          )}
          {insights.map((insight: Insight, index: number) => (
            <InsightCard
              key={`${insight.text}-${index}`}
              text={insight.text}
              level={insight.level}
            />
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-xl font-bold mb-1">Behavior Summary</h3>
        <p className="text-gray-500 text-sm mb-6">Distraction signals you can act on</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Interruptions"
            value={`${safeMetrics.interruptions}`}
            sub="total interruptions"
            icon={AlertTriangle}
            color="text-red-400"
          />
          <StatCard
            title="Idle Count"
            value={`${distraction?.idle_count ?? 0}`}
            sub="idle detections"
            icon={PauseCircle}
            color="text-yellow-400"
          />
          <StatCard
            title="Away Count"
            value={`${distraction?.away_count ?? 0}`}
            sub="tab away events"
            icon={Clock}
            color="text-orange-400"
          />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
    <div className="flex justify-between items-start mb-4">
      <div className={`p-2 bg-gray-800 rounded-lg ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <h4 className="text-2xl font-bold">{value}</h4>
    <p className="text-xs text-gray-500">{sub}</p>
  </div>
);

const InsightCard = ({ text, level }: { text: string; level: 'good' | 'warning' | 'critical' }) => {
  const color =
    level === 'critical'
      ? 'border-red-500'
      : level === 'warning'
        ? 'border-yellow-500'
        : 'border-green-500';

  return (
    <div className={`p-4 rounded-xl border ${color} bg-neutral-900`}>
      <p className="text-sm text-gray-200">{text}</p>
    </div>
  );
};

export default Analytics;
