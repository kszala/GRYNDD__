import type { YouTubeSearchResult } from '../services/youtube';

export interface GryndTubeSearchResult extends YouTubeSearchResult {
  durationSeconds: number;
}

export interface GryndTubeTopicPlaylistItem {
  id: string;
  playlistId: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  position: number;
  createdAt: string;
}

export interface GryndTubeTopicPlaylist {
  id: string;
  topicId: string;
  topicName: string;
  title: string;
  items: GryndTubeTopicPlaylistItem[];
  totalDurationSeconds: number;
}

export interface ContinueLearningItem {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  watchedSeconds: number;
  completionPercentage: number;
  pauseCount: number;
  seekCount: number;
  lastWatchedAt: string;
}

export interface GryndTubeFeed {
  playlist: GryndTubeTopicPlaylist | null;
  continueLearning: ContinueLearningItem | null;
}

export interface TopicAnalyticsSnapshot {
  totalLectureHours: number;
  completionPercentage: number;
  topicProgressLabel: string;
  totalWatchedSeconds: number;
  totalDurationSeconds: number;
  startedVideos: number;
  totalVideos: number;
}

export interface VideoSessionMetrics {
  watchedSeconds: number;
  pauseCount: number;
  seekCount: number;
  totalDurationSeconds: number;
}
