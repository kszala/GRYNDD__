import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
import { AttentionStateIndicator } from './AttentionStateIndicator';
import { GryndLogo } from './GryndLogo';
import {
  LayoutDashboard,
  Music,
  BarChart3,
  History,
  LogOut,
  Workflow,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import supabase from '../supabaseClient';
import { SessionReflectionPrompt } from './SessionReflectionPrompt';
import { InterruptReturnModal } from './InterruptReturnModal';
import { BehaviorNudgeBanner } from './BehaviorNudgeBanner';
import { StopSessionModal } from './StopSessionModal';
import { ReturnModal } from './ReturnModal';
import { useBehaviorNudges } from '../hooks/useBehaviorNudges';
import { useTimerStore } from '../store/timestore';

type SessionTone = 'morning' | 'storm' | 'deepFocus';

type SessionType = 'focus' | 'break' | 'interrupted';

const getSessionTone = (
  isRunning: boolean,
  interruptionCount: number,
  activeFocusTime: number,
  sessionType: SessionType,
  currentState: string
): SessionTone => {
  if (
    sessionType === 'interrupted' ||
    currentState === 'interrupted_running' ||
    currentState === 'interrupted_pending_reason' ||
    interruptionCount >= 3
  ) {
    return 'storm';
  }
  if (!isRunning) return 'morning';
  if (activeFocusTime >= 40 * 60 && interruptionCount === 0) return 'deepFocus';
  return 'morning';
};

const SESSION_ACCENTS: Record<SessionTone, { accent: string; dim: string }> = {
  morning: { accent: '#4F6EF7', dim: 'rgba(79, 110, 247, 0.12)' },
  storm: { accent: '#E05A2B', dim: 'rgba(224, 90, 43, 0.12)' },
  deepFocus: { accent: '#1A9E72', dim: 'rgba(26, 158, 114, 0.10)' },
};

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Flow', href: '/flow', icon: Workflow },
  { name: 'GryndTube', href: '/gryndtube', icon: Music },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'History', href: '/history', icon: History },
];

export const Layout: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [userId, setUserId] = React.useState<string | null>(null);
  const { nudgeMessage, dismissNudge } = useBehaviorNudges(userId);

  React.useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  const isRunning = useTimerStore((state) => state.isRunning);
  const interruptionCount = useTimerStore((state) => state.interruptionCount);
  const activeFocusTime = useTimerStore((state) => state.activeFocusTime);
  const sessionType = useTimerStore((state) => state.sessionType);
  const reflectionType = useTimerStore((state) => state.reflectionType);
  const activeReflectionPrompt = useTimerStore((state) => state.activeReflectionPrompt);
  const reflectionRequired = useTimerStore((state) => state.reflectionRequired);
  const dismissReflectionPrompt = useTimerStore((state) => state.dismissReflectionPrompt);
  const submitReturnReflection = useTimerStore((state) => state.submitReturnReflection);
  const requestResume = useTimerStore((state) => state.requestResume);
  const stopModalOpen = useTimerStore((state) => state.stopModalOpen);
  const closeStopModal = useTimerStore((state) => state.closeStopModal);
  const handleStopModalDone = useTimerStore((state) => state.handleStopModalDone);
  const handleStopModalTakeBreak = useTimerStore((state) => state.handleStopModalTakeBreak);
  const returnModalOpen = useTimerStore((state) => state.returnModalOpen);
  const returnModalType = useTimerStore((state) => state.returnModalType);
  const awayDuration = useTimerStore((state) => state.awayDuration);
  const closeReturnModal = useTimerStore((state) => state.closeReturnModal);
  const currentState = useTimerStore((state) => state.currentState);
  const lastAwayOrInterruptionAt = useTimerStore((state) => state.lastAwayOrInterruptionAt);
  const sessionTone = getSessionTone(isRunning, interruptionCount, activeFocusTime, sessionType, currentState);
  const accentConfig = SESSION_ACCENTS[sessionTone];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleReturnModalSubmit = useTimerStore((state) => state.handleReturnModalSubmit);

  const interruptReturnOpen = reflectionRequired && reflectionType === 'interruption_return' && activeReflectionPrompt?.type === 'return_reflection';
  const showInterruptOverlay = !stopModalOpen && !interruptReturnOpen && currentState === 'interrupted_running';
  const interruptDurationSeconds = React.useMemo(() => {
    if (!lastAwayOrInterruptionAt) return 0;
    return Math.max(0, Math.floor((Date.now() - lastAwayOrInterruptionAt) / 1000));
  }, [lastAwayOrInterruptionAt]);

  const buildReturnReflection = (reason: string, mood?: number, details?: string): string => {
    const reasonLabel: Record<string, string> = {
      family: 'Family',
      distracted: 'Distracted',
      urgent_task: 'Urgent task',
      disturbed_by_somebody: 'Disturbed by somebody',
    };

    const reasonText = reasonLabel[reason] ? reasonLabel[reason].toLowerCase() : reason.toLowerCase();
    const base = `I was interrupted by ${reasonText}. I returned intentionally and I am ready to resume with clear focus. I will keep working and avoid the same distraction while staying committed to my session. I understand this interruption affected my flow, and I am making a stronger effort to continue without breaking my concentration.`;
    const moodText = mood ? ` Mood rating: ${mood} out of 5.` : '';
    const detailText = details?.trim() ? ` ${details.trim()}` : '';
    return `${base}${moodText}${detailText}`;
  };

  return (
    <div
      className="flex h-screen bg-[var(--grynd-bg)] text-[var(--grynd-text)]"
      style={{
        ['--grynd-accent' as any]: accentConfig.accent,
        ['--grynd-accent-dim' as any]: accentConfig.dim,
      }}
    >
      {/* Sidebar */}
      <div
        className={`flex flex-col bg-[#111316] border-r border-white/5 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Top section */}
        <div className="px-5 py-4 flex items-center justify-between">
          <GryndLogo collapsed={collapsed} />
          {!collapsed && <NotificationBell />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-[var(--grynd-accent-dim)] text-[var(--grynd-accent)] border-l-2 border-[var(--grynd-accent)]'
                    : 'text-[#C2C6CF] hover:text-white hover:bg-white/5'
                }`
              }
              title={collapsed ? item.name : undefined}
            >
              <item.icon size={20} className="text-current" />
              {!collapsed && <span className="font-mono text-[12px] uppercase tracking-[0.08em]">{item.name}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="px-2 py-3 border-t border-white/5">
          <div className="mb-2 flex items-center justify-center">
            <AttentionStateIndicator />
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Logout */}
        <div className="p-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-[#C2C6CF] hover:bg-white/5 hover:text-white transition-all duration-200"
          >
            <LogOut size={22} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <Outlet />
        </div>
      </div>
      {!stopModalOpen && !interruptReturnOpen && <SessionReflectionPrompt />}
      {!stopModalOpen && interruptReturnOpen && (
        <InterruptReturnModal
          isOpen={interruptReturnOpen}
          durationSeconds={interruptDurationSeconds}
          onClose={dismissReflectionPrompt}
          onSubmit={(reason, mood, details) => submitReturnReflection(buildReturnReflection(reason, mood, details))}
        />
      )}
      <StopSessionModal
        isOpen={stopModalOpen}
        onClose={closeStopModal}
        onDone={handleStopModalDone}
        onTakeBreak={handleStopModalTakeBreak}
      />
      {showInterruptOverlay && (
        <div className="fixed bottom-6 right-6 z-[9990] min-w-[280px] max-w-sm rounded-3xl border border-orange-400/20 bg-orange-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-200">
              <span className="text-lg">⏱</span>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.24em] text-orange-300">Interrupted</p>
              <p className="mt-2 text-sm font-semibold text-white">Your session is paused for interruption.</p>
              <p className="mt-1 text-sm text-orange-200">
                Interrupted for {Math.floor(interruptDurationSeconds / 60)}m {interruptDurationSeconds % 60}s.
              </p>
            </div>
          </div>
        </div>
      )}
      {!stopModalOpen && (
        <ReturnModal
          isOpen={returnModalOpen}
          onSubmit={handleReturnModalSubmit}
          onClose={closeReturnModal}
          type={returnModalType}
          duration={awayDuration}
        />
      )}
      <BehaviorNudgeBanner message={nudgeMessage} onDismiss={dismissNudge} />
    </div>
  );
};
