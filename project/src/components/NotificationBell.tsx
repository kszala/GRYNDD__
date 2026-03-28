import React, { useState, useEffect } from 'react';
import { Bell, Clock, CheckCircle, AlertTriangle, X, Trophy, Target, Zap, Coffee, BookOpen, Flame, Brain, Rocket, Star } from 'lucide-react';
import { storage } from '../utils/storage';
import { isToday } from '../utils/time';

interface Notification {
  id: string;
  type: 'reminder' | 'checkin' | 'achievement' | 'warning' | 'milestone' | 'streak';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    generateNotifications();
    const interval = setInterval(generateNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const generateNotifications = () => {
    const sessions = storage.getSessions();
    const todos = storage.getTodos();
    const lectures = storage.getLectureSessions();
    const newNotifications: Notification[] = [];

    // Check for missed study sessions today
    const todaySessions = sessions.filter(s => isToday(s.startTime));
    const completedToday = todaySessions.filter(s => s.completed).length;
    const todayLectures = lectures.filter(l => isToday(l.startTime));
    const todayLectureTime = todayLectures.reduce((sum, l) => sum + l.duration, 0);
    
    // Morning motivation with memes (9-11 AM)
    const hour = new Date().getHours();
    if (hour >= 9 && hour <= 11 && completedToday === 0) {
      const morningMemes = [
        'Ready to GRYND? 🔥 Time to turn that bed into a launching pad!',
        'Morning warrior! ⚔️ Your future self is counting on you!',
        'Rise and GRYND! 🌅 Success doesn\'t snooze!',
        'Coffee loaded ☕ Brain activated 🧠 Let\'s GRYND!',
        'Another day, another chance to be legendary! 🚀'
      ];
      
      newNotifications.push({
        id: 'morning-motivation',
        type: 'reminder',
        title: 'Morning GRYND Time! 🔥',
        message: morningMemes[Math.floor(Math.random() * morningMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      });
    }

    // Achievement notifications with memes
    if (completedToday >= 4) {
      const achievementMemes = [
        '🎯 Daily Goal Smashed! You\'re not just on fire, you ARE the fire! 🔥',
        '🏆 BEAST MODE ACTIVATED! ' + completedToday + ' sessions down, greatness unlocked!',
        '⚡ UNSTOPPABLE! You just turned productivity into an art form!',
        '🚀 Houston, we have a GRYNDER! ' + completedToday + ' sessions completed!',
        '👑 PRODUCTIVITY ROYALTY! Your consistency is absolutely legendary!'
      ];
      
      newNotifications.push({
        id: 'daily-goal-achieved',
        type: 'achievement',
        title: 'ACHIEVEMENT UNLOCKED! 🏆',
        message: achievementMemes[Math.floor(Math.random() * achievementMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'high'
      });
    }

    // Lecture time achievements with memes
    if (todayLectureTime > 3600) { // More than 1 hour
      const hours = Math.floor(todayLectureTime / 3600);
      const lectureMemes = [
        `📚 KNOWLEDGE MACHINE ACTIVATED! ${hours}+ hours of pure brain gains! 🧠💪`,
        `🎓 LEARNING LEGEND! ${hours} hours closer to genius status!`,
        `📖 BRAIN BUFFERING COMPLETE! ${hours}+ hours of intellectual domination!`,
        `🤓 NERD ALERT! ${hours} hours of lectures = Future CEO vibes!`,
        `🧠 BIG BRAIN ENERGY! ${hours}+ hours of knowledge absorption!`
      ];
      
      newNotifications.push({
        id: 'lecture-milestone',
        type: 'milestone',
        title: 'LEARNING BEAST MODE! 📚',
        message: lectureMemes[Math.floor(Math.random() * lectureMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      });
    }

    // Study streak notifications with memes
    const streak = calculateStreak(sessions);
    if (streak >= 7 && streak % 7 === 0) {
      const streakMemes = [
        `🔥 ${streak}-DAY STREAK! You're not just consistent, you're RELENTLESS!`,
        `⚡ STREAK MASTER! ${streak} days of pure GRYND energy!`,
        `🚀 CONSISTENCY KING/QUEEN! ${streak} days of unstoppable momentum!`,
        `💎 DIAMOND HANDS! ${streak} days of holding onto your goals!`,
        `🏆 STREAK LEGEND! ${streak} days of proving haters wrong!`
      ];
      
      newNotifications.push({
        id: `streak-${streak}`,
        type: 'streak',
        title: 'STREAK ALERT! 🔥',
        message: streakMemes[Math.floor(Math.random() * streakMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'high'
      });
    }

    // Productivity warnings with memes
    const incompleteTasks = todos.filter(t => !t.completed).length;
    if (incompleteTasks > 8) {
      const warningMemes = [
        `⚠️ TASK OVERLOAD DETECTED! ${incompleteTasks} tasks are plotting against you!`,
        `🚨 TODO LIST REBELLION! ${incompleteTasks} tasks demand attention!`,
        `⚡ PRIORITY ALERT! Time to show those ${incompleteTasks} tasks who's boss!`,
        `🎯 FOCUS NEEDED! ${incompleteTasks} tasks are waiting for your magic touch!`,
        `💪 TASK CRUSHER MODE! ${incompleteTasks} tasks won't defeat themselves!`
      ];
      
      newNotifications.push({
        id: 'task-overload',
        type: 'warning',
        title: 'TASK ARMY INCOMING! ⚠️',
        message: warningMemes[Math.floor(Math.random() * warningMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      });
    }

    // Evening reflection with memes (8-10 PM)
    if (hour >= 20 && hour <= 22 && (completedToday > 0 || todayLectureTime > 0)) {
      const reflectionMemes = [
        '🌅 REFLECTION TIME! Today you were a productivity ninja! 🥷',
        '✨ DAILY DEBRIEF! Time to celebrate your wins and plan tomorrow\'s domination!',
        '🎭 PERFORMANCE REVIEW! You just starred in "The Productivity Chronicles"!',
        '🔮 CRYSTAL BALL TIME! Reflect on today, manifest tomorrow!',
        '📝 JOURNAL ENTRY: "Dear Diary, today I was absolutely legendary..."'
      ];
      
      newNotifications.push({
        id: 'evening-reflection',
        type: 'checkin',
        title: 'REFLECTION STATION! 🌅',
        message: reflectionMemes[Math.floor(Math.random() * reflectionMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'low'
      });
    }

    // Break reminders with memes for long sessions
    const recentSessions = sessions.filter(s => {
      const timeDiff = Date.now() - s.startTime.getTime();
      return timeDiff < 2 * 60 * 60 * 1000; // Last 2 hours
    });

    if (recentSessions.length >= 3) {
      const breakMemes = [
        '☕ BREAK ALERT! Even machines need cooldown time!',
        '🧘 RECHARGE MODE! Your brain deserves a spa day!',
        '🌿 TOUCH GRASS TIME! Step away from the grind for a hot minute!',
        '🔋 BATTERY LOW! Time to plug into some rest and relaxation!',
        '🏖️ MINI VACATION! 15 minutes of freedom awaits!'
      ];
      
      newNotifications.push({
        id: 'break-reminder',
        type: 'reminder',
        title: 'BREAK TIME HERO! ☕',
        message: breakMemes[Math.floor(Math.random() * breakMemes.length)],
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      });
    }

    // Motivational milestones with memes
    const totalStudyTime = sessions
      .filter(s => s.completed)
      .reduce((sum, s) => sum + s.duration, 0);
    
    const milestones = [
      { hours: 10, message: '🎉 FIRST 10 HOURS! You just unlocked "Dedicated Student" achievement!' },
      { hours: 25, message: '🚀 25 HOURS OF POWER! You\'re officially in the productivity hall of fame!' },
      { hours: 50, message: '💎 HALF-CENTURY HERO! 50 hours of pure focus = Future CEO energy!' },
      { hours: 100, message: '👑 CENTURION STATUS! 100 hours of relentless focus = LEGENDARY!' },
    ];

    const currentHours = Math.floor(totalStudyTime / 3600);
    const milestone = milestones.find(m => m.hours === currentHours);
    
    if (milestone) {
      newNotifications.push({
        id: `milestone-${currentHours}h`,
        type: 'milestone',
        title: '🏆 Milestone Achieved!',
        message: milestone.message,
        timestamp: new Date(),
        read: false,
        priority: 'high'
      });
    }

    // Random motivational push notifications
    if (Math.random() < 0.1 && completedToday > 0) { // 10% chance if user has been active
      const randomMotivation = [
        '🔥 FIRE ALERT! You\'re absolutely crushing it today!',
        '⚡ ENERGY CHECK! Your productivity levels are off the charts!',
        '🚀 ROCKET FUEL! You\'re launching into greatness!',
        '💪 STRENGTH METER! Your discipline is getting swole!',
        '🧠 BRAIN GAINS! Your future self is doing a happy dance!',
        '🎯 BULLSEYE! You\'re hitting all your targets today!',
        '👑 ROYALTY ALERT! You\'re ruling your productivity kingdom!',
        '🌟 STAR POWER! You\'re shining brighter than ever!'
      ];
      
      newNotifications.push({
        id: `random-motivation-${Date.now()}`,
        type: 'achievement',
        title: 'MOTIVATION BOOST! 🚀',
        message: randomMotivation[Math.floor(Math.random() * randomMotivation.length)],
        timestamp: new Date(),
        read: false,
        priority: 'medium'
      });
    }
    setNotifications(prev => {
      const existing = prev.filter(n => 
        !newNotifications.some(newN => newN.id === n.id)
      );
      return [...existing, ...newNotifications].slice(0, 20); // Keep only latest 20
    });
  };

  const calculateStreak = (sessions: any[]) => {
    const today = new Date();
    let streak = 0;
    let checkDate = new Date(today);

    while (true) {
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayHasActivity = sessions.some(
        session => session.startTime >= dayStart && 
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
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reminder': return Clock;
      case 'checkin': return CheckCircle;
      case 'achievement': return Trophy;
      case 'milestone': return Target;
      case 'streak': return Zap;
      case 'warning': return AlertTriangle;
      default: return Bell;
    }
  };

  const getColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') {
      switch (type) {
        case 'achievement': return 'text-yellow-400';
        case 'milestone': return 'text-purple-400';
        case 'streak': return 'text-orange-400';
        default: return 'text-green-400';
      }
    }
    
    switch (type) {
      case 'reminder': return 'text-blue-400';
      case 'checkin': return 'text-purple-400';
      case 'achievement': return 'text-green-400';
      case 'milestone': return 'text-cyan-400';
      case 'streak': return 'text-orange-400';
      case 'warning': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getBgColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') {
      return 'bg-gradient-to-r from-purple-600/10 to-blue-600/10 border-purple-500/20';
    }
    if (priority === 'medium') {
      return 'bg-gray-700/30 border-gray-600/30';
    }
    return 'bg-gray-800/20 border-gray-700/20';
  };

  const sortedNotifications = notifications.sort((a, b) => {
    // Sort by priority first, then by timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  if (unreadCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200 group"
      >
        <Bell size={20} className="group-hover:animate-pulse" />
        {unreadCount > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute right-0 top-12 w-96 bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 max-h-[80vh] overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/50 to-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <Bell className="w-5 h-5 text-purple-400" />
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium px-3 py-1 bg-purple-600/20 rounded-full"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              
              {unreadCount > 0 && (
                <div className="text-sm text-gray-400">
                  {unreadCount} new notification{unreadCount !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              {sortedNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell size={32} className="mx-auto mb-3 opacity-50" />
                  <p className="font-medium">All caught up!</p>
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                sortedNotifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-700/30 last:border-b-0 hover:bg-gray-700/20 transition-all cursor-pointer ${
                        !notification.read ? getBgColor(notification.type, notification.priority) : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          notification.priority === 'high' 
                            ? 'bg-gradient-to-br from-purple-500 to-blue-600' 
                            : 'bg-gray-700'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            notification.priority === 'high' ? 'text-white' : getColor(notification.type, notification.priority)
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-semibold text-white text-sm leading-tight">
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeNotification(notification.id);
                              }}
                              className="text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          
                          <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between mt-3">
                            <p className="text-gray-500 text-xs">
                              {notification.timestamp.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            
                            {notification.priority === 'high' && (
                              <span className="px-2 py-1 bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-300 text-xs rounded-full font-medium">
                                Priority
                              </span>
                            )}
                          </div>

                          {notification.action && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                notification.action!.onClick();
                              }}
                              className="mt-2 text-xs text-purple-400 hover:text-purple-300 font-medium"
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>

                        {!notification.read && (
                          <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full mt-2 flex-shrink-0 animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
};
