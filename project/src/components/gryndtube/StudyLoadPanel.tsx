import { formatSeconds } from '../../utils/time';

interface StudyLoadPanelProps {
  totalDuration: number;
}

export function StudyLoadPanel({ totalDuration }: StudyLoadPanelProps) {
  const dailyTarget = 2 * 3600; // 2 hours in seconds
  const days = Math.ceil(totalDuration / dailyTarget);

  return (
    <div className="rounded-lg border border-[var(--gt-border)] bg-[var(--gt-surface)] p-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gt-muted)] font-mono">Study Load</p>
      <p className="text-[20px] text-[var(--gt-text)] font-mono">
        {formatSeconds(totalDuration)}
      </p>
      <p className="text-[12px] text-[var(--gt-soft)] mt-1">
        ~= {days} days ({formatSeconds(dailyTarget)}/day)
      </p>
    </div>
  );
}
