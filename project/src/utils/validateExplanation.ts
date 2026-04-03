export type ExplanationValidationFailure =
  | 'word_count'
  | 'unique_ratio'
  | 'word_quality'
  | 'typing_speed';

export type ExplanationValidationResult = {
  isValid: boolean;
  failure: ExplanationValidationFailure | null;
  message: string | null;
  warning: string | null;
  totalWords: number;
  uniqueWordRatio: number;
  qualityRatio: number;
  requiredTypingTimeMs: number;
};

const STOPWORDS = new Set(['the', 'was', 'to', 'and', 'a', 'is', 'of', 'in', 'for', 'on']);

const VERB_PATTERN = /\b(did|went|studied|talked|worked|ate|slept|called|walked|read|wrote|made|fixed|helped|reviewed)\b/i;

const tokenizeWords = (text: string): string[] =>
  text
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9']/gi, ''))
    .filter(Boolean);

export const validateExplanation = (
  text: string,
  minWords: number,
  typingTimeMs: number = Number.POSITIVE_INFINITY
): ExplanationValidationResult => {
  const words = tokenizeWords(text);
  const contentWords = words.filter((word) => !STOPWORDS.has(word));
  const totalWords = words.length;
  const uniqueWords = new Set(contentWords).size;
  const qualityWordCount = words.filter((word) => word.length > 2).length;
  const uniqueWordRatio = contentWords.length > 0 ? uniqueWords / contentWords.length : 0;
  const qualityRatio = totalWords > 0 ? qualityWordCount / totalWords : 0;
  const requiredTypingTimeMs = Math.max(0, minWords) * 300;
  const softTypingThresholdMs = Math.max(0, minWords) * 200;

  if (totalWords < minWords) {
    return {
      isValid: false,
      failure: 'word_count',
      message: `Please write at least ${minWords} words.`,
      warning: null,
      totalWords,
      uniqueWordRatio,
      qualityRatio,
      requiredTypingTimeMs,
    };
  }

  if (uniqueWordRatio < 0.3) {
    return {
      isValid: false,
      failure: 'unique_ratio',
      message: 'Please add more variety. At least 30% of non-stopwords should be unique.',
      warning: null,
      totalWords,
      uniqueWordRatio,
      qualityRatio,
      requiredTypingTimeMs,
    };
  }

  if (qualityRatio < 0.7) {
    return {
      isValid: false,
      failure: 'word_quality',
      message: 'Please use clearer words. At least 70% of words must be longer than 2 characters.',
      warning: null,
      totalWords,
      uniqueWordRatio,
      qualityRatio,
      requiredTypingTimeMs,
    };
  }

  if (!VERB_PATTERN.test(text)) {
    return {
      isValid: false,
      failure: 'word_quality',
      message: 'Please include a concrete action (for example: studied, talked, worked, called).',
      warning: null,
      totalWords,
      uniqueWordRatio,
      qualityRatio,
      requiredTypingTimeMs,
    };
  }

  const warning = typingTimeMs < softTypingThresholdMs
    ? 'Typed very fast. Please add a little more detail if this is too short.'
    : null;

  return {
    isValid: true,
    failure: null,
    message: null,
    warning,
    totalWords,
    uniqueWordRatio,
    qualityRatio,
    requiredTypingTimeMs,
  };
};
