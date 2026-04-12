import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, AlertTriangle, Maximize, X, Clock, Timer as TimerIcon, AlertCircle } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import SessionCompleteModal from './SessionCompleteModal';
import { BreakPromptModal } from './BreakPromptModal';
import { useTimerStore } from '../store/timestore';

interface Subject { id: string; name: string; color: string; }

const formatTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${m.toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
};

const formatElapsedTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return '00:00';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const MONO = `'SF Mono', 'Fira Code', 'Consolas', 'Menlo', monospace`;
const UI   = `-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif`;

// ── icon button — matches file 2's 40px circle style ─────────────────────
const iconButtonStyle = (danger = false): React.CSSProperties => ({
  width:          '40px',
  height:         '40px',
  borderRadius:   '999px',
  border:         danger ? '1px solid rgba(248,113,113,.35)' : '1px solid rgba(255,255,255,.16)',
  background:     'transparent',
  color:          danger ? 'rgba(248,113,113,.95)' : 'rgba(255,255,255,.82)',
  display:        'flex',
  alignItems:     'center',
  justifyContent: 'center',
  cursor:         'pointer',
  flexShrink:     0,
  transition:     'all .15s ease',
});

export const PomodoroWidget: React.FC = () => {
  // ── all logic from file 1 ─────────────────────────────────────────────
  const {
    timeLeft, isRunning, currentSession, sessionType,
    startSession, stopSession, toggleTimer, resetTimer,
  } = usePomodoro();

  const {
    showBreakPrompt, lastCompletedSession,
    startBreakTimer, dismissBreakPrompt,
    isInterruptedMode, interruptedTime,
    markInterruptedRunning, interrupt,
  } = useTimerStore();

  const [selectedSubject,   setSelectedSubject]   = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTopicId,   setSelectedTopicId]   = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [timerMode,         setTimerMode]         = useState<'pomodoro' | 'normal'>('pomodoro');
  const [customTime,        setCustomTime]         = useState(25);
  const [isFullscreen,      setIsFullscreen]       = useState(false);
  const [sessionEndedEarly, setSessionEndedEarly] = useState(false);
  const [subjects,          setSubjects]           = useState<Subject[]>([]);

  useEffect(() => {
    const list: Subject[] = [
      { id: '1', name: 'Mathematics', color: '#8B5CF6' },
      { id: '2', name: 'Physics',     color: '#3B82F6' },
      { id: '3', name: 'Chemistry',   color: '#10B981' },
    ];
    setSubjects(list);
    setSelectedSubject(list[0].name);
    setSelectedSubjectId(list[0].id);
  }, []);

  const handleSubjectChange = (id: string) => {
    const s = subjects.find(x => x.id === id);
    if (s) { setSelectedSubject(s.name); setSelectedSubjectId(s.id); setSelectedTopicId(''); }
  };

  const safeTimeLeft = React.useMemo(() => {
    return (typeof timeLeft === 'number' && !isNaN(timeLeft) && timeLeft >= 0) ? timeLeft : 0;
  }, [timeLeft]);

  const getCurrentSessionElapsed = () => {
    if (!currentSession) return 0;
    return Math.max(0, Math.floor((Date.now() - (currentSession.startTime?.getTime() || Date.now())) / 1000));
  };

  const totalElapsed = React.useMemo(() => {
    if (!isInterruptedMode) return 0;
    const safe = (typeof interruptedTime === 'number' && interruptedTime >= 0) ? interruptedTime : 0;
    return safe + getCurrentSessionElapsed();
  }, [isInterruptedMode, interruptedTime, currentSession]);

  const handleStart = () => {
    if (!currentSession) {
      timerMode === 'pomodoro'
        ? startSession(selectedSubject, undefined, selectedSubjectId, selectedTopicId)
        : startSession(selectedSubject, customTime * 60, selectedSubjectId, selectedTopicId);
    } else {
      toggleTimer();
    }
  };

  const handleStop = () => {
    if (currentSession && (safeTimeLeft > 0 || isInterruptedMode)) {
      stopSession();
    } else {
      resetTimer();
    }
  };

  const handleInterrupt = () => {
    interrupt();
  };

  useEffect(() => {
    if (safeTimeLeft <= 0 && currentSession && !showCompleteModal && !isInterruptedMode) {
      setSessionEndedEarly(false);
      setShowCompleteModal(true);
    }
  }, [safeTimeLeft, currentSession, showCompleteModal, isInterruptedMode]);

  const toggleFullscreen = () => {
    if (!isFullscreen) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
    setIsFullscreen(!isFullscreen);
  };

  const displayTime = isInterruptedMode
    ? formatElapsedTime(totalElapsed)
    : formatTime(safeTimeLeft);

  const displayColor = isInterruptedMode ? '#fb923c' : 'rgba(255,255,255,.94)';
  const subtitleColor = isInterruptedMode ? '#fbbf24' : 'rgba(255,255,255,.42)';

  const modeLabel = isInterruptedMode
    ? 'INTERRUPTED'
    : sessionType === 'break'
      ? 'BREAK'
      : timerMode === 'pomodoro' ? 'POMODORO' : 'CUSTOM';

  const subjectLabel = currentSession?.subject || selectedSubject;

  const sessionDuration = currentSession
    ? (isInterruptedMode ? totalElapsed
      : sessionType === 'focus'
        ? (timerMode === 'pomodoro' ? 1500 - safeTimeLeft : (customTime * 60) - safeTimeLeft)
        : 300 - safeTimeLeft)
    : 0;

  const modalProps = {
    sessionData: {
      id: currentSession?.id || '',
      sessionId: currentSession?.sessionId || '',
      subject: currentSession?.subject || selectedSubject,
      duration: sessionDuration,
      startTime: currentSession?.startTime || new Date(),
      completed: !sessionEndedEarly,
      type: sessionType,
      wasEndedEarly: sessionEndedEarly,
    },
  };

  // ── fullscreen ───────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <>
        <div style={{
          position: 'fixed', inset: 0, background: '#060608', zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '28px',
        }}>
          <button
            onClick={toggleFullscreen}
            style={{ position: 'absolute', top: 24, right: 28, background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          <p style={{ fontFamily: MONO, fontSize: '13rem', fontWeight: 700, lineHeight: 1, color: 'rgba(255,255,255,.94)', margin: 0, letterSpacing: '-0.06em', fontVariantNumeric: 'tabular-nums' }}>
            {displayTime}
          </p>
          <p style={{ fontFamily: UI, fontSize: '10px', fontWeight: 600, letterSpacing: '2.5px', color: 'rgba(255,255,255,.3)', margin: 0 }}>
            {modeLabel}{currentSession ? ` · ${currentSession.subject}` : ''}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={handleStart}
              style={iconButtonStyle(false)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {isRunning ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
            </button>
            {currentSession && !isInterruptedMode && (
              <button
                onClick={handleInterrupt}
                style={{ ...iconButtonStyle(false), border: '1px solid rgba(251,146,60,.35)', color: 'rgba(251,146,60,.95)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,146,60,.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                title="Interrupt"
              >
                <AlertCircle size={18} />
              </button>
            )}
            {(currentSession || safeTimeLeft > 0) && (
              <button
                onClick={handleStop}
                style={iconButtonStyle(true)}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <Square size={14} />
              </button>
            )}
          </div>
        </div>
        <SessionCompleteModal
          isOpen={showCompleteModal}
          onClose={() => { setShowCompleteModal(false); setSessionEndedEarly(false); resetTimer(); }}
          onComplete={() => { stopSession(undefined, undefined, sessionEndedEarly); setShowCompleteModal(false); setSessionEndedEarly(false); }}
          onIncomplete={(r, d) => { stopSession(r, d, sessionEndedEarly); setShowCompleteModal(false); setSessionEndedEarly(false); }}
          {...modalProps}
        />
        {!sessionEndedEarly && (
          <BreakPromptModal
            isOpen={showBreakPrompt}
            onStartBreak={d => startBreakTimer(d * 60)}
            onClose={dismissBreakPrompt}
            sessionData={lastCompletedSession ? {
              subject: lastCompletedSession.subject || 'Session',
              duration: lastCompletedSession.duration || 0,
              actualDuration: lastCompletedSession.actualDuration,
              type: (lastCompletedSession.type === 'interrupted' ? 'focus' : (lastCompletedSession.type || 'focus')) as 'focus' | 'break',
            } : undefined}
          />
        )}
      </>
    );
  }

  // ── dashboard-embedded — UI layout from file 2 ───────────────────────
  return (
    <>
      <div style={{
        width:          '100%',
        height:         '100%',
        display:        'flex',
        flexDirection:  'column',
        justifyContent: 'space-between',   // file 2's layout
        padding:        '8px 0 0',
        boxSizing:      'border-box',
      }}>

        {/* TOP: pre-session controls OR interrupted badge */}
        <div style={{ minHeight: 52, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          {!currentSession ? (
            <>
              {/* mode tabs + duration pills in one row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* POMO / CUSTOM toggle */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={() => setTimerMode('pomodoro')}
                    style={{ padding: '4px 10px', background: timerMode === 'pomodoro' ? 'rgba(255,255,255,.09)' : 'transparent', border: 'none', borderRadius: 999, fontFamily: UI, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', color: timerMode === 'pomodoro' ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.28)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}
                  >
                    <TimerIcon size={10} /> POMO
                  </button>
                  <button
                    onClick={() => setTimerMode('normal')}
                    style={{ padding: '4px 10px', background: timerMode === 'normal' ? 'rgba(255,255,255,.09)' : 'transparent', border: 'none', borderRadius: 999, fontFamily: UI, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', color: timerMode === 'normal' ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.28)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all .15s' }}
                  >
                    <Clock size={10} /> CUSTOM
                  </button>
                </div>

                {/* fullscreen — tucked into this row */}
                <button
                  onClick={toggleFullscreen}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(255,255,255,.22)', cursor: 'pointer', lineHeight: 1, transition: 'color .15s', padding: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,.55)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,.22)')}
                >
                  <Maximize size={13} />
                </button>
              </div>

              {/* custom duration pills — only in CUSTOM mode */}
              {timerMode === 'normal' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[25, 45, 60, 90, 120].map(m => (
                    <button
                      key={m}
                      onClick={() => setCustomTime(m)}
                      style={{
                        border:       customTime === m ? '1px solid rgba(255,255,255,.26)' : '1px solid rgba(255,255,255,.1)',
                        background:   customTime === m ? 'rgba(255,255,255,.09)' : 'transparent',
                        color:        customTime === m ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.35)',
                        borderRadius: 999,
                        padding:      '5px 10px',
                        fontFamily:   MONO,
                        fontSize:     10,
                        letterSpacing: '0.06em',
                        cursor:       'pointer',
                        transition:   'all .15s',
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              )}

              {/* subject select — file 2 style: centered, 220px */}
              <select
                value={selectedSubjectId}
                onChange={e => handleSubjectChange(e.target.value)}
                style={{
                  width:      220,
                  background: 'rgba(255,255,255,.04)',
                  border:     '1px solid rgba(255,255,255,.08)',
                  borderRadius: 8,
                  color:      'rgba(255,255,255,.74)',
                  padding:    '8px 12px',
                  textAlign:  'center',
                  fontFamily: UI,
                  fontSize:   12,
                  outline:    'none',
                  cursor:     'pointer',
                  appearance: 'none',
                }}
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </>
          ) : isInterruptedMode ? (
            <span style={{ padding: '4px 12px', background: 'rgba(251,146,60,.08)', borderRadius: 999, fontFamily: UI, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', color: '#fb923c', display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={10} /> INTERRUPTED
            </span>
          ) : null}
        </div>

        {/* CENTRE: timer numeral + label — file 2's sizing and neutral white */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <p style={{
            margin:             0,
            fontFamily:         MONO,
            fontWeight:         700,
            fontSize:           'clamp(5.8rem, 10vw, 7.2rem)',
            lineHeight:         1,
            letterSpacing:      '-0.06em',
            color:              displayColor,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayTime}
          </p>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', color: subtitleColor }}>
              {modeLabel}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '999px', background: 'rgba(255,255,255,.22)' }} />
            <span style={{ fontFamily: UI, fontSize: 12, color: subtitleColor }}>
              {subjectLabel}
            </span>
          </div>
        </div>

        {/* BOTTOM: action buttons — file 2's 40px circle style */}
        <div style={{ paddingBottom: 8, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
          <button
            onClick={handleStart}
            style={iconButtonStyle(false)}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title={currentSession ? (isRunning ? 'Pause' : 'Resume') : 'Start'}
          >
            {currentSession && isRunning
              ? <Pause size={16} />
              : <Play  size={16} style={{ marginLeft: 2 }} />
            }
          </button>

          {currentSession && !isInterruptedMode && (
            <button
              onClick={handleInterrupt}
              style={{ ...iconButtonStyle(false), border: '1px solid rgba(251,146,60,.35)', color: 'rgba(251,146,60,.95)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,146,60,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Interrupt"
            >
              <AlertCircle size={16} />
            </button>
          )}

          {(currentSession || safeTimeLeft > 0) && (
            <button
              onClick={handleStop}
              style={iconButtonStyle(true)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              title="Stop"
            >
              <Square size={13} />
            </button>
          )}
        </div>
      </div>

      {/* modals — file 1's exact modal setup */}
      <SessionCompleteModal
        isOpen={showCompleteModal}
        onClose={() => { setShowCompleteModal(false); setSessionEndedEarly(false); resetTimer(); }}
          onComplete={() => { stopSession(undefined, undefined, sessionEndedEarly); setShowCompleteModal(false); setSessionEndedEarly(false); }}
        onIncomplete={(r, d) => { stopSession(r, d, sessionEndedEarly); setShowCompleteModal(false); setSessionEndedEarly(false); }}
        {...modalProps}
      />
      {!sessionEndedEarly && (
        <BreakPromptModal
          isOpen={showBreakPrompt}
          onStartBreak={d => startBreakTimer(d * 60)}
          onClose={dismissBreakPrompt}
          sessionData={lastCompletedSession ? {
            subject:        lastCompletedSession.subject || 'Session',
            duration:       lastCompletedSession.duration || 0,
            actualDuration: lastCompletedSession.actualDuration,
            type:           (lastCompletedSession.type === 'interrupted' ? 'focus' : (lastCompletedSession.type || 'focus')) as 'focus' | 'break',
          } : undefined}
        />
      )}
    </>
  );
};