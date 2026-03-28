import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { NotificationBell } from './NotificationBell';
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
import { useTimerStore } from '../store/timestore';

type SessionTone = 'morning' | 'storm' | 'deepFocus';

type SessionType = 'focus' | 'break' | 'interrupted';

const getSessionTone = (
  isRunning: boolean,
  interruptionCount: number,
  activeFocusTime: number,
  sessionType: SessionType
): SessionTone => {
  if (!isRunning) return 'morning';
  if (sessionType === 'interrupted' || interruptionCount >= 3) return 'storm';
  if (activeFocusTime >= 40 * 60 && interruptionCount === 0) return 'deepFocus';
  return 'morning';
};

const SESSION_ACCENTS: Record<SessionTone, { accent: string; dim: string }> = {
  morning: { accent: '#4F6EF7', dim: 'rgba(79, 110, 247, 0.12)' },
  storm: { accent: '#E05A2B', dim: 'rgba(224, 90, 43, 0.12)' },
  deepFocus: { accent: '#1A9E72', dim: 'rgba(26, 158, 114, 0.10)' },
};

const GryndLogo: React.FC<{
  size?: 'small' | 'medium' | 'large';
  theme?: 'dark' | 'light';
  collapsed?: boolean;
}> = ({ size = 'medium', theme = 'dark', collapsed = false }) => {
  const sizeClasses = {
    small: 'text-base',
    medium: 'text-2xl',
    large: 'text-3xl',
  };

  if (collapsed) {
    return (
      <div className="relative w-9 h-9 rounded-lg border border-white/10 bg-[#111316] flex items-center justify-center">
        <span className="text-white font-semibold text-lg font-mono">G</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center relative font-mono">
      <span
        className={`font-semibold tracking-tight ${sizeClasses[size]} ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
        style={{ letterSpacing: '-0.02em' }}
      >
        GRYND
      </span>
      <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--grynd-accent)]" />
    </div>
  );
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
  const isRunning = useTimerStore((state) => state.isRunning);
  const interruptionCount = useTimerStore((state) => state.interruptionCount);
  const activeFocusTime = useTimerStore((state) => state.activeFocusTime);
  const sessionType = useTimerStore((state) => state.sessionType);
  const sessionTone = getSessionTone(isRunning, interruptionCount, activeFocusTime, sessionType);
  const accentConfig = SESSION_ACCENTS[sessionTone];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
          <div className="flex items-center gap-2">
            <GryndLogo size="medium" theme="dark" collapsed={collapsed} />
          </div>
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

        {/* Collapse/Expand Button */}
        <div className="p-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
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
      <SessionReflectionPrompt />
    </div>
  );
};
