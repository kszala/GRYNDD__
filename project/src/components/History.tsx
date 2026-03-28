import React, { useState, useEffect } from 'react';
import { Calendar, Clock, XCircle, CheckCircle, Filter, TrendingUp, BarChart3, Target, Coffee, BookOpen } from 'lucide-react';
import { useTimerStore } from '../store/timestore';
import { TimerSession } from '../store/timestore';
import { formatDuration, isToday } from '../utils/time';


type StopReason = {
  value: string;
  label: string;
};

type SubjectBreakdown = {
  name: string;
  focusSessions: number;
  breakSessions: number;
  totalFocusTime: number;
  totalBreakTime: number;
  totalTime: number;
};

type Stats = {
  totalSessions: number;
  focusSessions: number;
  breakSessions: number;
  completedSessions: number;
  totalTime: number;
  totalFocusTime: number;
  totalBreakTime: number;
  averageRating: number;
  completionRate: number;
  subjectBreakdown: SubjectBreakdown[];
};

const STOP_REASONS: StopReason[] = [
  { value: 'distraction', label: 'Got distracted' },
  { value: 'emergency', label: 'Emergency interruption' },
  { value: 'tired', label: 'Too tired to continue' },
  { value: 'completed_early', label: 'Finished task early' },
  { value: 'technical', label: 'Technical issues' },
  { value: 'other', label: 'Other reason' }
];


export const History: React.FC = () => {
  const sessions = useTimerStore(state => state.sessions);
  const [loading, setLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');

  const getStopReasonLabel = (reason?: string): string => {
    if (!reason) return 'Unknown reason';
    const found = STOP_REASONS.find(r => r.value === reason);
    return found?.label || reason;
  };

  const subjects = Array.from(new Set(
    sessions
      .filter(session => session.type === 'focus')
      .map(session => session.subject)
      .filter(Boolean)
  )).sort();

  const filteredSessions = sessions
    .filter(session => {
      if (filter === 'completed') return session.completed;
      if (filter === 'stopped') return !session.completed;
      return true;
    })
    .filter(session => {
      if (subjectFilter === 'all') return true;
      return session.subject === subjectFilter;
    })
    .filter(session => {
      if (typeFilter === 'focus') return session.type === 'focus';
      if (typeFilter === 'break') return session.type === 'break';
      return true;
    });

  const calculateStats = (): Stats => {
    const focusSessions = sessions.filter(s => s.type === 'focus');
    const breakSessions = sessions.filter(s => s.type === 'break');
    const completedFocusSessions = focusSessions.filter(s => s.completed).length;
    
    const totalTime = sessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);
    const totalFocusTime = focusSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);
    const totalBreakTime = breakSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);
    
    const ratedSessions = focusSessions.filter(s => s.focusRating);
    const averageRating = ratedSessions.length > 0 
      ? ratedSessions.reduce((sum, s) => sum + (s.focusRating || 0), 0) / ratedSessions.length
      : 0;

    return {
      totalSessions: sessions.length,
      focusSessions: focusSessions.length,
      breakSessions: breakSessions.length,
      completedSessions: completedFocusSessions,
      totalTime,
      totalFocusTime,
      totalBreakTime,
      averageRating,
      completionRate: focusSessions.length > 0 ? (completedFocusSessions / focusSessions.length * 100) : 0,
      subjectBreakdown: subjects.map(subject => {
        const subjectFocusSessions = focusSessions.filter(s => s.subject === subject);
        const subjectBreakSessions = breakSessions.filter(s => s.subject === subject);
        const focusTime = subjectFocusSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);
        const breakTime = subjectBreakSessions.reduce((sum, s) => sum + (s.actualDuration || s.duration || 0), 0);
        
        return {
          name: subject,
          focusSessions: subjectFocusSessions.length,
          breakSessions: subjectBreakSessions.length,
          totalFocusTime: focusTime,
          totalBreakTime: breakTime,
          totalTime: focusTime + breakTime
        };
      }).sort((a, b) => b.totalFocusTime - a.totalFocusTime)
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your session history...</p>
        </div>
      </div>
    );
  }

  const StatsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-2xl font-bold text-white">{stats.totalSessions}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Focus Sessions</p>
              <p className="text-2xl font-bold text-blue-400">{stats.focusSessions}</p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Break Sessions</p>
              <p className="text-2xl font-bold text-orange-400">{stats.breakSessions}</p>
            </div>
            <Coffee className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completion Rate</p>
              <p className="text-2xl font-bold text-green-400">{stats.completionRate.toFixed(1)}%</p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg Focus Rating</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.averageRating.toFixed(1)}/5</p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Time Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-white">Focus Time</span>
              </div>
              <div className="text-blue-400 font-medium">
                {formatDuration(stats.totalFocusTime)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className="text-white">Break Time</span>
              </div>
              <div className="text-orange-400 font-medium">
                {formatDuration(stats.totalBreakTime)}
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-white font-medium">Total Time</span>
              </div>
              <div className="text-purple-400 font-bold">
                {formatDuration(stats.totalTime)}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Study Time by Subject</h3>
          <div className="space-y-3">
            {stats.subjectBreakdown.slice(0, 6).map((subject, index) => (
              <div key={subject.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full bg-purple-${500 + (index * 100) % 400}`}></div>
                  <span className="text-white">{subject.name}</span>
                  <span className="text-gray-400 text-sm">({subject.focusSessions} sessions)</span>
                </div>
                <div className="text-purple-400 font-medium">
                  {formatDuration(subject.totalFocusTime)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Session History</h1>
          <p className="text-gray-400">Review your past study sessions and breaks</p>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Session List
            </button>
            <button
              onClick={() => setViewMode('stats')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Statistics
            </button>
          </div>
        </div>

        {viewMode === 'stats' ? (
          <StatsView />
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Sessions</option>
                  <option value="completed">Completed Only</option>
                  <option value="stopped">Stopped Early</option>
                </select>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                <option value="focus">Focus Sessions</option>
                <option value="break">Break Sessions</option>
              </select>

              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Subjects</option>
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((session) => {
                  const startDate = session.startTime;
                  const endDate = session.endTime ? new Date(session.endTime) : null;
                  const isFocusSession = session.type === 'focus';

                  return (
                    <div
                      key={session.id}
                      className={`bg-gray-800 rounded-xl p-6 border transition-all duration-200 hover:shadow-lg ${
                        isFocusSession 
                          ? 'border-gray-700 hover:border-blue-600' 
                          : 'border-orange-700 hover:border-orange-600'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              {isFocusSession ? (
                                <BookOpen className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Coffee className="w-5 h-5 text-orange-400" />
                              )}
                              <div className={`w-3 h-3 rounded-full ${
                                session.completed ? 'bg-green-500' : 'bg-red-500'
                              }`} />
                            </div>
                            <h3 className="text-lg font-semibold text-white">
                              {session.subject}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isFocusSession 
                                ? session.completed 
                                  ? 'bg-green-900/50 text-green-300 border border-green-800' 
                                  : 'bg-red-900/50 text-red-300 border border-red-800'
                                : 'bg-orange-900/50 text-orange-300 border border-orange-800'
                            }`}>
                              {isFocusSession 
                                ? (session.completed ? 'Completed' : 'Stopped Early')
                                : 'Break Session'
                              }
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              isFocusSession ? 'bg-blue-900/50 text-blue-300' : 'bg-orange-900/50 text-orange-300'
                            }`}>
                              {isFocusSession ? 'Focus' : 'Break'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                            <div className="flex items-center gap-2 text-gray-300">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              {startDate.toLocaleDateString([], {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>

                            <div className="flex items-center gap-2 text-gray-300">
                              <Clock className="w-4 h-4 text-blue-400" />
                              {startDate.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {endDate && (
                                <span>
                                  - {endDate.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>

                            <div className={`flex items-center gap-2 font-medium ${
                              isFocusSession ? 'text-blue-400' : 'text-orange-400'
                            }`}>
                              {session.completed ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                              {formatDuration(session.actualDuration || session.duration)}
                              {(session.actualDuration && session.actualDuration !== session.duration) && (
                                <span className="text-gray-500 text-xs">
                                  / {formatDuration(session.duration)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tags for focus sessions */}
                          {isFocusSession && session.tags && session.tags.length > 0 && (
                            <div className="mb-3">
                              <div className="flex flex-wrap gap-1">
                                {session.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-purple-900/50 text-purple-300 text-xs rounded-full border border-purple-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stop reason for incomplete focus sessions */}
                          {isFocusSession && !session.completed && session.stopReason && (
                            <div className="mt-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                              <p className="text-sm text-gray-300">
                                <span className="font-medium text-red-400">Reason:</span>{' '}
                                {getStopReasonLabel(session.stopReason)}
                              </p>
                              {session.stopReasonDetails && (
                                <p className="text-sm text-gray-400 mt-1 italic">
                                  "{session.stopReasonDetails}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Focus rating and reflection for completed focus sessions */}
                          {isFocusSession && session.completed && (
                            <div className="mt-3 space-y-3">
                              {session.focusRating !== undefined && (
                                <div className="flex items-center gap-3">
                                  <span className="text-sm text-gray-400 font-medium">Focus Rating:</span>
                                  <div className="flex gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <span
                                        key={star}
                                        className={`text-lg transition-colors ${
                                          star <= session.focusRating!
                                            ? 'text-yellow-400'
                                            : 'text-gray-600'
                                        }`}
                                      >
                                        {star <= session.focusRating! ? '★' : '☆'}
                                      </span>
                                    ))}
                                  </div>
                                  <span className="text-sm text-gray-500">
                                    ({session.focusRating}/5)
                                  </span>
                                </div>
                              )}
                              {session.reflection && (
                                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                                  <p className="text-sm font-medium text-gray-400 mb-1">Session Reflection:</p>
                                  <p className="text-sm text-gray-300 italic">"{session.reflection}"</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <Clock size={64} className="mx-auto mb-6 opacity-30" />
                  <h3 className="text-xl font-medium mb-2">No sessions found</h3>
                  <p>You haven't completed any study sessions yet.</p>
                  <p className="mt-1">Start your first focus session to see it here!</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};