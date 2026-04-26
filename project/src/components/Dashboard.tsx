import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PomodoroWidget } from './PomodoroWidget';
import { storage } from '../utils/storage';
import { formatDuration, isToday } from '../utils/time';
import { TrendingUp, Target, Brain, ArrowUpRight, Activity } from 'lucide-react';
import { getPeakFocusWindow } from '../services/behaviorTracking';
import { supabase } from '../supabaseClient';
import { addTask, GryndFlowTask } from '../services/gryndflowService';
import {
  getAttentionBlocks,
  getAttentionSummary,
  type AttentionSummary,
  formatDuration as formatAttentionDuration,
} from '../services/attentionAnalyticsService';
import {
  analyzeBehavior,
  medianSeconds,
  getTopDistractionReason,
  getBestFocusSessionSecondsToday,
} from '../services/behaviorEngine';

/*
 * Font stacks — no Google Fonts import needed.
 * These are the native system fonts on Windows / macOS / Linux.
 * They are always available, always render crisply, never feel "AI".
 */
const MONO = `'SF Mono', 'Fira Code', 'Consolas', 'Menlo', monospace`;
const UI = `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

export const Dashboard: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [peakFocus, setPeakFocus] = useState<any>(null);
  const [userName, setUserName] = useState('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [nlpInput, setNlpInput] = useState('');
  const [recentTask, setRecentTask] = useState<GryndFlowTask | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const [behaviorLoading, setBehaviorLoading] = useState(true);
  const [avgFocusMinutes, setAvgFocusMinutes] = useState<number | null>(null);
  const [medianDropMinutes, setMedianDropMinutes] = useState<number | null>(null);
  const [topDistraction, setTopDistraction] = useState<string | null>(null);
  const [bestFocusTodaySec, setBestFocusTodaySec] = useState<number | null>(null);
  const [todaySummary, setTodaySummary] = useState<AttentionSummary | null>(null);
  const [todaySessionCount, setTodaySessionCount] = useState<number | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const tick = () => {
      const now = new Date();
      setCurrentTime(now);
      const h = now.getHours();
      setTimeOfDay(h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) setUserId(user.id);
      if (user?.user_metadata?.full_name) setUserName(user.user_metadata.full_name.split(' ')[0]);
      else if (user?.email) setUserName(user.email.split('@')[0]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setPeakFocus(await getPeakFocusWindow(user?.id ?? 'user-placeholder'));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!userId) {
      setBehaviorLoading(false);
      return;
    }

    (async () => {
      setBehaviorLoading(true);
      try {
        const to = new Date();
        const from14 = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
        const blocks14 = await getAttentionBlocks(userId, from14, to);
        const analysis = analyzeBehavior(blocks14);

        if (analysis.avgFocusDuration != null) {
          setAvgFocusMinutes(Math.round(analysis.avgFocusDuration / 60));
        } else {
          setAvgFocusMinutes(null);
        }

        const med = medianSeconds(analysis.dropPoints);
        setMedianDropMinutes(med != null ? Math.round(med / 60) : null);

        setTopDistraction(getTopDistractionReason(analysis.distractionTriggers));

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const blocksToday = await getAttentionBlocks(userId, startOfDay, to);
        setBestFocusTodaySec(getBestFocusSessionSecondsToday(blocksToday));
      } catch {
        setAvgFocusMinutes(null);
        setMedianDropMinutes(null);
        setTopDistraction(null);
        setBestFocusTodaySec(null);
      } finally {
        setBehaviorLoading(false);
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setTodaySummary(null);
      setTodaySessionCount(null);
      return;
    }

    (async () => {
      try {
        const now = new Date();
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const [summary, blocksToday] = await Promise.all([
          getAttentionSummary(userId, startOfDay, now),
          getAttentionBlocks(userId, startOfDay, now),
        ]);

        setTodaySummary(summary);
        setTodaySessionCount(blocksToday ? new Set(blocksToday.map((block: any) => block.session_id)).size : 0);
      } catch {
        setTodaySummary(null);
        setTodaySessionCount(null);
      }
    })();
  }, [userId]);

  const sessions = storage.getSessions();
  const todaySessions = sessions.filter((s) => isToday(s.startTime));
  const todayFocusTime = todaySummary?.focus ?? 0;
  const todayIdleTime = todaySummary?.idle ?? 0;
  const todayDistractionTime = todaySummary?.distraction ?? 0;
  const todayInterruptionTime = todaySummary?.interruption ?? 0;
  const displayedTodaySessionCount = todaySessionCount !== null ? todaySessionCount : todaySessions.length;

  const focusScore = Math.min(Math.round((todayFocusTime / 3600) * 100 + 12), 100) || 12;
  const consistency = 82;
  const delta = todayFocusTime / 3600 - 4;
  const peakLabel = peakFocus?.peakHourLabel ?? '9:00 AM';

  const handleAddNLPTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlpInput.trim() || isAddingTask) return;
    setIsAddingTask(true);
    const m = nlpInput.match(/(.*) from (\d+)\s*(am|pm) to (\d+)\s*(am|pm)/i);
    let data: any;
    if (m) {
      const [, text, s, sa, en, ea] = m;
      const sh = sa.toLowerCase() === 'pm' ? +s + 12 : +s;
      const eh = ea.toLowerCase() === 'pm' ? +en + 12 : +en;
      data = {
        text: text.trim(),
        priority: 'normal',
        completed: false,
        category: 'learning',
        time: `${String(sh).padStart(2, '0')}:00`,
        endTime: `${String(eh).padStart(2, '0')}:00`,
        duration: (eh - sh) * 60,
        isTimeBlock: true,
        createdAt: Date.now(),
      };
    } else {
      data = {
        text: nlpInput,
        priority: 'normal',
        completed: false,
        category: 'work',
        time: null,
        endTime: null,
        duration: 30,
        isTimeBlock: false,
        createdAt: Date.now(),
      };
    }
    try {
      const added = await addTask(data);
      if (added) {
        setRecentTask(added);
        setNlpInput('');
      }
    } catch {}
    finally {
      setIsAddingTask(false);
    }
  };

  /* ── style tokens ─────────────────────────────────────────────── */
  const fadeIn = (delay = 0): React.CSSProperties => ({
    opacity: mounted ? 1 : 0,
    transform: mounted ? 'none' : 'translateY(6px)',
    transition: `opacity .35s ${delay}s ease, transform .35s ${delay}s ease`,
  });

  /* Card: no left border, no glow — hover is a subtle bg lift only */
  const card: React.CSSProperties = {
    background: '#0d0e13',
    border: '1px solid rgba(255,255,255,.07)',
    borderRadius: '8px',
  };

  /* Metric card label — readable at any brightness */
  const metricLabel: React.CSSProperties = {
    fontFamily: UI,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.4px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,.45)',
  };

  const metricSub: React.CSSProperties = {
    fontFamily: UI,
    fontSize: '10px',
    lineHeight: 1.4,
    color: 'rgba(255,255,255,.35)',
    marginTop: '3px',
  };

  const sectionLabel: React.CSSProperties = {
    fontFamily: UI,
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '1.4px',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,.35)',
  };

  const insightLine: React.CSSProperties = {
    fontFamily: UI,
    fontSize: '11px',
    fontWeight: 500,
    lineHeight: 1.35,
    margin: 0,
    color: 'rgba(255,255,255,.82)',
  };

  return (
    <div className="min-h-full bg-[#060608] text-white flex flex-col gap-2.5 overflow-x-hidden p-4 sm:p-5 md:p-6">
      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <header
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between flex-shrink-0 min-w-0"
        style={fadeIn(0)}
      >
        <div className="min-w-0">
          <h1
            style={{
              fontFamily: UI,
              fontSize: 'clamp(1.6rem, 4.5vw, 2.5rem)',
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: '-0.8px',
              margin: 0,
              color: '#fff',
            }}
          >
            Good {timeOfDay},
          </h1>
          <h2
            style={{
              fontFamily: UI,
              fontSize: 'clamp(1.6rem, 4.5vw, 2.5rem)',
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: '-0.8px',
              margin: 0,
              color: 'rgba(255,255,255,.22)',
            }}
          >
            {userName}.
          </h2>
        </div>

        <div className="shrink-0 text-left sm:text-right">
          <p
            style={{
              fontFamily: MONO,
              fontSize: 'clamp(2.0rem, 7vw, 2.9rem)',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-1px',
              margin: 0,
              fontVariantNumeric: 'tabular-nums',
              color: '#fff',
            }}
          >
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p style={{ fontFamily: UI, fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '5px', margin: '5px 0 0' }}>
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
        </div>
      </header>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 flex-shrink-0"
        style={fadeIn(0.07)}
      >
        <div
          style={{ ...card, padding: '11px 13px', transition: 'background .2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={metricLabel}>Focus Score</span>
            <Target size={12} style={{ color: 'rgba(255,255,255,.35)', flexShrink: 0 }} />
          </div>
          <p style={{ fontFamily: MONO, fontSize: '2.1rem', fontWeight: 700, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {focusScore}
          </p>
          <p style={metricSub}>Session intensity.</p>
        </div>

        <div
          style={{ ...card, padding: '11px 13px', transition: 'background .2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={metricLabel}>Consistency</span>
            <TrendingUp size={12} style={{ color: 'rgba(255,255,255,.35)', flexShrink: 0 }} />
          </div>
          <p style={{ fontFamily: MONO, fontSize: '2.1rem', fontWeight: 700, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {consistency}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,.4)' }}>%</span>
          </p>
          <p style={metricSub}>7-day streak.</p>
        </div>

        <div
          style={{ ...card, padding: '11px 13px', transition: 'background .2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={metricLabel}>Ideal vs Actual</span>
            <Activity size={12} style={{ color: 'rgba(255,255,255,.35)', flexShrink: 0 }} />
          </div>
          <p style={{ fontFamily: MONO, fontSize: '2.1rem', fontWeight: 700, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(1)}
            <span style={{ fontSize: '1rem', fontWeight: 400, color: 'rgba(255,255,255,.3)' }}>h</span>
          </p>
          <p style={metricSub}>From planned deep work.</p>
        </div>

        <div
          style={{ ...card, padding: '11px 13px', transition: 'background .2s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={metricLabel}>Insights</span>
            <Brain size={12} style={{ color: 'rgba(255,255,255,.35)', flexShrink: 0 }} />
          </div>
          {behaviorLoading ? (
            <p style={{ ...insightLine, color: 'rgba(255,255,255,.4)' }}>Loading patterns…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={insightLine}>
                {avgFocusMinutes != null
                  ? `You usually focus for ~${avgFocusMinutes} min`
                  : 'Not enough focus data yet for an average.'}
              </p>
              {medianDropMinutes != null && (
                <p style={insightLine}>You usually lose focus after ~{medianDropMinutes} min</p>
              )}
              <p style={insightLine}>
                {topDistraction != null
                  ? `Most distractions come from ${topDistraction}`
                  : 'No labeled away reasons yet.'}
              </p>
              {bestFocusTodaySec != null && bestFocusTodaySec > 0 && (
                <p style={insightLine}>Best focus stretch today: {formatAttentionDuration(bestFocusTodaySec)}</p>
              )}
              <p style={{ ...metricSub, marginTop: '6px' }}>Peak at {peakLabel}</p>
            </div>
          )}
        </div>
      </div>

      <div
        className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-2 flex-1 min-h-0 min-w-0"
        style={fadeIn(0.14)}
      >
        <div className="min-w-0 lg:border-r lg:border-white/5 lg:pr-2">
          <PomodoroWidget />
        </div>

        <div className="flex flex-col gap-2 min-w-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => navigate('/analytics')}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/analytics')}
            style={{
              ...card,
              flex: 1,
              padding: '14px 16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'background .2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={sectionLabel}>Analytics</span>
              <ArrowUpRight size={12} style={{ color: 'rgba(255,255,255,.2)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: MONO, fontSize: '2.4rem', fontWeight: 700, lineHeight: 1, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {displayedTodaySessionCount}
                </p>
                <p style={metricSub}>sessions today</p>
              </div>
              <div style={{ width: '1px', alignSelf: 'stretch', background: 'rgba(255,255,255,.06)', margin: '0 14px' }} />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: '2.4rem',
                    fontWeight: 700,
                    lineHeight: 1,
                    margin: 0,
                    fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(255,255,255,.7)',
                  }}
                >
                  {formatDuration(todayFocusTime)}
                </p>
                <p style={metricSub}>focus time</p>
                <p style={{ ...metricSub, marginTop: 4 }}>
                  idle: {formatDuration(todayIdleTime)} · distraction: {formatDuration(todayDistractionTime)}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{ ...card, flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', transition: 'background .2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#111318')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#0d0e13')}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: '12px' }}
              onClick={() => navigate('/gryndflow')}
            >
              <span style={sectionLabel}>Flow</span>
              <ArrowUpRight size={12} style={{ color: 'rgba(255,255,255,.2)' }} />
            </div>

            <form onSubmit={handleAddNLPTask} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <input
                value={nlpInput}
                onChange={(e) => setNlpInput(e.target.value)}
                placeholder="Physics from 10am to 2pm — or just type"
                disabled={isAddingTask}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,.04)',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: '5px',
                  padding: '8px 11px',
                  fontSize: '12px',
                  fontFamily: UI,
                  color: 'rgba(255,255,255,.75)',
                  outline: 'none',
                  caretColor: '#fff',
                  boxSizing: 'border-box',
                  transition: 'border-color .15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)')}
              />
              {recentTask && (
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize: '10px',
                    color: 'rgba(255,255,255,.3)',
                    marginTop: '7px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  ↳ {recentTask.text}
                  {recentTask.time ? ` · ${recentTask.time}–${recentTask.endTime}` : ''}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
