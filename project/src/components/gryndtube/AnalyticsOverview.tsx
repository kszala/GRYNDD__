import { formatSeconds } from '../../utils/time';
import type { TopicAnalyticsSnapshot } from '../../types/gryndtube';

export function AnalyticsOverview({ analytics }: { analytics: TopicAnalyticsSnapshot }) {
  const cards = [
    { 
      label: 'Lecture hours', 
      value: `${analytics.totalLectureHours}h`, 
      subLabel: 'saved this topic',
      isAccented: false
    },
    { 
      label: 'Completion', 
      value: `${analytics.completionPercentage}%`, 
      subLabel: 'of saved playlist',
      isAccented: false
    },
    { 
      label: 'Time to finish', 
      value: analytics.totalDurationSeconds > 0
        ? formatSeconds(analytics.totalDurationSeconds - analytics.totalWatchedSeconds)
        : '-', 
      subLabel: 'at current pace',
      isAccented: false
    },
    { 
      label: 'Topic progress', 
      value: `${analytics.startedVideos} / ${analytics.totalVideos}`, 
      subLabel: 'videos watched',
      isAccented: true
    },
  ];

  return (
    <section className="grid gap-4 grid-cols-2 md:grid-cols-4">
      {cards.map((card) => (
        <article 
          key={card.label} 
          className={`rounded-lg border px-4 py-[14px] ${
            card.isAccented 
              ? 'border-[var(--grynd-accent)] bg-[var(--grynd-accent-dim)]' 
              : 'border-[var(--gt-border)] bg-[var(--gt-surface)]'
          }`}
        >
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gt-muted)] font-mono">{card.label}</p>
          <p className={`mt-1.5 text-[22px] leading-none font-mono ${
            card.isAccented ? 'text-[var(--gt-accent)]' : 'text-[var(--gt-text)]'
          }`}>{card.value}</p>
          <p className="mt-1 text-[11px] text-[var(--gt-muted)]">{card.subLabel}</p>
        </article>
      ))}
    </section>
  );
}
