import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PomodoroWidget } from './PomodoroWidget';
import { storage } from '../utils/storage';
import { formatDuration, isToday } from '../utils/time';
import { TrendingUp, Clock, Target, CheckCircle, Zap, Award, Calendar, BarChart3, Coffee, Sparkles } from 'lucide-react';
import { Video as LucideIcon } from 'lucide-react';
import { getPeakFocusWindow } from '../services/behaviorTracking';

// Define types for better type safety
type LogoSize = 'small' | 'medium' | 'large' | 'xl';
type LogoTheme = 'dark' | 'light';

interface StatCardProps {
  icon: typeof LucideIcon;
  title: string;
  value: string | number;
  color: string;
  delay?: number;
  progress?: number;
  maxValue?: number;
  onClick?: () => void;
}

// Updated GRYND Logo Component for Dashboard
const GryndLogo = ({ 
  size = 'medium', 
  theme = 'dark', 
  animated = true,
  className = '',
  compact = false
}: {
  size?: LogoSize;
  theme?: LogoTheme;
  animated?: boolean;
  className?: string;
  compact?: boolean;
}) => {
  const sizeClasses: Record<LogoSize, string> = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl',
    xl: 'text-2xl'
  };

  const dotSizes: Record<LogoSize, string> = {
    small: 'w-1 h-1 -top-0.5 -right-1.5',
    medium: 'w-1.5 h-1.5 -top-1 -right-2', 
    large: 'w-2 h-2 -top-1 -right-2.5',
    xl: 'w-2.5 h-2.5 -top-1.5 -right-3'
  };

  if (compact) {
    return (
      <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg group">
        <span className="text-white font-extrabold text-sm">G</span>
        <div 
          className={`absolute w-2 h-2 -top-1 -right-1 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 ${
            animated ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow: '0 0 12px rgba(139, 92, 246, 0.8)'
          }}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center relative font-mono ${className}`}>
      <span 
        className={`font-extrabold tracking-wider ${sizeClasses[size]} ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}
        style={{ letterSpacing: '-0.02em' }}
      >
        GRYND
      </span>
      <div 
        className={`absolute rounded-full bg-gradient-to-br from-violet-500 to-purple-500 ${dotSizes[size]} ${
          animated ? 'animate-pulse' : ''
        }`}
        style={{
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.4)'
        }}
      />
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState('morning');
  const [peakFocus, setPeakFocus] = useState<any>(null);
  const [peakFocusLoading, setPeakFocusLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 17) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

  useEffect(() => {
    const loadPeakFocus = async () => {
      try {
        // Using a placeholder user ID since we don't have auth context
        // In production, this should use the actual user.id from auth
        const data = await getPeakFocusWindow('user-placeholder');
        setPeakFocus(data);
      } catch (error) {
        console.error('Error loading peak focus:', error);
      } finally {
        setPeakFocusLoading(false);
      }
    };

    loadPeakFocus();
  }, []);

  const sessions = storage.getSessions();
  const todos = storage.getTodos();

  const todaySessions = sessions.filter((session) => isToday(session.startTime));
  const todayFocusTime = todaySessions
    .filter((session) => session.type === 'focus' && session.completed)
    .reduce((total, session) => total + session.duration, 0);

  const completedTodosToday = todos.filter(
    (todo) => todo.completed && todo.completedAt && isToday(todo.completedAt)
  ).length;

  const currentStreak = (() => {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayHasActivity = sessions.some(
        (session) =>
          session.startTime >= dayStart &&
          session.startTime <= dayEnd &&
          session.completed
      );

      if (dayHasActivity) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  })();

  const completedSessionsToday = todaySessions.filter(s => s.completed).length;
  const hasActivityToday = todaySessions.length > 0 || completedTodosToday > 0;

  const getMotivationalMessage = () => {
    if (!mounted) return "Loading...";
    if (currentStreak >= 7) return "You're on fire! 🔥 Amazing streak!";
    if (completedSessionsToday >= 4) return "Crushing it today! 💪";
    if (todayFocusTime >= 7200) return "Deep work champion! 🧠";
    if (hasActivityToday) return "Great progress today! Keep the momentum going.";
    return `Good ${timeOfDay}! Ready to make today productive?`;
  };

  const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    title,
    value,
    color,
    delay = 0,
    progress,
    maxValue,
    onClick
  }) => (
    <div
      className={`bg-gradient-to-br ${color} backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 group ${mounted ? 'animate-in slide-in-from-bottom-4' : 'opacity-0'} ${onClick ? 'cursor-pointer hover:border-purple-500/50' : ''}`}
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
          <Icon className="w-6 h-6 text-white drop-shadow-sm" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/80 font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white drop-shadow-sm">{value}</p>
          {progress !== undefined && maxValue && (
            <div className="mt-2 w-full bg-white/20 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-white/60 h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min((progress / maxValue) * 100, 100)}%`,
                  transitionDelay: `${delay + 200}ms`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const PeakFocusCard = () => {
    if (peakFocusLoading) {
      return (
        <div className={`bg-gray-700/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/30 shadow-xl ${mounted ? 'animate-pulse' : ''}`}>
          <div className="h-8 bg-gray-600/50 rounded w-1/3 mb-4"></div>
          <div className="h-5 bg-gray-600/50 rounded w-2/3"></div>
        </div>
      );
    }

    if (!peakFocus) return null;

    const { peakHour, peakHourLabel, minutesUntilPeak, avgFocusScore, confidence } = peakFocus;

    let title = 'Unlock Your Peak Focus';
    let body = 'Complete 5 study sessions to unlock your peak focus window prediction.';
    let showPulse = false;

    if (avgFocusScore > 0) {
      if (minutesUntilPeak < 30) {
        title = 'Peak Focus Window — Starting Soon';
        body = `Your peak focus window starts in ${minutesUntilPeak} minutes. Open a session now.`;
        showPulse = true;
      } else if (minutesUntilPeak <= 120) {
        title = `Peak Focus Window — ${peakHourLabel}`;
        body = `Your peak focus window is at ${peakHourLabel}. You have ${minutesUntilPeak} minutes to prepare.`;
      } else {
        title = `Peak Focus Window — ${peakHourLabel}`;
        body = 'Your peak focus window today is ' + peakHourLabel + '. Plan your hardest topic for then.';
      }
    }

    return (
      <div
        className={`bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 border-l-4 border-l-purple-500 shadow-xl cursor-pointer hover:border-l-purple-400 transition-all duration-300 ${mounted ? 'animate-in slide-in-from-top-4' : 'opacity-0'}`}
        style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}
        onClick={() => navigate('/focus')}
      >
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 ${showPulse ? 'animate-pulse' : ''}`}>
            <Zap className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              {confidence === 'high' && avgFocusScore > 0 && (
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <p className="text-gray-300 text-sm mb-2">{body}</p>
            {confidence === 'low' && avgFocusScore > 0 && (
              <p className="text-gray-400 text-xs">Study more sessions to improve accuracy</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Floating background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Enhanced Header with Logo */}
        <div className={`mb-8 ${mounted ? 'animate-in fade-in slide-in-from-top-4' : 'opacity-0'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                {/* GRYND Logo */}
                <div className="flex items-center gap-3">
                  <GryndLogo size="large" animated={true} />
                  <div className="w-px h-8 bg-gradient-to-b from-transparent via-purple-400/50 to-transparent"></div>
                </div>
                
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <p className="text-gray-300 text-lg font-medium ml-20">
                {getMotivationalMessage()}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400 ml-20">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Coffee className="w-4 h-4" />
                  <span>{todaySessions.length} sessions started</span>
                </div>
              </div>
            </div>
            
            {currentStreak > 0 && (
              <div className={`flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-orange-600/30 to-red-600/30 backdrop-blur-sm border border-orange-400/30 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${mounted ? 'animate-in slide-in-from-right-4' : 'opacity-0'}`}>
                <div className="relative">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-3 h-3 bg-orange-400 rounded-full animate-ping opacity-75" />
                </div>
                <div className="text-center">
                  <span className="text-orange-200 font-bold text-lg">{currentStreak}</span>
                  <p className="text-orange-300/80 text-xs font-medium">day streak</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Peak Focus Card */}
        <div className="mb-8">
          <PeakFocusCard />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Clock}
            title="Today's Focus Time"
            value={formatDuration(todayFocusTime)}
            color="from-purple-600/30 to-purple-800/30"
            delay={100}
            progress={todayFocusTime}
            maxValue={7200}
            onClick={() => navigate('/analytics')}
          />
          <StatCard
            icon={CheckCircle}
            title="Tasks Completed"
            value={completedTodosToday}
            color="from-green-600/30 to-emerald-800/30"
            delay={200}
            progress={completedTodosToday}
            maxValue={5}
            onClick={() => navigate('/analytics')}
          />
          <StatCard
            icon={TrendingUp}
            title="Current Streak"
            value={`${currentStreak} ${currentStreak === 1 ? 'day' : 'days'}`}
            color="from-orange-600/30 to-red-800/30"
            delay={300}
            onClick={() => navigate('/analytics')}
          />
          <StatCard
            icon={Zap}
            title="Sessions Today"
            value={completedSessionsToday}
            color="from-blue-600/30 to-cyan-800/30"
            delay={400}
            progress={completedSessionsToday}
            maxValue={4}
            onClick={() => navigate('/analytics')}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Enhanced Pomodoro Widget */}
          <div className={`${mounted ? 'animate-in slide-in-from-left-4' : 'opacity-0'}`} style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-2xl border border-gray-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
              {/* Pomodoro Header with mini logo */}
              <div className="flex items-center justify-between p-4 border-b border-gray-600/30">
                <div className="flex items-center gap-3">
                  <GryndLogo compact={true} animated={true} />
                  <h3 className="text-lg font-semibold text-white">Focus Timer</h3>
                </div>
                <div className="text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                  Powered by GRYND
                </div>
              </div>
              <div className="p-2">
                <PomodoroWidget />
              </div>
            </div>
          </div>

          {/* Quick Overview */}
          <div className={`space-y-6 ${mounted ? 'animate-in slide-in-from-right-4' : 'opacity-0'}`} style={{ animationDelay: '600ms', animationFillMode: 'forwards' }}>
            {/* Recent Sessions */}
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:border-purple-500/50" onClick={() => navigate('/analytics')}>
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-400" />
                Recent Sessions
                <div className="ml-auto text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                  {todaySessions.length} today
                </div>
              </h3>
              <div className="space-y-3">
                {todaySessions.slice(0, 3).map((session, index) => (
                  <div 
                    key={session.id} 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/40 to-gray-600/40 backdrop-blur-sm rounded-xl border border-gray-500/20 hover:border-purple-400/30 transition-all duration-300 hover:scale-[1.02] group"
                    style={{ animationDelay: `${700 + index * 100}ms` }}
                  >
                    <div className="flex-1">
                      <p className="text-white font-medium group-hover:text-purple-300 transition-colors">
                        {session.subject}
                      </p>
                      <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                        <span className={session.completed ? 'text-green-400' : 'text-orange-400'}>
                          {session.completed ? '✅ Completed' : 'ℹ️ Stopped early'}
                        </span>
                        {session.stopReason && (
                          <>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-300">{session.stopReason}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-400 font-bold text-lg">
                        {formatDuration(session.duration)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {session.startTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {todaySessions.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="relative mb-4">
                      <Target size={48} className="mx-auto mb-3 opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 border-2 border-purple-500/30 rounded-full animate-pulse" />
                      </div>
                    </div>
                    <p className="text-lg font-medium">No sessions today</p>
                    <p className="text-sm text-gray-500 mt-1">Start your first focus session!</p>
                    <div className="mt-4">
                      <GryndLogo size="small" className="opacity-30 justify-center" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Daily Goals */}
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-700/60 backdrop-blur-sm rounded-2xl p-6 border border-gray-500/30 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer hover:border-purple-500/50" onClick={() => navigate('/analytics')}>
              <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <Target className="w-5 h-5 text-green-400" />
                Today's Goals
                <BarChart3 className="w-4 h-4 text-gray-400 ml-auto" />
              </h3>
              <div className="space-y-6">
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-200 font-medium">Complete 4 Focus Sessions</span>
                    <span className="text-purple-400 font-bold text-sm bg-purple-500/20 px-2 py-1 rounded-full">
                      {completedSessionsToday}/4
                    </span>
                  </div>
                  <div className="w-full bg-gray-600/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{ 
                        width: `${Math.min((completedSessionsToday / 4) * 100, 100)}%`,
                        transitionDelay: '800ms'
                      }}
                    />
                  </div>
                </div>
                
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-200 font-medium">Study for 2 hours</span>
                    <span className="text-green-400 font-bold text-sm bg-green-500/20 px-2 py-1 rounded-full">
                      {Math.floor(todayFocusTime / 3600)}/2h
                    </span>
                  </div>
                  <div className="w-full bg-gray-600/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{ 
                        width: `${Math.min((todayFocusTime / 7200) * 100, 100)}%`,
                        transitionDelay: '900ms'
                      }}
                    />
                  </div>
                </div>
                
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-200 font-medium">Complete 5 tasks</span>
                    <span className="text-orange-400 font-bold text-sm bg-orange-500/20 px-2 py-1 rounded-full">
                      {completedTodosToday}/5
                    </span>
                  </div>
                  <div className="w-full bg-gray-600/50 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-1000 ease-out shadow-sm"
                      style={{ 
                        width: `${Math.min((completedTodosToday / 5) * 100, 100)}%`,
                        transitionDelay: '1000ms'
                      }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Footer with subtle GRYND branding */}
              <div className="mt-6 pt-4 border-t border-gray-600/30 flex items-center justify-center">
                <GryndLogo size="small" className="opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};