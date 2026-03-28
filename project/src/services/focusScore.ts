export type FocusScoreInput = {
  totalActiveSeconds: number;
  totalPauseSeconds: number;
  totalInterruptionSeconds: number;
  interruptionCount: number;
  totalSessionSeconds: number;
};

export function calculateFocusScore(input: FocusScoreInput): number {
  const {
    totalActiveSeconds,
    totalPauseSeconds,
    interruptionCount,
    totalSessionSeconds,
  } = input;

  if (totalSessionSeconds === 0) {
    return 0;
  }

  const activeRatio = totalActiveSeconds / totalSessionSeconds;
  let score = activeRatio * 100;

  score -= interruptionCount * 5;

  const pauseRatio = totalPauseSeconds / totalSessionSeconds;
  if (pauseRatio > 0.2) {
    score -= 10;
  }

  score = Math.max(0, Math.min(100, score));

  return Math.round(score);
}
