import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Brain, Zap, ArrowUp, ArrowDown, Minus, Play } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import GryndTubeAnalytics from './GryndTubeAnalytics';
import {
  getAttentionSummary,
  getAttentionBlocks,
  getClippedBlockInterval,
  calculateFocusMetrics,
  findBiggestLeak,
  formatDuration,
  type AttentionSummary,
  type FocusMetrics,
} from '@/services/attentionAnalyticsService';
import { mapBlock } from '@/services/attentionMapper';
import type { AttentionBlockRow } from '@/services/behaviorEngine';
import {
  computeBestStudyHours,
  computeInterruptionPatterns,
  computeSubjectPerformance,
  type HourlyFocusInsight,
  type InterruptionPatternInsight,
  type SubjectPerformanceInsight,
} from '@/services/behavioralInsights';
import { fetchSessionEvents } from '@/services/sessionEventAnalytics';
import { supabase } from '@/supabaseClient';
import { formatISTDayLabel, getISTNextMidnight } from '@/lib/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayTimelineEntry {
  day: string;
  focusMin: number;
  learningMin: number;
  lightMin: number;
  idleMin: number;
  distractionMin: number;
  interruptionMin: number;
}

interface PlatformEntry {
  platform: string;
  minutes: number;
  color: string;
}

interface ImprovementMetrics {
  focusDelta: number;   // minutes
  scoreDelta: number;   // percentage points
  distractionDelta: number; // minutes (positive = worse)
}

// ─── Data Layer (attention_blocks only) ───────────────────────────────────────

function domainFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  for (const k of ['domain', 'host', 'hostname'] as const) {
    const v = m[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function domainToPlatform(domain: string): string {
  if (!domain) return 'Other';
  const d = domain.toLowerCase();
  if (d.includes('youtube') || d.includes('youtu.be')) return 'YouTube';
  if (d.includes('pw.live') || d.includes('physicswallah')) return 'PW';
  if (d.includes('docs.google') || d.includes('sheets.google') || d.includes('drive.google')) return 'Docs/Sheets';
  if (d.includes('unacademy')) return 'Unacademy';
  if (d.includes('byjus')) return "BYJU'S";
  if (d.includes('khan') || d.includes('khanacademy')) return 'Khan Academy';
  return 'Other';
}

function emptyDayBuckets() {
  return {
    focusMin: 0,
    learningMin: 0,
    lightMin: 0,
    idleMin: 0,
    distractionMin: 0,
    interruptionMin: 0,
  };
}

async function getDailyFocusTimeline(
  userId: string,
  dayRange: number
): Promise<DayTimelineEntry[]> {
  const to = new Date();
  const from = new Date(to.getTime() - dayRange * 24 * 60 * 60 * 1000);

  const blocks = await getAttentionBlocks(userId, from, to);

  const dayMap: Record<string, ReturnType<typeof emptyDayBuckets>> = {};

  for (let i = dayRange - 1; i >= 0; i--) {
    const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
    const key = formatISTDayLabel(d);
    dayMap[key] = emptyDayBuckets();
  }

  for (const raw of blocks) {
    const block = raw as AttentionBlockRow;
    const clip = getClippedBlockInterval(block, from, to);
    if (!clip) continue;

    const isPaused = block.state === 'PAUSED';
    const category = isPaused ? ('paused' as const) : mapBlock(block);

    let t = clip.clipStartMs;
    const clipEnd = clip.clipEndMs;
    while (t < clipEnd) {
      const nextISTMidnight = getISTNextMidnight(new Date(t));
      const segEnd = Math.min(clipEnd, nextISTMidnight.getTime());
      const mins = (segEnd - t) / 60000;
      const key = formatISTDayLabel(new Date(t));

      const bucket = dayMap[key];
      if (bucket && mins > 0) {
        if (category === 'focus') bucket.focusMin += mins;
        else if (category === 'learning') bucket.learningMin += mins;
        else if (category === 'idle') bucket.idleMin += mins;
        else if (category === 'light' || category === 'break' || category === 'paused') {
          bucket.lightMin += mins;
        } else if (category === 'distraction') bucket.distractionMin += mins;
        else if (category === 'interruption') bucket.interruptionMin += mins;
      }

      t = segEnd;
    }
  }

  const result: DayTimelineEntry[] = [];
  for (let i = dayRange - 1; i >= 0; i--) {
    const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
    const key = formatISTDayLabel(d);
    result.push({
      day: key,
      ...(dayMap[key] || emptyDayBuckets()),
    });
  }

  return result;
}

async function getPlatformBreakdown(
  userId: string,
  dayRange: number
): Promise<PlatformEntry[]> {
  const to = new Date();
  const from = new Date(to.getTime() - dayRange * 24 * 60 * 60 * 1000);

  const blocks = await getAttentionBlocks(userId, from, to);

  const platformMap: Record<string, number> = {};
  for (const raw of blocks) {
    const block = raw as AttentionBlockRow;
    const domain = domainFromMetadata(block.metadata);
    if (!domain) continue;
    const clip = getClippedBlockInterval(block, from, to);
    if (!clip) continue;
    const platform = domainToPlatform(domain);
    platformMap[platform] = (platformMap[platform] || 0) + clip.durationSec / 60;
  }

  const COLORS: Record<string, string> = {
    YouTube: '#ef4444',
    PW: '#6366f1',
    'Docs/Sheets': '#10b981',
    Unacademy: '#f59e0b',
    "BYJU'S": '#8b5cf6',
    'Khan Academy': '#06b6d4',
    Other: '#374151',
  };

  return Object.entries(platformMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([platform, minutes]) => ({
      platform,
      minutes: Math.round(minutes),
      color: COLORS[platform] || '#374151',
    }));
}

async function getImprovementMetrics(
  userId: string,
  dayRange: number
): Promise<ImprovementMetrics | null> {
  const now = new Date();
  const currentFrom = new Date(now.getTime() - dayRange * 24 * 60 * 60 * 1000);
  const prevTo = new Date(currentFrom);
  const prevFrom = new Date(prevTo.getTime() - dayRange * 24 * 60 * 60 * 1000);

  const [currentSummary, prevSummary] = await Promise.all([
    getAttentionSummary(userId, currentFrom, now),
    getAttentionSummary(userId, prevFrom, prevTo),
  ]);

  if (!currentSummary || !prevSummary) return null;

  const currentMetrics = calculateFocusMetrics(currentSummary);
  const prevMetrics = calculateFocusMetrics(prevSummary);

  return {
    focusDelta: Math.round((currentMetrics.realFocus - prevMetrics.realFocus) / 60),
    scoreDelta: Math.round(currentMetrics.focusScore - prevMetrics.focusScore),
    distractionDelta: Math.round((currentMetrics.lostTime - prevMetrics.lostTime) / 60),
  };
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const TimelineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#1e2535',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <p style={{ color: '#9ca3af', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          <span style={{ color: '#d1d5db' }}>{entry.name}:</span>
          <span style={{ color: entry.color, fontWeight: 600 }}>{Math.round(entry.value)}m</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Analytics = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [dayRange, setDayRange] = useState<7 | 14 | 30>(7);

  // Attention-first state
  const [attentionSummary, setAttentionSummary] = useState<AttentionSummary | null>(null);
  const [focusMetrics, setFocusMetrics] = useState<FocusMetrics | null>(null);
  const [biggestLeak, setBiggestLeak] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New pipeline state
  const [timeline, setTimeline] = useState<DayTimelineEntry[]>([]);
  const [platforms, setPlatforms] = useState<PlatformEntry[]>([]);
  const [improvement, setImprovement] = useState<ImprovementMetrics | null>(null);
  const [bestStudyHours, setBestStudyHours] = useState<HourlyFocusInsight[]>([]);
  const [interruptionPatterns, setInterruptionPatterns] = useState<InterruptionPatternInsight[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformanceInsight[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      setLoading(true);
      try {
        const to = new Date();
        const from = new Date(to.getTime() - dayRange * 24 * 60 * 60 * 1000);

        const sessionEventsPromise = fetchSessionEvents(userId, from.toISOString(), to.toISOString());

        const [summary, tl, plat, imp, sessionEvents] = await Promise.all([
          getAttentionSummary(userId, from, to),
          getDailyFocusTimeline(userId, dayRange),
          getPlatformBreakdown(userId, dayRange),
          getImprovementMetrics(userId, dayRange),
          sessionEventsPromise,
        ]);

        const [hours, interruptions, subjects] = await Promise.all([
          computeBestStudyHours(userId, sessionEvents),
          computeInterruptionPatterns(userId, sessionEvents),
          computeSubjectPerformance(userId, sessionEvents),
        ]);

        if (summary) {
          setAttentionSummary(summary);
          setFocusMetrics(calculateFocusMetrics(summary));
          setBiggestLeak(findBiggestLeak(summary));
        }
        setTimeline(tl);
        setPlatforms(plat);
        setImprovement(imp);
        setBestStudyHours(hours);
        setInterruptionPatterns(interruptions);
        setSubjectPerformance(subjects);
      } catch (e) {
        console.error('Analytics load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, dayRange]);

  const pieData = attentionSummary
    ? [
        { label: 'Focus', value: Math.round(attentionSummary.focus / 60), color: '#10b981' },
        { label: 'Learning', value: Math.round(attentionSummary.learning / 60), color: '#6366f1' },
        { label: 'Idle', value: Math.round(attentionSummary.idle / 60), color: '#fbbf24' },
        {
          label: 'Light',
          value: Math.round((attentionSummary.light + attentionSummary.break) / 60),
          color: '#9ca3af',
        },
        { label: 'Distraction', value: Math.round(attentionSummary.distraction / 60), color: '#f59e0b' },
        { label: 'Interruption', value: Math.round(attentionSummary.interruption / 60), color: '#a855f7' },
      ].filter((d) => d.value > 0)
    : [];

  const totalPieMin = pieData.reduce((s, d) => s + d.value, 0);

  // Brutal truths
  const brutalTruths: { text: string; level: 'ok' | 'warn' | 'crit' }[] = [];
  if (focusMetrics && attentionSummary) {
    const lightMin = Math.round((attentionSummary.light + attentionSummary.break) / 60);
    const distractionMin = Math.round(attentionSummary.distraction / 60);
    const interruptionMin = Math.round(attentionSummary.interruption / 60);

    if (lightMin > 0) {
      brutalTruths.push({
        text: `You spent ${lightMin}m in light engagement (thinking, pauses, breaks, navigation).`,
        level: 'warn',
      });
    }
    if (distractionMin > 0) {
      brutalTruths.push({
        text: `You lost ${distractionMin}m due to actual distractions.`,
        level: distractionMin > 60 ? 'crit' : 'warn',
      });
    }
    if (interruptionMin > 0) {
      brutalTruths.push({
        text: `You were interrupted for ${interruptionMin}m.`,
        level: 'warn',
      });
    }
    if (biggestLeak && biggestLeak.category !== 'none') {
      const leakMin = Math.round(biggestLeak.duration / 60);
      const leakLabel =
        biggestLeak.category === 'distraction'
          ? 'distractions (away / tab, not interruptions)'
          : biggestLeak.category === 'interruption'
            ? 'interruptions'
            : biggestLeak.category === 'light'
              ? 'light engagement and breaks'
              : biggestLeak.category === 'paused'
                ? 'paused time'
                : biggestLeak.category;
      if (leakMin > 5) {
        brutalTruths.push({
          text: `Biggest leak: ${leakMin}m in ${leakLabel}.`,
          level: 'warn',
        });
      }
    }
    if (focusMetrics.focusScore < 50) {
      brutalTruths.push({
        text: `Focus score ${focusMetrics.focusScore}% — less than half your tracked time was productive (deep focus + engaged learning).`,
        level: 'crit',
      });
    } else if (focusMetrics.focusScore >= 80) {
      brutalTruths.push({
        text: `Focus score ${focusMetrics.focusScore}% — you were locked in. Keep it.`,
        level: 'ok',
      });
    }
    if (attentionSummary.total < 3600) {
      brutalTruths.push({
        text: `Only ${Math.round(attentionSummary.total / 60)}m tracked in ${dayRange} days. You're not putting in the hours.`,
        level: 'crit',
      });
    }

    const topPlatform = platforms[0];
    if (topPlatform && topPlatform.platform === 'YouTube' && topPlatform.minutes > 30) {
      brutalTruths.push({
        text: `YouTube ate ${topPlatform.minutes}m of your study time.`,
        level: topPlatform.minutes > 60 ? 'crit' : 'warn',
      });
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: '#4b5563', fontFamily: 'JetBrains Mono, monospace', fontSize: 13, letterSpacing: '0.05em' }}>
          reading your attention data...
        </p>
      </div>
    );
  }

  const maxPlatformMin = platforms[0]?.minutes || 1;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      color: '#e5e7eb',
      padding: '40px 32px',
      maxWidth: 1100,
      margin: '0 auto',
      fontFamily: 'DM Sans, system-ui, sans-serif',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
        <div>
          <p style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: '#4b5563',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f9fafb', margin: 0, letterSpacing: '-0.02em' }}>
            Performance Report
          </h1>
        </div>
        <select
          value={dayRange}
          onChange={(e) => setDayRange(Number(e.target.value) as 7 | 14 | 30)}
          style={{
            background: '#161b27',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: '8px 12px',
            color: '#9ca3af',
            fontSize: 13,
            cursor: 'pointer',
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none',
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* ── 1. Summary Strip ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(158px, 1fr))',
        gap: 12,
        marginBottom: 40,
      }}>
        <SummaryCard
          label="Deep Focus"
          value={focusMetrics ? formatDuration(focusMetrics.realFocus) : '—'}
          sub="FOCUS_ACTIVE"
          accent="#10b981"
        />
        <SummaryCard
          label="Learning"
          value={focusMetrics ? formatDuration(focusMetrics.learning) : '—'}
          sub="VIDEO_ENGAGED"
          accent="#6366f1"
        />
        <SummaryCard
          label="Focus Score"
          value={focusMetrics ? `${focusMetrics.focusScore}%` : '—'}
          sub={
            focusMetrics
              ? focusMetrics.focusScore >= 80 ? 'locked in'
                : focusMetrics.focusScore >= 60 ? 'decent'
                : 'needs work'
              : 'no data'
          }
          accent="#8b5cf6"
        />
        <SummaryCard
          label="Distractions"
          value={focusMetrics ? formatDuration(focusMetrics.lostTime) : '—'}
          sub="AWAY, not interruption"
          accent="#f59e0b"
        />
        <SummaryCard
          label="Idle Time"
          value={attentionSummary ? formatDuration(attentionSummary.idle) : '—'}
          sub="IDLE detected"
          accent="#fbbf24"
        />
        <SummaryCard
          label="Total Time"
          value={attentionSummary ? formatDuration(attentionSummary.total) : '—'}
          sub="tracked attention"
          accent="#9ca3af"
        />
      </div>

      {/* ── 2. Daily Focus Timeline (dominant) ── */}
      <Section label="02" title="Daily Focus Timeline">
        {timeline.length === 0 ? (
          <EmptyState text="No attention data for this period." />
        ) : (
          <div style={{ marginTop: 24 }}>
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={timeline} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gFocus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLearn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#9ca3af" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gIdle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gDistract" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gInterrupt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fill: '#4b5563' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace', fill: '#4b5563' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}m`}
                />
                <Tooltip content={<TimelineTooltip />} />
                <Area type="monotone" dataKey="focusMin" name="Focus" stackId="attn" stroke="#10b981" strokeWidth={1.5} fill="url(#gFocus)" />
                <Area type="monotone" dataKey="learningMin" name="Learning" stackId="attn" stroke="#6366f1" strokeWidth={1.5} fill="url(#gLearn)" />
                <Area type="monotone" dataKey="idleMin" name="Idle" stackId="attn" stroke="#fbbf24" strokeWidth={1.5} fill="url(#gIdle)" />
                <Area type="monotone" dataKey="lightMin" name="Light" stackId="attn" stroke="#9ca3af" strokeWidth={1.5} fill="url(#gLight)" />
                <Area type="monotone" dataKey="distractionMin" name="Distraction" stackId="attn" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gDistract)" />
                <Area type="monotone" dataKey="interruptionMin" name="Interruption" stackId="attn" stroke="#a855f7" strokeWidth={1.5} fill="url(#gInterrupt)" />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, paddingLeft: 4 }}>
              {[
                { color: '#10b981', label: 'Focus' },
                { color: '#6366f1', label: 'Learning' },
                { color: '#fbbf24', label: 'Idle' },
                { color: '#9ca3af', label: 'Light' },
                { color: '#f59e0b', label: 'Distraction' },
                { color: '#a855f7', label: 'Interruption' },
              ].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'JetBrains Mono, monospace' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* ── 3 + 4. Platform Breakdown & Focus vs Distraction (side-by-side) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Platform Breakdown */}
        <Section label="03" title="Platform Breakdown" style={{ marginBottom: 0 }}>
          {platforms.length === 0 ? (
            <EmptyState text="No domain data. Enable the GryndMode extension." />
          ) : (
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {platforms.map((p) => (
                <div key={p.platform}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 13, color: '#d1d5db' }}>{p.platform}</span>
                    <span style={{
                      fontSize: 12,
                      fontFamily: 'JetBrains Mono, monospace',
                      color: p.color,
                    }}>
                      {p.minutes >= 60
                        ? `${Math.floor(p.minutes / 60)}h ${p.minutes % 60}m`
                        : `${p.minutes}m`}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${(p.minutes / maxPlatformMin) * 100}%`,
                      background: p.color,
                      borderRadius: 2,
                      transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Focus vs Distraction */}
        <Section label="04" title="Attention Split" style={{ marginBottom: 0 }}>
          {pieData.length === 0 ? (
            <EmptyState text="No attention blocks recorded." />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 16 }}>
              <PieChart width={140} height={140}>
                <Pie
                  data={pieData}
                  dataKey="value"
                  cx={70}
                  cy={70}
                  innerRadius={42}
                  outerRadius={65}
                  paddingAngle={3}
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {pieData.map((d) => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block' }} />
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>{d.label}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: d.color }}>
                        {totalPieMin > 0 ? Math.round((d.value / totalPieMin) * 100) : 0}%
                      </span>
                      <span style={{
                        display: 'block',
                        fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#4b5563',
                      }}>{d.value}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* ── 5. Brutal Truth ── */}
      <Section label="05" title="Brutal Truth" style={{ marginBottom: 16 }}>
        {brutalTruths.length === 0 ? (
          <EmptyState text="Not enough data to generate insights." />
        ) : (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {brutalTruths.map((t, i) => (
              <BrutalLine key={i} text={t.text} level={t.level} />
            ))}
          </div>
        )}
      </Section>

      {/* ── 6. Improvement ── */}
      <Section label="06" title={`vs Previous ${dayRange} Days`} style={{ marginBottom: 16 }}>
        {!improvement ? (
          <EmptyState text="Need more historical data to compare periods." />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16 }}>
            <DeltaCard
              label="Focus Time"
              delta={improvement.focusDelta}
              unit="min"
              better="positive"
            />
            <DeltaCard
              label="Focus Score"
              delta={improvement.scoreDelta}
              unit="pts"
              better="positive"
            />
            <DeltaCard
              label="Distraction time"
              delta={improvement.distractionDelta}
              unit="min"
              better="negative"
            />
          </div>
        )}
      </Section>

      <Section label="07" title="Behavioral Insights" style={{ marginBottom: 16 }}>
        <div style={{ marginTop: 16, display: 'grid', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>Best Study Hours</p>
            {bestStudyHours.length === 0 ? (
              <EmptyState text="No session-event data available for study hour insights." />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {bestStudyHours.slice(0, 5).map((entry) => (
                  <div key={`hour-${entry.hour}`} style={{ fontSize: 13, color: '#d1d5db' }}>
                    {formatHourLabel(entry.hour)}: focus score {entry.avgFocusScore} from {entry.sessionCount} sessions
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>Interruption Patterns</p>
            {interruptionPatterns.length === 0 ? (
              <EmptyState text="No interruption patterns available for this range." />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {interruptionPatterns.slice(0, 5).map((entry) => (
                  <div key={`interrupt-${entry.hour}`} style={{ fontSize: 13, color: '#d1d5db' }}>
                    {formatHourLabel(entry.hour)}: {entry.totalInterruptions} interruptions across {entry.sessionCount} sessions
                    {' '}({entry.avgInterruptionsPerSession} avg/session)
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>Subject Performance</p>
            {subjectPerformance.length === 0 ? (
              <EmptyState text="No subject performance data available for this range." />
            ) : (
              <div style={{ display: 'grid', gap: 8 }}>
                {subjectPerformance.slice(0, 5).map((entry) => (
                  <div key={`subject-${entry.subjectId}`} style={{ fontSize: 13, color: '#d1d5db' }}>
                    {entry.subjectId}: focus {entry.avgFocusScore}, adherence {entry.avgAdherenceScore}, sessions {entry.sessionCount}, active {formatDuration(entry.totalActiveSeconds)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ── GryndTube ── */}
      {userId && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#161b27',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              color: '#9ca3af',
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Play size={18} color="#6366f1" />
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>GryndTube Analytics</p>
                <p style={{ margin: 0, fontSize: 12, color: '#4b5563', marginTop: 2 }}>Video learning sessions</p>
              </div>
            </div>
          </div>
          <GryndTubeAnalytics userId={userId} dayRange={dayRange} />
        </div>
      )}

    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SummaryCard = ({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) => (
  <div style={{
    background: '#161b27',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: '16px 18px',
    borderTop: `2px solid ${accent}`,
  }}>
    <p style={{
      margin: '0 0 10px',
      fontSize: 11,
      fontFamily: 'JetBrains Mono, monospace',
      color: '#4b5563',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {label}
    </p>
    <p style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: accent, letterSpacing: '-0.02em' }}>
      {value}
    </p>
    <p style={{ margin: 0, fontSize: 12, color: '#374151', fontFamily: 'JetBrains Mono, monospace' }}>
      {sub}
    </p>
  </div>
);

const Section = ({
  label,
  title,
  children,
  style,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div style={{
    background: '#161b27',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: '24px',
    marginBottom: 16,
    ...style,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        fontSize: 10,
        fontFamily: 'JetBrains Mono, monospace',
        color: '#374151',
        letterSpacing: '0.1em',
      }}>
        {label}
      </span>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#f3f4f6', letterSpacing: '-0.01em' }}>
        {title}
      </h2>
    </div>
    {children}
  </div>
);

const formatHourLabel = (hour: number): string => {
  const normalizedHour = hour % 24;
  const suffix = normalizedHour >= 12 ? 'PM' : 'AM';
  const displayHour = normalizedHour === 0 ? 12 : normalizedHour > 12 ? normalizedHour - 12 : normalizedHour;
  return `${displayHour}:00 ${suffix}`;
};

const EmptyState = ({ text }: { text: string }) => (
  <p style={{
    marginTop: 20,
    fontSize: 13,
    color: '#374151',
    fontFamily: 'JetBrains Mono, monospace',
    fontStyle: 'italic',
  }}>
    {text}
  </p>
);

const BrutalLine = ({ text, level }: { text: string; level: 'ok' | 'warn' | 'crit' }) => {
  const accent = level === 'crit' ? '#ef4444' : level === 'warn' ? '#f59e0b' : '#10b981';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      padding: '12px 14px',
      background: `${accent}08`,
      border: `1px solid ${accent}1a`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: '0 8px 8px 0',
    }}>
      <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>{text}</span>
    </div>
  );
};

const DeltaCard = ({
  label,
  delta,
  unit,
  better,
}: {
  label: string;
  delta: number;
  unit: string;
  better: 'positive' | 'negative';
}) => {
  const isGood = better === 'positive' ? delta > 0 : delta < 0;
  const isNeutral = delta === 0;
  const color = isNeutral ? '#4b5563' : isGood ? '#10b981' : '#ef4444';
  const Icon = isNeutral ? Minus : delta > 0 ? ArrowUp : ArrowDown;

  return (
    <div style={{
      background: '#1e2535',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 10,
      padding: '14px 16px',
    }}>
      <p style={{
        margin: '0 0 10px',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: '#4b5563',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={16} color={color} />
        <span style={{ fontSize: 20, fontWeight: 700, color }}>
          {Math.abs(delta)}{unit}
        </span>
      </div>
      <p style={{
        margin: '6px 0 0',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, monospace',
        color: '#374151',
      }}>
        {isNeutral ? 'no change' : isGood ? 'improvement' : 'regression'}
      </p>
    </div>
  );
};

export default Analytics;
