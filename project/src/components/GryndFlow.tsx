import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Calendar, Plus, Clock, Zap, Target, BarChart3, Settings, 
  X, Edit2, Trash2, Check, Search, Filter, Undo2, ChevronDown 
} from 'lucide-react';

// --- Types ---
interface Task {
  id: string;
  text: string;
  priority: 'urgent' | 'normal' | 'later';
  completed: boolean;
  category: string;
  time: string | null; // HH:mm
  endTime: string | null;
  duration: number; // minutes
  isTimeBlock: boolean;
  createdAt: number;
  googleEventId?: string;
}

const CATEGORIES: Record<string, { name: string; color: string; border: string }> = {
  work: { name: 'Work', color: 'bg-indigo-500', border: 'border-indigo-400' },
  personal: { name: 'Personal', color: 'bg-emerald-500', border: 'border-emerald-400' },
  health: { name: 'Health', color: 'bg-rose-500', border: 'border-rose-400' },
  learning: { name: 'Learning', color: 'bg-amber-500', border: 'border-amber-400' }
};

const GryndFlowV2 = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inputValue, setInputValue] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- 1. Google Calendar Integration Logic ---
  const syncToGoogleCalendar = async (task: Task) => {
    // Note: This requires the 'gapi' client initialized in your index.html
    // and a valid OAuth2 token. 
    if (!(window as any).gapi?.client?.calendar) {
      console.log("Google Calendar API not loaded. Task saved locally only.");
      return;
    }

    const event = {
      'summary': task.text,
      'description': `GryndFlow Task - Priority: ${task.priority}`,
      'start': {
        'dateTime': new Date().toISOString().split('T')[0] + `T${task.time}:00Z`,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': new Date().toISOString().split('T')[0] + `T${task.endTime || task.time}:00Z`,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'reminders': {
        'useDefault': false,
        'overrides': [{ 'method': 'popup', 'minutes': 15 }]
      }
    };

    try {
      const request = (window as any).gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event
      });
      request.execute((res: any) => console.log('Sync Successful:', res));
    } catch (err) {
      console.error("GCal Sync Error:", err);
    }
  };

  // --- 2. Dynamic Scroll & Timeline Shrink ---
  const scrollToNow = useCallback(() => {
    const currentHour = currentTime.getHours();
    const element = document.getElementById(`slot-${currentHour}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentTime]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    setTimeout(scrollToNow, 800);
    return () => clearInterval(timer);
  }, [scrollToNow]);

  const activeTimeSlots = useMemo(() => {
    const slots = [];
    // Only show hours from now until end of day to "shrink" view
    const startHour = currentTime.getHours();
    for (let i = startHour; i <= 23; i++) {
      slots.push(i);
    }
    return slots;
  }, [currentTime]);

  // --- 3. Magic NLP Parser (Preserving your features) ---
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    // Regex for "Physics from 10am to 2pm"
    const rangeMatch = inputValue.match(/(.*) from (\d+)\s*(am|pm) to (\d+)\s*(am|pm)/i);
    
    let newTask: Task;
    if (rangeMatch) {
      const [_, text, start, sAmPm, end, eAmPm] = rangeMatch;
      const startH = sAmPm.toLowerCase() === 'pm' ? parseInt(start) + 12 : parseInt(start);
      const endH = eAmPm.toLowerCase() === 'pm' ? parseInt(end) + 12 : parseInt(end);
      
      newTask = {
        id: Math.random().toString(36),
        text: text.trim(),
        priority: 'normal',
        completed: false,
        category: 'learning',
        time: `${startH.toString().padStart(2, '0')}:00`,
        endTime: `${endH.toString().padStart(2, '0')}:00`,
        duration: (endH - startH) * 60,
        isTimeBlock: true,
        createdAt: Date.now()
      };
    } else {
      newTask = {
        id: Math.random().toString(36),
        text: inputValue,
        priority: 'normal',
        completed: false,
        category: 'work',
        time: null,
        endTime: null,
        duration: 30,
        isTimeBlock: false,
        createdAt: Date.now()
      };
    }

    setTasks([...tasks, newTask]);
    syncToGoogleCalendar(newTask);
    setInputValue('');
  };

  // --- Fix 7: Consistency Score ---
  const consistencyScore = useMemo(() => {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }, [tasks]);

  // --- Helper for current hour check ---
  const isCurrentHour = (hour: number) => hour === currentTime.getHours();

  // --- Unscheduled tasks ---
  const unscheduledTasks = tasks.filter(t => t.time === null);

  return (
    <>
      {/* Fix 1 & 2: Font imports and theme overrides */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500;700&display=swap');

        :root {
          --font-display: 'Cormorant Garamond', serif;
          --font-ui: 'Geist', sans-serif;
          --font-data: 'Geist Mono', monospace;
        }

        html {
          transition: background-color 480s ease, color 480s ease;
        }

        [data-theme="night"] {
          --color-bg: #0D0B08;
          --color-surface: #141210;
          --color-surface-raised: #1C1A16;
          --color-border: #2E2B24;
          --color-text-primary: #C8BEA8;
          --color-text-secondary: #9E9585;
          --color-text-muted: #5C5649;
          --color-accent: #8B9E6E;
          --color-warm: #C4924A;
          --color-flag: #A65C52;
          --color-observatory: #6B8CAE;
        }

        [data-theme="dawn"] {
          --color-bg: #16120E;
          --color-surface: #1E1912;
          --color-surface-raised: #252219;
          --color-border: #2E2B24;
          --color-text-primary: #C8B99A;
          --color-text-secondary: #9E9585;
          --color-text-muted: #5C5649;
          --color-accent: #C4924A;
          --color-warm: #C4924A;
          --color-flag: #A65C52;
          --color-observatory: #6B8CAE;
        }

        [data-theme="morning"] {
          --color-bg: #F5F0E8;
          --color-surface: #FFFDF7;
          --color-surface-raised: #F0EAE0;
          --color-border: #E0D8CC;
          --color-text-primary: #2C2416;
          --color-text-secondary: #7A6E5F;
          --color-text-muted: #A89880;
          --color-accent: #5C8A3C;
          --color-warm: #C4924A;
          --color-flag: #A65C52;
          --color-observatory: #6B8CAE;
        }

        [data-theme="afternoon"] {
          --color-bg: #EDE8DF;
          --color-surface: #E4DDD2;
          --color-surface-raised: #DCD2C4;
          --color-border: #D4CCBE;
          --color-text-primary: #3A3028;
          --color-text-secondary: #7A6E5F;
          --color-text-muted: #A89880;
          --color-accent: #8B7355;
          --color-warm: #C4924A;
          --color-flag: #A65C52;
          --color-observatory: #6B8CAE;
        }

        /* Fix 8: Page load animation */
        @keyframes section-reveal {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal-1 { animation: section-reveal 350ms ease forwards; }
        .reveal-2 { animation: section-reveal 350ms ease 60ms forwards; opacity: 0; }
        .reveal-3 { animation: section-reveal 350ms ease 120ms forwards; opacity: 0; }

        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--color-surface);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 3px;
        }

        /* Input placeholder styling */
        .input-placeholder::placeholder {
          color: var(--color-text-muted);
          font-family: var(--font-ui);
          font-size: 13px;
          opacity: 0.8;
        }
      `}</style>

      <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-primary)' }}>
        {/* Sidebar - High Density */}
        <aside className="w-72 border-r border-slate-900 bg-slate-950 flex flex-col p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="mb-8 reveal-1">
            <h1 className="text-lg font-bold tracking-tight flex items-center" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              <div className="w-2 h-2 bg-indigo-500 rounded-full mr-2 animate-pulse" style={{ backgroundColor: 'var(--color-accent)' }} />
              GRYNDFLOW
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-muted)' }}>Focus OS • 30 Day History</p>
          </div>

          {/* Fix 6: Sidebar Refinement - Stacked nav */}
          <nav className="space-y-1 mb-8 reveal-1">
            {['Timeline', 'Inbox', 'Analytics', 'Settings'].map((item) => (
              <button
                key={item}
                style={{
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '12px 8px',
                  borderRadius: '6px',
                  transition: 'color 150ms ease, background-color 150ms ease',
                  width: '100%'
                }}
                className="hover:bg-slate-900"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-surface-raised)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                {item === 'Timeline' && <Clock className="w-4 h-4" />}
                {item === 'Inbox' && <Check className="w-4 h-4" />}
                {item === 'Analytics' && <BarChart3 className="w-4 h-4" />}
                {item === 'Settings' && <Settings className="w-4 h-4" />}
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{item}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-slate-900 reveal-1" style={{ borderColor: 'var(--color-border)' }}>
            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/50" style={{ backgroundColor: 'var(--color-surface-raised)', borderColor: 'var(--color-border)' }}>
              <p className="text-[10px] font-bold uppercase mb-2" style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-muted)' }}>Google Sync</p>
              <div className="flex items-center text-xs" style={{ color: 'var(--color-accent)' }}>
                <div className="w-1.5 h-1.5 rounded-full mr-2" style={{ backgroundColor: 'var(--color-accent)' }} />
                Calendar Connected
              </div>
            </div>
          </div>
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col">
          {/* Subtle Header */}
          <header className="h-16 border-b border-slate-900 flex items-center px-8 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-20" style={{ borderColor: 'var(--color-border)' }}>
            <form onSubmit={handleAddTask} className="flex-1 max-w-2xl relative group reveal-2">
              <Plus className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-500 transition-colors" style={{ color: 'var(--color-text-muted)' }} />
              <input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Add task or 'Physics from 10am to 2pm'..."
                className="w-full bg-transparent border-none pl-8 text-sm focus:ring-0 input-placeholder font-medium"
                style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}
              />
            </form>
            <div className="flex items-center space-x-6 text-xs font-bold" style={{ fontFamily: 'var(--font-data)', color: 'var(--color-text-secondary)' }}>
              <button onClick={scrollToNow} className="hover:text-white transition-colors" style={{ color: 'var(--color-text-muted)' }}>JUMP TO NOW</button>
              <div className="w-px h-4" style={{ backgroundColor: 'var(--color-border)' }} />
              <span>MARCH 11, 2026</span>
            </div>
          </header>

          {/* Dynamic Timeline Area */}
          <div ref={timelineRef} className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar reveal-3">
            <div className="max-w-4xl mx-auto py-10 px-8">
              {/* Fix 4: Unscheduled Tasks Section */}
              {unscheduledTasks.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-3 mb-4">
                    <span style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>UNSCHEDULED</span>
                    <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
                  </div>
                  <div className="space-y-3">
                    {unscheduledTasks.map(task => (
                      <div 
                        key={task.id}
                        className={`${CATEGORIES[task.category]?.border || 'border-slate-700'} border-l-4 p-4 rounded-r-md shadow-2xl shadow-black/40 transition-transform hover:translate-x-1`}
                        style={{ backgroundColor: 'var(--color-surface-raised)', borderLeftColor: 'var(--color-border)' }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{task.text}</h3>
                            <p className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>{task.category}</p>
                          </div>
                          <div className="flex gap-2">
                            <button className="text-white/40 hover:text-white transition-colors" style={{ fontFamily: 'var(--font-data)', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                              place
                            </button>
                            <button className="text-white/40 hover:text-white transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTimeSlots.map((hour) => (
                <div key={hour} id={`slot-${hour}`} className="flex group min-h-[100px] border-l border-slate-900 relative" style={{ borderLeftColor: 'var(--color-border)' }}>
                  {/* Time Label */}
                  <div className="w-20 -ml-[41px] flex flex-col items-center">
                    <span 
                      className={`text-[10px] font-black px-2 py-1 rounded border ${hour === currentTime.getHours() ? 'border-indigo-500/50' : 'border-slate-900'}`}
                      style={{ 
                        fontFamily: 'var(--font-data)',
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)',
                        color: hour === currentTime.getHours() ? 'var(--color-accent)' : 'var(--color-text-muted)'
                      }}
                    >
                      {hour % 12 || 12} {hour >= 12 ? 'PM' : 'AM'}
                    </span>
                    <div className="flex-1 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 ml-6 pb-8">
                    {/* Fix 3: Current Time Line */}
                    {isCurrentHour(hour) && (
                      <div className="flex items-center gap-3 mb-3">
                        <span
                          style={{
                            fontFamily: 'var(--font-data)',
                            fontSize: '10px',
                            color: 'var(--color-accent)',
                            letterSpacing: '0.15em',
                            opacity: 0.8
                          }}
                        >
                          NOW
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: '1px',
                            background: 'var(--color-accent)',
                            opacity: 0.4
                          }}
                        />
                      </div>
                    )}

                    {/* Tasks for this hour */}
                    {tasks
                      .filter(t => t.time?.startsWith(hour.toString().padStart(2, '0')))
                      .map(task => (
                        <div 
                          key={task.id}
                          style={{ height: task.isTimeBlock ? `${(task.duration / 60) * 100}px` : 'auto' }}
                          className={`${CATEGORIES[task.category]?.color || 'bg-slate-700'} ${CATEGORIES[task.category]?.border || 'border-slate-600'} border-l-4 p-4 rounded-r-md shadow-2xl shadow-black/40 mb-2 transition-transform hover:translate-x-1`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-sm font-bold text-white" style={{ color: 'var(--color-text-primary)' }}>{task.text}</h3>
                              <p className="text-[10px] text-white/70 font-medium mt-1 uppercase tracking-wider">
                                {task.time} - {task.endTime || '30m'} • {task.category}
                              </p>
                            </div>
                            <button className="text-white/40 hover:text-white transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    
                    {/* Fix 5: Empty Hour Slot Voice */}
                    {isCurrentHour(hour) && tasks.filter(t => t.time?.startsWith(hour.toString().padStart(2, '0'))).length === 0 && (
                      <div
                        style={{
                          fontFamily: 'var(--font-data)',
                          fontSize: '11px',
                          color: 'var(--color-text-muted)',
                          paddingTop: '4px'
                        }}
                      >
                        Nothing scheduled.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Consistency Score Display (usually in sidebar) - But the prompt says "dashboard leads with ONE number", so we add it to sidebar */}
      <div style={{ position: 'fixed', bottom: '20px', left: '24px', zIndex: 50 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 400, color: 'var(--color-text-primary)' }}>
          {tasks.length === 0 ? '—' : consistencyScore}
        </div>
        <div style={{ fontFamily: 'var(--font-data)', fontSize: '11px', color: 'var(--color-text-muted)' }}>
          {tasks.length === 0
            ? "Nothing yet. The day is open."
            : consistencyScore >= 80
            ? "Consistent. Keep the standard."
            : consistencyScore >= 50
            ? "Halfway. The second half is the real test."
            : "Below where it should be."}
        </div>
      </div>
    </>
  );
};

export default GryndFlowV2;