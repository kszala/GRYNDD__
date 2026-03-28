import { formatSeconds } from '../utils/time';
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = import.meta.env.VITE_YT_API_KEY as string;
const YOUTUBE_API_KEYS = (import.meta.env.VITE_YT_API_KEYS as string | undefined) || '';

const isPlaceholderKey = (key: string) => {
  const normalizedKey = key.trim().toLowerCase();
  const looksLikePlaceholder =
    normalizedKey.includes('your_') ||
    normalizedKey.includes('placeholder') ||
    normalizedKey.includes('api key here') ||
    normalizedKey.includes('your_actual') ||
    normalizedKey.includes('restricted_api_key_here');
  return looksLikePlaceholder;
};

const getYouTubeApiKeys = (): string[] => {
  const parsedList = YOUTUBE_API_KEYS.split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const merged = Array.from(new Set([YOUTUBE_API_KEY, ...parsedList].map((key) => key?.trim()).filter(Boolean)));
  const validKeys = merged.filter((key) => !isPlaceholderKey(key));

  if (validKeys.length === 0) {
    if (merged.length > 0) {
      throw new Error('YouTube API keys appear to be placeholders. Set real keys in .env.local.');
    }
    throw new Error('VITE_YT_API_KEY (or VITE_YT_API_KEYS) is not set in environment variables.');
  }

  return validKeys;
};

const buildYoutubeUrl = (base: string, apiKey: string) => {
  if (!apiKey) throw new Error('YouTube API key is missing.');
  if (isPlaceholderKey(apiKey)) {
    throw new Error('VITE_YT_API_KEY appears to be a placeholder. Set a real YouTube Data API v3 key in .env.local.');
  }
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}key=${encodeURIComponent(apiKey)}`;
};

const youtubeFetch = async (baseUrl: string, options?: RequestInit): Promise<Response> => {
  const apiKeys = getYouTubeApiKeys();
  let lastKeyErrorResponse: Response | null = null;
  let lastNetworkError: unknown = null;

  for (const apiKey of apiKeys) {
    const url = buildYoutubeUrl(baseUrl, apiKey);

    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }

      // Try the next key only for key/auth/quota related failures.
      if (response.status === 400 || response.status === 401 || response.status === 403) {
        lastKeyErrorResponse = response;
        continue;
      }

      return response;
    } catch (error: unknown) {
      lastNetworkError = error;
      // Network errors may be transient per key path/CDN edge, so continue trying keys.
      continue;
    }
  }

  if (lastKeyErrorResponse) {
    return lastKeyErrorResponse;
  }

  throw lastNetworkError instanceof Error ? lastNetworkError : new Error('YouTube API call failed.');
};

export interface YouTubeVideo {
  id: string;
  title: string;
  videoId: string;
  duration: string;
  durationSeconds?: number;
  thumbnail: string;
  channelTitle: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  channelId: string;
  type: 'video' | 'playlist' | 'channel';
  videoId?: string;
  playlistId?: string;
  duration: string;
  durationSeconds?: number;
  videoCount?: number;
  description?: string;
  publishedAt?: string;
  subscriberCount?: string;
  isVerified?: boolean;
}

export interface YouTubeVideoDetails {
  id: string;
  duration: string;
  title: string;
  channelTitle: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  videos: YouTubeVideo[];
  totalVideos: number;
}

export interface YouTubePlayer {
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlaybackRate: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
}

export class YouTubeService {
  private static instance: YouTubeService;
  private readonly MAX_API_BATCH_SIZE = 50;

  static getInstance(): YouTubeService {
    if (!YouTubeService.instance) {
      YouTubeService.instance = new YouTubeService();
    }
    return YouTubeService.instance;
  }

  private parseDurationToSeconds(duration: string): number {
    const match = duration?.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]?.replace('H', '') || '0');
    const minutes = parseInt(match[2]?.replace('M', '') || '0');
    const seconds = parseInt(match[3]?.replace('S', '') || '0');
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  private extractPlaylistId(url: string): string | null {
    try {
      const patterns = [
        /[?&]list=([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]+)$/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  private formatDuration(duration: string): string {
    try {
      if (!duration || duration === 'PT0S') return '0:00';
      
      const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (!match) return '0:00';

      const hours = parseInt(match[1]?.replace('H', '') || '0');
      const minutes = parseInt(match[2]?.replace('M', '') || '0');
      const seconds = parseInt(match[3]?.replace('S', '') || '0');

      return formatSeconds(hours * 3600 + minutes * 60 + seconds);
    } catch {
      return '0:00';
    }
  }

  private chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  }

  private formatSubscriberCount(rawCount: string | number | undefined): string {
    const count = Number(rawCount || 0);

    if (!Number.isFinite(count) || count <= 0) {
      return '';
    }

    if (count >= 1_000_000_000) {
      return `${(count / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B subscribers`;
    }

    if (count >= 1_000_000) {
      return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M subscribers`;
    }

    if (count >= 1_000) {
      return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K subscribers`;
    }

    return `${count} subscribers`;
  }

  async searchContent(query: string, maxResults = 18): Promise<YouTubeSearchResult[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    getYouTubeApiKeys();

    const encodedQuery = encodeURIComponent(trimmedQuery);
    const searchResponse = await youtubeFetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodedQuery}&type=video,playlist&maxResults=${maxResults}`
    );

    if (!searchResponse.ok) {
      if (searchResponse.status === 403) {
        throw new Error('GryndTube search failed: all configured YouTube API keys are invalid or quota-exhausted. Check VITE_YT_API_KEY/VITE_YT_API_KEYS.');
      }

      throw new Error(`YouTube search failed: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const searchData = await searchResponse.json();
    const items = Array.isArray(searchData.items) ? searchData.items : [];

    const videoIds = items
      .filter((item: any) => item.id?.kind === 'youtube#video')
      .map((item: any) => item.id.videoId)
      .filter(Boolean);

    const playlistIds = items
      .filter((item: any) => item.id?.kind === 'youtube#playlist')
      .map((item: any) => item.id.playlistId)
      .filter(Boolean);

    const [videoDetailsResponse, playlistDetailsResponse] = await Promise.all([
      videoIds.length > 0
        ? youtubeFetch(`${YOUTUBE_API_BASE}/videos?part=contentDetails&id=${videoIds.join(',')}`)
        : Promise.resolve(null),
      playlistIds.length > 0
        ? youtubeFetch(`${YOUTUBE_API_BASE}/playlists?part=contentDetails&id=${playlistIds.join(',')}`)
        : Promise.resolve(null)
    ]);

    const videoDetailsData = videoDetailsResponse && videoDetailsResponse.ok
      ? await videoDetailsResponse.json()
      : { items: [] };
    const playlistDetailsData = playlistDetailsResponse && playlistDetailsResponse.ok
      ? await playlistDetailsResponse.json()
      : { items: [] };
    const videoDurations = new Map<string, { duration: string; durationSeconds: number }>(
      (videoDetailsData.items || []).map((item: any) => {
        const rawDuration = item.contentDetails?.duration || 'PT0S';
        const durationSeconds = this.parseDurationToSeconds(rawDuration);
        return [
          item.id,
          {
            duration: this.formatDuration(rawDuration),
            durationSeconds
          }
        ];
      })
    );

    const playlistCounts = new Map<string, number>(
      (playlistDetailsData.items || []).map((item: any) => [
        item.id,
        item.contentDetails?.itemCount || 0
      ])
    );

    return items.flatMap((item: any): YouTubeSearchResult[] => {
      const snippet = item.snippet || {};
      const thumbnails = snippet.thumbnails || {};
      const kind = item.id?.kind;

      if (kind === 'youtube#video' && item.id.videoId) {
        const durationInfo = videoDurations.get(item.id.videoId);

        return [{
          id: item.id.videoId,
          title: snippet.title || 'Untitled Video',
          thumbnail: thumbnails.medium?.url || thumbnails.high?.url || thumbnails.default?.url || '',
          channelTitle: snippet.channelTitle || 'Unknown Channel',
          channelId: snippet.channelId || '',
          type: 'video',
          videoId: item.id.videoId,
          duration: durationInfo?.duration || '0:00',
          durationSeconds: durationInfo?.durationSeconds || 0,
          description: snippet.description || '',
          publishedAt: snippet.publishedAt || ''
        }];
      }

      if (kind === 'youtube#playlist' && item.id.playlistId) {
        const videoCount = playlistCounts.get(item.id.playlistId) || 0;

        return [{
          id: item.id.playlistId,
          title: snippet.title || 'Untitled Playlist',
          thumbnail: thumbnails.medium?.url || thumbnails.high?.url || thumbnails.default?.url || '',
          channelTitle: snippet.channelTitle || 'Unknown Channel',
          channelId: snippet.channelId || '',
          type: 'playlist',
          playlistId: item.id.playlistId,
          duration: `${videoCount} video${videoCount === 1 ? '' : 's'}`,
          videoCount,
          description: snippet.description || '',
          publishedAt: snippet.publishedAt || ''
        }];
      }

      return [];
    });
  }

  async fetchVideo(url: string): Promise<YouTubeVideoDetails> {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('Invalid YouTube video URL. Please provide a valid video URL or ID.');
      }

      const response = await youtubeFetch(
        `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoId}`
      );

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('YouTube API quota exceeded or invalid API key.');
        }
        if (response.status === 404) {
          throw new Error('Video not found. Please check the URL and ensure the video is public.');
        }
        throw new Error(`YouTube API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('Video not found or is private.');
      }

      const video = data.items[0];
      
      // Safe property access with fallbacks
      const snippet = video.snippet || {};
      const contentDetails = video.contentDetails || {};
      const thumbnails = snippet.thumbnails || {};
      
      return {
        id: video.id || videoId,
        duration: this.formatDuration(contentDetails.duration || 'PT0S'),
        title: snippet.title || 'Untitled Video',
        channelTitle: snippet.channelTitle || 'Unknown Channel',
        thumbnails: {
          default: thumbnails.default || { url: '' },
          medium: thumbnails.medium || { url: '' },
          high: thumbnails.high || { url: '' }
        }
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('Error fetching video.');
    }
  }

  private extractVideoId(url: string): string | null {
    try {
      const patterns = [
        /(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /^([a-zA-Z0-9_-]{11})$/
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  async fetchPlaylist(playlistUrl: string): Promise<YouTubePlaylist> {
    try {
      getYouTubeApiKeys();

      const playlistId = this.extractPlaylistId(playlistUrl);
      if (!playlistId) {
        throw new Error('Invalid YouTube playlist URL. Please provide a valid playlist URL or ID.');
      }

      const playlistResponse = await youtubeFetch(
        `${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&id=${playlistId}`
      );

      if (!playlistResponse.ok) {
        if (playlistResponse.status === 403) {
          throw new Error('YouTube API quota exceeded or invalid API key. Please check your API key and quota.');
        }
        if (playlistResponse.status === 404) {
          throw new Error('Playlist not found. Please check the URL and ensure the playlist is public.');
        }
        throw new Error(`YouTube API error: ${playlistResponse.status} ${playlistResponse.statusText}`);
      }

      const playlistData = await playlistResponse.json();
      if (!playlistData.items || playlistData.items.length === 0) {
        throw new Error('Playlist not found or is private. Please ensure the playlist is public and the URL is correct.');
      }

      const playlist = playlistData.items[0];
      const playlistSnippet = playlist.snippet || {};

      let allVideos: any[] = [];
      let nextPageToken = '';

      do {
        const itemsUrl = `${YOUTUBE_API_BASE}/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
        const itemsResponse = await youtubeFetch(itemsUrl);

        if (!itemsResponse.ok) {
          if (itemsResponse.status === 403) {
            throw new Error('YouTube API quota exceeded. Please try again later.');
          }
          throw new Error(`Failed to fetch playlist items: ${itemsResponse.status} ${itemsResponse.statusText}`);
        }

        const itemsData = await itemsResponse.json();
        if (itemsData.items && itemsData.items.length > 0) {
          allVideos = allVideos.concat(itemsData.items);
        }

        nextPageToken = itemsData.nextPageToken || '';
      } while (nextPageToken);

      if (allVideos.length === 0) {
        throw new Error('No videos found in this playlist. The playlist might be empty or all videos are private.');
      }

      const videoIds = allVideos
        .map((item: any) => item.snippet?.resourceId?.videoId)
        .filter(Boolean);

      const batchedVideoResponses = await Promise.all(
        this.chunkArray(videoIds, this.MAX_API_BATCH_SIZE).map(async (batch) => {
          const response = await youtubeFetch(
            `${YOUTUBE_API_BASE}/videos?part=contentDetails,snippet&id=${batch.join(',')}`
          );

          return response.ok ? response.json() : { items: [] };
        })
      );

      type VideoDetail = { duration: string; channelTitle: string };
      const videoDetails: Map<string, VideoDetail> = new Map(
        batchedVideoResponses
          .flatMap((response: any) => response.items || [])
          .map((video: any) => [
            video.id,
            {
              duration: video.contentDetails?.duration || 'PT0S',
              channelTitle: video.snippet?.channelTitle || 'Unknown Channel'
            }
          ])
      );

      const videos: YouTubeVideo[] = allVideos
        .filter((item: any) => item.snippet?.resourceId?.videoId)
        .map((item: any, index: number) => {
          const itemSnippet = item.snippet || {};
          const resourceId = itemSnippet.resourceId || {};
          const videoId = resourceId.videoId;
          const details = videoDetails.get(videoId);
          const rawDuration = details?.duration || 'PT0S';
          const thumbnails = itemSnippet.thumbnails || {};

          return {
            id: `${videoId}-${index}`,
            title: itemSnippet.title || 'Untitled Video',
            videoId,
            duration: this.formatDuration(rawDuration),
            durationSeconds: this.parseDurationToSeconds(rawDuration),
            thumbnail: thumbnails.medium?.url || thumbnails.default?.url || '',
            channelTitle: details?.channelTitle || itemSnippet.videoOwnerChannelTitle || 'Unknown Channel'
          };
        })
        .filter((video) =>
          (video.title !== 'Private video' &&
            video.title !== 'Deleted video' &&
            video.title !== 'Untitled Video') || Boolean(video.videoId)
        );

      const expectedTotalVideos = playlist.contentDetails?.itemCount || videos.length;

      return {
        id: playlistId,
        title: playlistSnippet.title || 'Untitled Playlist',
        description: playlistSnippet.description || '',
        videos,
        totalVideos: expectedTotalVideos,
      };
    } catch (error: unknown) {
      throw error instanceof Error ? error : new Error('YouTube playlist fetch failed.');
    }
  }

}

export const youtubeService = YouTubeService.getInstance();
