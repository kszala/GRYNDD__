import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Clock, Timer as TimerIcon, Maximize, X, AlertTriangle, Plus, BookOpen, ChevronDown } from 'lucide-react';
import { usePomodoro } from '../hooks/usePomodoro';
import SessionCompleteModal from './SessionCompleteModal';
import { BreakPromptModal } from './BreakPromptModal';
import { useTimerStore } from '../store/timestore';
import { TimerSession } from '../types/session';

// Define filter type for GryndFlow component
interface FilterState {
  completed: boolean | null;
  priority: string | null;
  category: string | null;
}

// Define subject type
interface Subject {
  id: string;
  name: string;
  description?: string;
  color: string;
}

// Define topic type
interface Topic {
  id: string;
  chapter: string;
  topic: string;
}

// Define session data type
interface SessionData {
  id: string;
  sessionId: string;
  subject: string;
  duration: number;
  actualDuration?: number;
  startTime: Date;
  completed: boolean;
  type: 'focus' | 'break';
  wasEndedEarly?: boolean;
}

// Define lecture session type
interface LectureSession {
  id: string;
  title: string;
  videoId: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  playlistName: string;
  channelTitle: string;
}

// Define timer state type
interface TimerState {
  timeLeft: number;
  isRunning: boolean;
  currentSession: TimerSession | null;
  sessionType: 'focus' | 'break';
  showBreakPrompt: boolean;
  lastCompletedSession: any;
  startBreakTimer: (duration: number) => void;
  dismissBreakPrompt: () => void;
  isInterruptedMode: boolean;
  interruptedTime: number;
  start: () => void;
  exactDuration: number;
}

// FIXED: Enhanced formatTime function with better error handling
const formatTime = (seconds: number): string => {
  // Handle invalid inputs
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
 
  // Ensure we have a finite number
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
 
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// FIXED: Format elapsed time for interrupted sessions
const formatElapsedTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '00:00';
  }
 
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;
 
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const MOTIVATIONAL_QUOTES = [
  "Focus is the key to productivity.",
  "Every expert was once a beginner.",
  "Success is the sum of small efforts repeated day in and day out.",
  "The future depends on what you do today.",
  "Don't watch the clock; do what it does. Keep going."
];

export const PomodoroWidget: React.FC = () => {
  const {
    timeLeft,
    isRunning,
    currentSession,
    sessionType,
    startSession,
    stopSession,
    toggleTimer,
    resetTimer,
  } = usePomodoro();

  const {
    showBreakPrompt,
    lastCompletedSession,
    startBreakTimer,
    dismissBreakPrompt,
    isInterruptedMode,
    interruptedTime,
  } = useTimerStore();

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showNewSubjectForm, setShowNewSubjectForm] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#8B5CF6');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [timerMode, setTimerMode] = useState<'pomodoro' | 'normal'>('pomodoro');
  const [customTime, setCustomTime] = useState(60);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionEndedEarly, setSessionEndedEarly] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);

  // FIXED: Real working mock state (replaces broken const mocks)
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [syllabusTopics, setSyllabusTopics] = useState<Topic[]>([]);

  // FIXED: Working mock implementations (no more "Cannot find name" errors)
  const loadSubjects = () => {
    const mockSubjects: Subject[] = [
      {
        id: '1',
        name: 'Mathematics',
        description: 'Calculus and Algebra',
        color: '#8B5CF6',
      },
      {
        id: '2',
        name: 'Physics',
        description: 'Mechanics and Thermodynamics',
        color: '#3B82F6',
      },
      {
        id: '3',
        name: 'Chemistry',
        description: 'Organic and Inorganic',
        color: '#10B981',
      },
    ];
    setSubjects(mockSubjects);
  };

  const loadSyllabusTopics = (subjectId: string) => {
    let mockTopics: Topic[] = [];
    if (subjectId === '1') {
      mockTopics = [
        { id: 't1', chapter: 'Chapter 1', topic: 'Limits and Continuity' },
        { id: 't2', chapter: 'Chapter 2', topic: 'Derivatives' },
      ];
    } else if (subjectId === '2') {
      mockTopics = [
        { id: 't3', chapter: 'Chapter 1', topic: 'Kinematics' },
      ];
    } else if (subjectId === '3') {
      mockTopics = [
        { id: 't4', chapter: 'Chapter 1', topic: 'Atomic Structure' },
      ];
    }
    setSyllabusTopics(mockTopics);
  };

  const createSubject = async (
    name: string,
    description?: string,
    color?: string,
    icon?: string
  ): Promise<Subject | null> => {
    const newSubject: Subject = {
      id: Date.now().toString(),
      name: name.trim(),
      description: description?.trim(),
      color: color || '#8B5CF6',
    };
    setSubjects((prev) => [...prev, newSubject]);
    return newSubject;
  };

  // Load subjects on component mount
  useEffect(() => {
    loadSubjects();
  }, []);

  // Set default subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubject) {
      setSelectedSubject(subjects[0].name);
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubject]);

  // Load topics when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      loadSyllabusTopics(selectedSubjectId);
    }
  }, [selectedSubjectId]);

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
   
    const subject = await createSubject(
      newSubjectName.trim(),
      newSubjectDescription.trim() || undefined,
      newSubjectColor,
      'BookOpen'
    );
   
    if (subject) {
      setSelectedSubject(newSubjectName.trim());
      setSelectedSubjectId(subject.id);
      setNewSubjectName('');
      setNewSubjectDescription('');
      setNewSubjectColor('#8B5CF6');
      setShowNewSubjectForm(false);
      setShowSubjectModal(false);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = subjects.find((s: Subject) => s.id === subjectId);
    if (subject) {
      setSelectedSubject(subject.name);
      setSelectedSubjectId(subject.id);
      setSelectedTopicId('');
    }
  };

  // FIXED: Safe time calculation with fallbacks
  const safeTimeLeft = React.useMemo(() => {
    if (typeof timeLeft === 'number' && !isNaN(timeLeft) && timeLeft >= 0) {
      return timeLeft;
    }
    return 0;
  }, [timeLeft]);

  // FIXED: Calculate total elapsed time for interrupted sessions
  const totalElapsed = React.useMemo(() => {
    if (!isInterruptedMode) return 0;
   
    const currentSessionTime = getCurrentSessionElapsed();
    const safeInterruptedTime = typeof interruptedTime === 'number' && interruptedTime >= 0 ? interruptedTime : 0;
   
    return safeInterruptedTime + currentSessionTime;
  }, [isInterruptedMode, interruptedTime, currentSession]);

  // FIXED: Helper to get current session elapsed time
  const getCurrentSessionElapsed = (): number => {
    if (!currentSession) return 0;
   
    const sessionStartTime = currentSession.startTime?.getTime() || Date.now();
    const elapsedMs = Date.now() - sessionStartTime;
    return Math.max(0, Math.floor(elapsedMs / 1000));
  };

  const handleStartBreak = (duration: number = 5) => {
    startBreakTimer(duration * 60);
  };

  const handleDismissBreakPrompt = () => {
    dismissBreakPrompt();
  };

  const handleStart = () => {
    if (!currentSession) {
      setCurrentQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
     
      if (timerMode === 'pomodoro') {
        startSession(selectedSubject, undefined, selectedSubjectId, selectedTopicId);
      } else {
        startSession(selectedSubject, customTime * 60, selectedSubjectId, selectedTopicId);
      }
    } else {
      toggleTimer();
    }
  };

  const handleStop = () => {
    if (currentSession && (safeTimeLeft > 0 || isInterruptedMode)) {
      setSessionEndedEarly(true);
      setShowCompleteModal(true);
    } else {
      resetTimer();
    }
  };

  const handleSessionComplete = (focusRating?: number, reflection?: string, tags?: string[]) => {
    stopSession(undefined, undefined, false);
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
  };

  const handleSessionIncomplete = (reason: string, details?: string) => {
    stopSession(reason, details, sessionEndedEarly);
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
  };

  const handleEarlyStopComplete = () => {
    stopSession(undefined, undefined, false);
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
  };

  const handleCloseModal = () => {
    setShowCompleteModal(false);
    setSessionEndedEarly(false);
    resetTimer();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  useEffect(() => {
    // FIXED: Don't auto-complete interrupted sessions
    if (safeTimeLeft <= 0 && currentSession && !showCompleteModal && !isInterruptedMode) {
      setSessionEndedEarly(false);
      setShowCompleteModal(true);
    }
  }, [safeTimeLeft, currentSession, showCompleteModal, isInterruptedMode]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
   
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // FIXED: Safe progress calculation with proper fallbacks - Don't show progress for interrupted sessions
  const progress = React.useMemo(() => {
    if (!currentSession || isInterruptedMode) return 0;
   
    let totalDuration: number;
   
    if (sessionType === 'focus') {
      totalDuration = timerMode === 'pomodoro' ? (25 * 60) : (customTime * 60);
    } else {
      totalDuration = 5 * 60; // break duration
    }
   
    // Ensure we have valid numbers
    if (typeof totalDuration !== 'number' || totalDuration <= 0) {
      return 0;
    }
   
    const elapsed = totalDuration - safeTimeLeft;
    const progressValue = (elapsed / totalDuration) * 100;
   
    // Clamp between 0 and 100
    return Math.min(Math.max(progressValue, 0), 100);
  }, [currentSession, sessionType, timerMode, customTime, safeTimeLeft, isInterruptedMode]);

  // FIXED: Get display time and label based on session type
  const getDisplayInfo = () => {
    if (isInterruptedMode) {
      return {
        displayTime: formatElapsedTime(totalElapsed),
        label: 'Total Time (Continued)',
        color: 'text-orange-500'
      };
    } else if (sessionType === 'focus') {
      return {
        displayTime: formatTime(safeTimeLeft),
        label: timerMode === 'pomodoro' ? 'Focus Time' : 'Custom Focus',
        color: timerMode === 'pomodoro' ? 'text-purple-500' : 'text-blue-500'
      };
    } else {
      return {
        displayTime: formatTime(safeTimeLeft),
        label: 'Break Time',
        color: 'text-green-500'
      };
    }
  };

  const { displayTime, label, color } = getDisplayInfo();

  const containerClass = isFullscreen
    ? "fixed inset-0 bg-gray-900 z-50 flex items-center justify-center p-6"
    : "bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-6 border border-gray-600 shadow-xl";

  return (
    <>
      <div className={containerClass}>
        <div className={`text-center ${isFullscreen ? 'max-w-2xl w-full' : ''}`}>
          {/* Header with Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {/* FIXED: Show interrupted timer indicator */}
              {isInterruptedMode ? (
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-orange-500" />
                  <h3 className="text-2xl font-bold text-white">
                    Interrupted Session
                  </h3>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-bold text-white">
                    {timerMode === 'pomodoro' ? 'Pomodoro Timer' : 'Focus Timer'}
                  </h3>
                  <div className="flex bg-gray-700 rounded-xl p-1">
                    <button
                      onClick={() => setTimerMode('pomodoro')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timerMode === 'pomodoro'
                          ? 'bg-purple-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white'
                      }`}
                      disabled={!!currentSession}
                    >
                      <TimerIcon size={16} className="inline mr-2" />
                      Pomodoro
                    </button>
                    <button
                      onClick={() => setTimerMode('normal')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        timerMode === 'normal'
                          ? 'bg-blue-600 text-white shadow-lg'
                          : 'text-gray-300 hover:text-white'
                      }`}
                      disabled={!!currentSession}
                    >
                      <Clock size={16} className="inline mr-2" />
                      Custom
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-lg transition-all"
            >
              <Maximize size={20} />
            </button>
          </div>

          {/* Timer Circle */}
          <div className={`relative mx-auto mb-8 ${isFullscreen ? 'w-80 h-80' : 'w-64 h-64'}`}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-gray-700"
              />
              {/* FIXED: Don't show progress circle for interrupted sessions */}
              {!isInterruptedMode && (
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 45}`}
                  strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
                  className={color}
                  style={{
                    transition: 'stroke-dashoffset 1s ease-in-out',
                  }}
                />
              )}
              {/* FIXED: Show pulsing circle for interrupted sessions */}
              {isInterruptedMode && (
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="none"
                  className="text-orange-500 animate-pulse"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={`font-mono font-bold text-white ${isFullscreen ? 'text-5xl' : 'text-4xl'}`}>
                {displayTime}
              </div>
              <div className={`text-gray-400 mt-2 ${isFullscreen ? 'text-lg' : 'text-sm'}`}>
                {label}
              </div>
              {currentSession && (
                <div className={`text-purple-400 mt-1 font-medium ${isFullscreen ? 'text-base' : 'text-xs'}`}>
                  {currentSession.subject}
                </div>
              )}
              {/* FIXED: Show interrupted time info */}
              {isInterruptedMode && interruptedTime > 0 && (
                <div className={`text-orange-400 mt-1 text-xs ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                  Previous: {formatElapsedTime(interruptedTime)}
                </div>
              )}
            </div>
          </div>

          {/* Motivational Quote */}
          {currentSession && !isInterruptedMode && (
            <div className="mb-6">
              <p className={`text-gray-300 italic ${isFullscreen ? 'text-lg' : 'text-sm'} max-w-md mx-auto`}>
                "{currentQuote}"
              </p>
            </div>
          )}

          {/* FIXED: Interrupted session info */}
          {isInterruptedMode && (
            <div className="mb-6 p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
              <p className={`text-orange-300 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                ⏸️ You're continuing from where you left off. This timer runs indefinitely until you manually stop it.
              </p>
              {interruptedTime > 0 && (
                <p className={`text-orange-400 mt-2 text-xs ${isFullscreen ? 'text-sm' : 'text-xs'}`}>
                  Previous session time: {formatElapsedTime(interruptedTime)}
                </p>
              )}
            </div>
          )}

          {/* Settings - Hide for interrupted sessions */}
          {!currentSession && !isInterruptedMode && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Subject
                </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={selectedSubjectId}
                      onChange={(e) => handleSubjectChange(e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      <option value="">Select a subject...</option>
                      {subjects.map((subject: Subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowSubjectModal(true)}
                      className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                      title="Manage Subjects"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                 
                  {/* Topic Selection */}
                  {selectedSubjectId && syllabusTopics.length > 0 && (
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    >
                      <option value="">Select a topic (optional)...</option>
                      {syllabusTopics.map((topic: Topic) => (
                        <option key={topic.id} value={topic.id}>
                          {topic.chapter} - {topic.topic}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              {timerMode === 'normal' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration (minutes)
                  </label>
                  <div className="flex gap-2">
                    {[30, 45, 60, 90, 120, 180].map((minutes) => (
                      <button
                        key={minutes}
                        onClick={() => setCustomTime(minutes)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          customTime === minutes
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {minutes}m
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="480"
                    value={customTime}
                    onChange={(e) => setCustomTime(parseInt(e.target.value) || 60)}
                    className="w-full mt-2 bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    placeholder="Custom minutes"
                  />
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleStart}
              className={`flex items-center gap-3 px-8 py-4 text-white rounded-xl transition-all shadow-lg ${
                isInterruptedMode
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                  : timerMode === 'pomodoro'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
              } ${isFullscreen ? 'text-lg px-12 py-5' : ''}`}
            >
              {isRunning ? <Pause size={24} /> : <Play size={24} />}
              {currentSession ? (isRunning ? 'Pause' : 'Resume') : 'Start'}
            </button>
            {(currentSession || safeTimeLeft > 0) && (
              <button
                onClick={handleStop}
                className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg ${
                  isFullscreen ? 'text-lg px-12 py-5' : ''
                }`}
              >
                <Square size={24} />
                Stop
              </button>
            )}
          </div>

          {/* Timer Info - Hide for interrupted sessions */}
          {timerMode === 'pomodoro' && !currentSession && !isInterruptedMode && (
            <div className="mt-6 p-4 bg-gray-700/50 rounded-xl">
              <p className="text-gray-300 text-sm">
                🍅 Pomodoro Technique: 25 minutes of focused work followed by a 5-minute break
              </p>
            </div>
          )}

          {/* Debug Info (remove in production) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-2 bg-gray-800 rounded text-xs text-gray-400">
              Debug: timeLeft={timeLeft}, safeTimeLeft={safeTimeLeft}, progress={progress.toFixed(1)}%, interrupted={isInterruptedMode}, interruptedTime={interruptedTime}, totalElapsed={totalElapsed}
            </div>
          )}
        </div>
      </div>

      {/* Subject Management Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Manage Subjects</h3>
                <button
                  onClick={() => {
                    setShowSubjectModal(false);
                    setShowNewSubjectForm(false);
                    setNewSubjectName('');
                    setNewSubjectDescription('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
           
            <div className="p-6 overflow-y-auto max-h-96">
              {/* Add New Subject Form */}
              {showNewSubjectForm ? (
                <div className="space-y-4 mb-6 p-4 bg-gray-700 rounded-xl">
                  <h4 className="text-lg font-semibold text-white">Add New Subject</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g., Advanced Mathematics"
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={newSubjectDescription}
                      onChange={(e) => setNewSubjectDescription(e.target.value)}
                      placeholder="Brief description of the subject..."
                      className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#8B5A2B'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewSubjectColor(color)}
                          className={`w-8 h-8 rounded-lg border-2 transition-all ${
                            newSubjectColor === color ? 'border-white scale-110' : 'border-gray-500 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowNewSubjectForm(false);
                        setNewSubjectName('');
                        setNewSubjectDescription('');
                      }}
                      className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateSubject}
                      disabled={!newSubjectName.trim()}
                      className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Create Subject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <button
                    onClick={() => setShowNewSubjectForm(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-600 rounded-xl text-gray-400 hover:border-purple-500 hover:text-purple-400 transition-all"
                  >
                    <Plus size={20} />
                    Add New Subject
                  </button>
                </div>
              )}
             
              {/* Existing Subjects */}
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-white">Your Subjects</h4>
                {subjects.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <BookOpen size={32} className="mx-auto mb-2 opacity-50" />
                    <p>No subjects yet</p>
                    <p className="text-sm">Create your first subject to get started</p>
                  </div>
                ) : (
                  subjects.map((subject: Subject) => (
                    <div
                      key={subject.id}
                      className={`p-4 bg-gray-700 rounded-xl border transition-all cursor-pointer ${
                        selectedSubjectId === subject.id
                          ? 'border-purple-500 bg-purple-900/20'
                          : 'border-gray-600 hover:border-gray-500'
                      }`}
                      onClick={() => {
                        handleSubjectChange(subject.id);
                        setShowSubjectModal(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: subject.color }}
                        />
                        <div className="flex-1">
                          <h5 className="text-white font-medium">{subject.name}</h5>
                          {subject.description && (
                            <p className="text-gray-400 text-sm">{subject.description}</p>
                          )}
                        </div>
                        {selectedSubjectId === subject.id && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <SessionCompleteModal
        isOpen={showCompleteModal}
        onClose={handleCloseModal}
        onComplete={handleSessionComplete}
        onIncomplete={handleSessionIncomplete}
        sessionData={{
          id: currentSession?.id || '',
          sessionId: currentSession?.sessionId || '',
          subject: currentSession?.subject || selectedSubject,
          duration: currentSession ? (
            isInterruptedMode
              ? totalElapsed
              : sessionType === 'focus'
                ? timerMode === 'pomodoro'
                  ? (25 * 60) - safeTimeLeft
                  : (customTime * 60) - safeTimeLeft
                : (5 * 60) - safeTimeLeft
          ) : 0,
          startTime: currentSession?.startTime || new Date(),
          completed: !sessionEndedEarly,
          type: sessionType,
          wasEndedEarly: sessionEndedEarly,
        }}
      />

      {/* FIXED: Full SessionData object for BreakPromptModal (fixes type mismatch + "interrupted" type error) */}
      {!sessionEndedEarly && (
        <BreakPromptModal
          isOpen={showBreakPrompt}
          onStartBreak={handleStartBreak}
          onClose={handleDismissBreakPrompt}
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
};
