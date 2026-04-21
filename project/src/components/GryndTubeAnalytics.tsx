import React, { useState, useEffect } from 'react';
import { Play, TrendingUp, Film } from 'lucide-react';
import { BarChartComponent } from './charts/BarChartComponent';
import { LineChartComponent } from './charts/LineChartComponent';
import {
  getChartDataVideoPerformance,
  getChartDataVideoChannels,
  getChartDataVideoWatchHours,
  getChartDataVideoSummary,
  VideoMetricsData,
  VideoChannelData,
} from '@/services/analyticsChartService';

interface GryndTubeAnalyticsProps {
  userId: string;
  dayRange: 7 | 14 | 30;
}

interface VideoStats {
  totalWatchHours: number;
  totalSessionCount: number;
  videoCount: number;
  avgCompletionRate: number;
}

export const GryndTubeAnalytics: React.FC<GryndTubeAnalyticsProps> = ({ userId, dayRange }) => {
  const [stats, setStats] = useState<VideoStats>({
    totalWatchHours: 0,
    totalSessionCount: 0,
    videoCount: 0,
    avgCompletionRate: 0,
  });

  const [topVideos, setTopVideos] = useState<VideoMetricsData[]>([]);
  const [topChannels, setTopChannels] = useState<VideoChannelData[]>([]);
  const [watchTrend, setWatchTrend] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadGryndTubeData = async () => {
      setIsLoading(true);
      try {
        const [videoPerf, channels, trend, summary] = await Promise.all([
          getChartDataVideoPerformance(userId, 10, dayRange),
          getChartDataVideoChannels(userId, 10, dayRange),
          getChartDataVideoWatchHours(userId, dayRange),
          getChartDataVideoSummary(userId, dayRange),
        ]);

        setTopVideos(videoPerf);
        setTopChannels(channels);
        setWatchTrend(trend);
        setStats(summary);
      } catch (error) {
        console.error('Error loading GryndTube analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGryndTubeData();
  }, [userId, dayRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400 animate-pulse">
        Loading video analytics...
      </div>
    );
  }

  // Prepare bar chart data for top videos
  const videoChartData = topVideos.slice(0, 5).map((video) => ({
    name: video.videoTitle.length > 20 ? video.videoTitle.substring(0, 20) + '...' : video.videoTitle,
    watchedHours: Number((video.totalWatchedSeconds / 3600).toFixed(1)),
    completionPercentage: Math.round(video.completionPercentage),
  }));

  // Prepare bar chart data for top channels
  const channelChartData = topChannels.slice(0, 5).map((channel) => ({
    name: channel.channelName.length > 15 ? channel.channelName.substring(0, 15) + '...' : channel.channelName,
    watchedHours: Number((channel.totalWatchedSeconds / 3600).toFixed(1)),
  }));

  const trendTitle =
    dayRange === 7 ? 'Last 7 Days Video Watch Trend' : `Last ${dayRange} Days Video Watch Trend`;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-800 rounded-lg text-blue-400">
              <Play size={20} />
            </div>
          </div>
          <h4 className="text-2xl font-bold">{stats.totalWatchHours}h</h4>
          <p className="text-xs text-gray-500">total watch time</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-800 rounded-lg text-cyan-400">
              <Film size={20} />
            </div>
          </div>
          <h4 className="text-2xl font-bold">{stats.videoCount}</h4>
          <p className="text-xs text-gray-500">videos watched</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-800 rounded-lg text-emerald-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <h4 className="text-2xl font-bold">{stats.totalSessionCount}</h4>
          <p className="text-xs text-gray-500">sessions</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-800 rounded-lg text-purple-400">
              <TrendingUp size={20} />
            </div>
          </div>
          <h4 className="text-2xl font-bold">{stats.avgCompletionRate}%</h4>
          <p className="text-xs text-gray-500">avg completion</p>
        </div>
      </div>

      {/* Charts Row 1: Top Videos and Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {videoChartData.length > 0 && (
          <BarChartComponent
            data={videoChartData}
            dataKeys={[
              { key: 'watchedHours', name: 'Watch Hours', fill: '#3b82f6' },
              { key: 'completionPercentage', name: 'Completion %', fill: '#10b981' },
            ]}
            title="Top Videos by Watch Time"
            xAxisKey="name"
            layout="vertical"
            height={300}
          />
        )}

        {channelChartData.length > 0 && (
          <BarChartComponent
            data={channelChartData}
            dataKeys={[{ key: 'watchedHours', name: 'Watch Hours', fill: '#a78bfa' }]}
            title="Top Channels"
            xAxisKey="name"
            layout="vertical"
            height={300}
          />
        )}
      </div>

      {/* Charts Row 2: Watch Trend */}
      {watchTrend.length > 0 && (
        <LineChartComponent
          data={watchTrend}
          dataKeys={[{ key: 'videoWatchHours', name: 'Hours Watched', stroke: '#3b82f6' }]}
          title={trendTitle}
          xAxisKey="day"
          height={350}
        />
      )}

      {/* Recent Videos Table */}
      {topVideos.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <h3 className="text-lg font-semibold mb-4">Recent Videos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Video Title</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Channel</th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">Watched</th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">Completion</th>
                  <th className="text-center text-gray-400 font-medium px-4 py-3">Last Watched</th>
                </tr>
              </thead>
              <tbody>
                {topVideos.slice(0, 5).map((video, idx) => (
                  <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                    <td className="text-gray-200 px-4 py-3 max-w-sm truncate">
                      {video.videoTitle}
                    </td>
                    <td className="text-gray-300 px-4 py-3">{video.channelName}</td>
                    <td className="text-center text-gray-300 px-4 py-3">
                      {Number((video.totalWatchedSeconds / 60).toFixed(0))}m
                    </td>
                    <td className="text-center px-4 py-3">
                      <span
                        className={`text-sm font-medium ${
                          video.completionPercentage >= 80
                            ? 'text-emerald-400'
                            : video.completionPercentage >= 50
                              ? 'text-blue-400'
                              : 'text-yellow-400'
                        }`}
                      >
                        {Math.round(video.completionPercentage)}%
                      </span>
                    </td>
                    <td className="text-center text-gray-400 px-4 py-3 text-xs">
                      {new Date(video.lastWatchedAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {topVideos.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 p-12 rounded-xl text-center">
          <p className="text-gray-400">No video watch data yet. Start watching to see analytics here!</p>
        </div>
      )}
    </div>
  );
};

export default GryndTubeAnalytics;
