import React, { useState, useEffect } from 'react';
import { Clock, PauseCircle, TrendingUp, Brain, AlertTriangle, ChevronDown, Play } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { generateInsights, Insight } from '@/utils/insightEngine';
import { LineChartComponent } from './charts/LineChartComponent';
import { BarChartComponent } from './charts/BarChartComponent';
import { HeatmapComponent } from './charts/HeatmapComponent';
import GryndTubeAnalytics from './GryndTubeAnalytics';
import {
  getChartDataDailyFocusTrend,
  getChartDataFocusVsDistraction,
  getChartDataPeakHours,
  getChartDataPauseInterruptions,
  getChartDataVideoWatchHours,
  DailyFocusTrend,
  FocusVsDistractionData,
  PeakHourData,
  PauseInterruptionData,
} from '@/services/analyticsChartService';
import { supabase } from '@/supabaseClient';

type ChartType = 'dailyTrend' | 'focusVsDistraction' | 'peakHours' | 'videoHours' | 'pauseInterruptions';

interface ChartConfig {
  id: ChartType;
  label: string;
  enabled: boolean;
}

const Analytics = () => {
  const { metrics, peakHours, distraction, isLoading } = useAnalytics();
  const [userId, setUserId] = useState<string | null>(null);
  const [dayRange, setDayRange] = useState<7 | 14 | 30>(7);
  const [showGryndTube, setShowGryndTube] = useState(false);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    { id: 'dailyTrend', label: 'Daily Focus Trend', enabled: true },
    { id: 'focusVsDistraction', label: 'Focus vs Distraction', enabled: true },
    { id: 'peakHours', label: 'Peak Study Hours', enabled: true },
    { id: 'videoHours', label: 'Video Watch Hours', enabled: false },
    { id: 'pauseInterruptions', label: 'Pause & Interruptions', enabled: false },
  ]);

  // Chart data states
  const [dailyTrendData, setDailyTrendData] = useState<DailyFocusTrend[]>([]);
  const [focusVsDistData, setFocusVsDistData] = useState<FocusVsDistractionData[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<PeakHourData[]>([]);
  const [videoHoursData, setVideoHoursData] = useState<any[]>([]);
  const [pauseIntData, setPauseIntData] = useState<PauseInterruptionData[]>([]);
  const [chartsLoading, setChartsLoading] = useState(false);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    getUser();
  }, []);

  // Load chart data
  useEffect(() => {
    if (!userId) return;

    const loadCharts = async () => {
      setChartsLoading(true);
      try {
        const [trend, focusDist, peakH, videoH, pauseInt] = await Promise.all([
          getChartDataDailyFocusTrend(userId, dayRange),
          getChartDataFocusVsDistraction(userId, dayRange),
          getChartDataPeakHours(userId),
          getChartDataVideoWatchHours(userId, dayRange),
          getChartDataPauseInterruptions(userId, dayRange),
        ]);

        setDailyTrendData(trend);
        setFocusVsDistData(focusDist);
        setPeakHoursData(peakH);
        setVideoHoursData(videoH);
        setPauseIntData(pauseInt);
      } catch (error) {
        console.error('Error loading charts:', error);
      } finally {
        setChartsLoading(false);
      }
    };

    loadCharts();
  }, [userId, dayRange]);

  const safeMetrics = {
    focus_time: metrics?.focus_time ?? 0,
    distraction_time: metrics?.distraction_time ?? 0,
    reflection_time: metrics?.reflection_time ?? 0,
    total_time: metrics?.total_time ?? 1,
    interruptions: metrics?.interruptions ?? 0,
    sessions_completed: metrics?.sessions_completed ?? 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-gray-400 animate-pulse">Loading your data...</div>
      </div>
    );
  }

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

  const toggleChart = (id: ChartType) => {
    setChartConfigs((prev) =>
      prev.map((config) => (config.id === id ? { ...config, enabled: !config.enabled } : config))
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6 text-gray-100">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-white mb-1">Analytics</h1>
        <p className="text-gray-500 mb-8">{new Date().toDateString()}</p>

        {/* Summary Cards */}
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

      {/* Insights */}
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

      {/* Behavior Summary */}
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

      {/* Charts Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold mb-1">Detailed Analytics</h3>
            <p className="text-gray-500 text-sm">Customize your view</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-400">Date Range:</label>
              <select
                value={dayRange}
                onChange={(e) => setDayRange(Number(e.target.value) as 7 | 14 | 30)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 cursor-pointer hover:bg-gray-700"
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart Selector Buttons */}
        <div className="mb-8 flex flex-wrap gap-2">
          {chartConfigs.map((config) => (
            <button
              key={config.id}
              onClick={() => toggleChart(config.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                config.enabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {config.label}
            </button>
          ))}
        </div>

        {/* Charts Grid */}
        {chartsLoading && (
          <div className="flex items-center justify-center py-12 text-gray-400 animate-pulse">
            Loading charts...
          </div>
        )}

        {!chartsLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {chartConfigs
              .filter((c) => c.enabled)
              .map((config) => (
                <div key={config.id}>
                  {config.id === 'dailyTrend' && dailyTrendData.length > 0 && (
                    <LineChartComponent
                      data={dailyTrendData}
                      dataKeys={[
                        { key: 'focusMinutes', name: 'Focus', stroke: '#10b981' },
                        { key: 'distractionMinutes', name: 'Distraction', stroke: '#f59e0b' },
                        { key: 'videoWatchMinutes', name: 'Video Watch', stroke: '#3b82f6' },
                      ]}
                      title="Daily Focus Trend"
                      xAxisKey="day"
                      height={350}
                    />
                  )}
                  {config.id === 'focusVsDistraction' && focusVsDistData.length > 0 && (
                    <BarChartComponent
                      data={focusVsDistData}
                      dataKeys={[
                        { key: 'focusPercentage', name: 'Focus', fill: '#10b981' },
                        { key: 'distractionPercentage', name: 'Distraction', fill: '#f59e0b' },
                        { key: 'otherPercentage', name: 'Other', fill: '#6b7280' },
                      ]}
                      title="Focus vs Distraction Breakdown"
                      xAxisKey="day"
                      layout="horizontal"
                      height={350}
                    />
                  )}
                  {config.id === 'peakHours' && peakHoursData.length > 0 && (
                    <HeatmapComponent
                      data={peakHoursData}
                      title="Peak Study Hours Heatmap"
                      height={400}
                    />
                  )}
                  {config.id === 'videoHours' && videoHoursData.length > 0 && (
                    <LineChartComponent
                      data={videoHoursData}
                      dataKeys={[
                        { key: 'videoWatchHours', name: 'Hours Watched', stroke: '#3b82f6' },
                      ]}
                      title="Video Watch Hours"
                      xAxisKey="day"
                      height={350}
                    />
                  )}
                  {config.id === 'pauseInterruptions' && pauseIntData.length > 0 && (
                    <BarChartComponent
                      data={pauseIntData}
                      dataKeys={[
                        { key: 'pauseCount', name: 'Pauses', fill: '#6366f1' },
                        { key: 'interruptionCount', name: 'Interruptions', fill: '#ef4444' },
                      ]}
                      title="Pause & Interruption Patterns"
                      xAxisKey="day"
                      height={350}
                    />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* GryndTube Analytics Section */}
      {userId && (
        <div className="mb-10">
          <button
            onClick={() => setShowGryndTube(!showGryndTube)}
            className="flex items-center justify-between w-full mb-6 p-4 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Play size={24} className="text-blue-400" />
              <div className="text-left">
                <h3 className="text-xl font-bold">GryndTube Analytics</h3>
                <p className="text-gray-500 text-sm">Track your video learning sessions</p>
              </div>
            </div>
            <ChevronDown
              size={20}
              className={`text-gray-400 transition-transform ${showGryndTube ? 'rotate-180' : ''}`}
            />
          </button>

          {showGryndTube && <GryndTubeAnalytics userId={userId} dayRange={dayRange} />}
        </div>
      )}
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
