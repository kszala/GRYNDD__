import { youtubeService as youtubeApi } from './youtube';
import { formatSeconds } from '../utils/time';
import type { GryndTubeSearchResult } from '../types/gryndtube';

const SEARCH_CACHE_PREFIX = 'gryndtube:search:';
const STUDY_POSITIVE_KEYWORDS = [
  'lecture',
  'class',
  'chapter',
  'revision',
  'exam',
  'jee',
  'neet',
  'cbse',
  'ncert',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'history',
  'geography',
  'economics',
  'tutorial',
  'course',
  'syllabus',
  'question',
  'solution',
  'notes',
  'practice',
  'strategy',
  'board',
  'science',
  'coding',
  'programming',
  'algebra',
  'calculus',
  'organic',
  'playlist',
];

const STUDY_NEGATIVE_KEYWORDS = [
  'prank',
  'roast',
  'reaction',
  'vlog',
  'meme',
  'movie',
  'trailer',
  'song',
  'music video',
  'dance',
  'shorts',
  'asmr',
  'gaming',
  'highlights',
  'podcast clip',
  'gossip',
  'romance',
];

const normalizeText = (value: string) => value.toLowerCase();
const getCacheKey = (query: string) => `${SEARCH_CACHE_PREFIX}${query.trim().toLowerCase()}`;

const readCachedResults = (query: string): GryndTubeSearchResult[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(getCacheKey(query));
    return raw ? (JSON.parse(raw) as GryndTubeSearchResult[]) : null;
  } catch {
    return null;
  }
};

const writeCachedResults = (query: string, results: GryndTubeSearchResult[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(getCacheKey(query), JSON.stringify(results));
  } catch {
    // Ignore cache write errors.
  }
};

const getStudyScore = (query: string, result: GryndTubeSearchResult) => {
  const haystack = normalizeText(
    `${query} ${result.title} ${result.channelTitle} ${result.description || ''}`
  );

  let score = result.type === 'playlist' ? 1 : 0;

  for (const keyword of STUDY_POSITIVE_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score += 1;
    }
  }

  for (const keyword of STUDY_NEGATIVE_KEYWORDS) {
    if (haystack.includes(keyword)) {
      score -= 3;
    }
  }

  return score;
};

const filterStudyResults = (query: string, results: GryndTubeSearchResult[]) =>
  results
    .filter((result) => {
      if (result.type !== 'video' && result.type !== 'playlist') {
        return false;
      }

      if (result.type === 'video' && (result.durationSeconds || 0) < 60) {
        return false;
      }

      return true;
    })
    .map((result) => ({ result, score: getStudyScore(query, result) }))
    .filter(({ score }) => score >= 1)
    .sort((left, right) => right.score - left.score)
    .map(({ result }) => result);

const parseDurationLabelToSeconds = (label: string): number => {
  if (!label) {
    return 0;
  }

  const parts = label.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return 0;
};

export const youtubeService = {
  formatSeconds,

  async search(query: string): Promise<GryndTubeSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    const cached = readCachedResults(trimmedQuery);
    if (cached) {
      return cached;
    }

    const results = await youtubeApi.searchContent(trimmedQuery, 18);
    const filtered = filterStudyResults(
      trimmedQuery,
      results.map((result) => ({
        ...result,
        durationSeconds: result.durationSeconds || 0,
      }))
    );

    writeCachedResults(trimmedQuery, filtered);
    return filtered;
  },

  async getPlaylist(playlistId: string) {
    return youtubeApi.fetchPlaylist(playlistId);
  },

  async getVideo(videoId: string) {
    const video = await youtubeApi.fetchVideo(videoId);

    return {
      videoId,
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnail: video.thumbnails?.medium?.url || video.thumbnails?.high?.url || video.thumbnails?.default?.url || '',
      duration: video.duration,
      durationSeconds: parseDurationLabelToSeconds(video.duration),
    };
  },
};
