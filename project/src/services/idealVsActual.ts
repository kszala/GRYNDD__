export interface IdealVsActualInput {
  planned_duration_seconds: number;
  active_focus_seconds: number;
}

export interface IdealVsActualResult {
  adherenceScore: number;
  deltaSeconds: number;
  status: 'completed' | 'undershot' | 'overshot';
}

export function computeIdealVsActual(
  input: IdealVsActualInput
): IdealVsActualResult {
  const { planned_duration_seconds, active_focus_seconds } = input;

  if (planned_duration_seconds <= 0) {
    return { adherenceScore: 0, deltaSeconds: 0, status: 'completed' };
  }

  const raw = (active_focus_seconds / planned_duration_seconds) * 100;
  const adherenceScore = Math.round(Math.min(100, Math.max(0, raw)));
  const deltaSeconds = active_focus_seconds - planned_duration_seconds;

  const status =
    Math.abs(deltaSeconds) < 60
      ? 'completed'
      : deltaSeconds < 0
        ? 'undershot'
        : 'overshot';

  return { adherenceScore, deltaSeconds, status };
}
