import React, { useState, useEffect, useRef } from 'react';
import supabase from '../supabaseClient';
import { GryndLogo } from './GryndLogo';

// Type definitions
interface UserData {
  id: string;
  email: string;
  name: string;
  picture: string;
  token: string;
}

// --- Supabase OAuth Hook ---
const useSupabaseAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        }
      });
      if (authError) setError(authError.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  return { signInWithGoogle, isLoading, error };
};

// --- Session State Types for Live Demo ---
type SessionState = 'morning' | 'storm' | 'deepFocus';
const stateConfig = {
  morning: { bg: '#0A0C0F', accent: '#3B82F6', text: '#E8E8E6', label: 'MORNING · LOW INTERRUPTION', score: 94 },
  storm: { bg: '#0A0C0F', accent: '#F97316', text: '#E8E8E6', label: 'STORM · HIGH INTERRUPTION', score: 67 },
  deepFocus: { bg: '#0A0C0F', accent: '#10B981', text: '#E8E8E6', label: 'DEEP FOCUS · LOCKED', score: 98 }
};

// --- Main Component ---
export const LandingPage = ({ onAuthSuccess = () => {} }: { onAuthSuccess?: (user: UserData) => void }) => {
  const { signInWithGoogle, isLoading, error } = useSupabaseAuth();
  const [user, setUser] = useState<UserData | null>(null);
  const [demoState, setDemoState] = useState<SessionState>('morning');
  const [demoTimeLeft, setDemoTimeLeft] = useState(1500); // 25:00 in seconds
  const [stats] = useState({ streak: 14, dailyFocus: 2.4, consistency: 91, totalSessions: 2847 });

  // Auth session handling
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        const userData: UserData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'User',
          picture: session.user.user_metadata?.avatar_url || '',
          token: session.access_token || ''
        };
        setUser(userData);
        onAuthSuccess(userData);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData: UserData = {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.full_name || 'User',
          picture: session.user.user_metadata?.avatar_url || '',
          token: session.access_token || ''
        };
        setUser(userData);
        onAuthSuccess(userData);
      } else setUser(null);
    });
    return () => { listener?.subscription.unsubscribe(); };
  }, [onAuthSuccess]);

  // Rotate demo states every 3 seconds
  useEffect(() => {
    const states: SessionState[] = ['morning', 'storm', 'deepFocus'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % states.length;
      setDemoState(states[idx]);
      // Reset timer based on state
      setDemoTimeLeft(1500);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Demo timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setDemoTimeLeft(prev => (prev > 0 ? prev - 1 : 1500));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // --- If logged in, show minimal dashboard preview ---
  if (user) {
    return (
      <div className="min-h-screen bg-[#0A0C0F] text-[#E8E8E6] flex items-center justify-center p-6">
        <div className="max-w-md w-full border border-[#1F2128] bg-[#0F1117] p-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#1F2128]">
            <div className="text-sm font-mono tracking-wide">GRYND</div>
            <button onClick={handleSignOut} className="text-[11px] font-mono uppercase tracking-wider text-[#5E6673] hover:text-[#E8E8E6] transition">Sign Out</button>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <img src={user.picture} className="w-12 h-12 rounded-full border border-[#2A2D35]" alt="" />
            <div>
              <div className="font-medium text-sm">{user.name}</div>
              <div className="text-[11px] text-[#5E6673] font-mono">{user.email}</div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-xs font-mono border-t border-[#1F2128] pt-4">
              <span className="text-[#5E6673]">STREAK</span>
              <span className="text-[#10B981]">{stats.streak} days</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#5E6673]">DAILY AVG</span>
              <span>{stats.dailyFocus}hr</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#5E6673]">CONSISTENCY</span>
              <span>{stats.consistency}%</span>
            </div>
          </div>
          <button className="w-full mt-6 py-2.5 text-[11px] font-mono uppercase tracking-wider bg-[#2A2D35] hover:bg-[#3A3E48] transition text-[#E8E8E6]">
            Start Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0A0C0F] text-[#E8E8E6]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #0A0C0F; }
      `}</style>

      {/* Navbar - Minimal, Rize style */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0C0F]/95 backdrop-blur-sm border-b border-[#1F2128] px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <GryndLogo />
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="text-[12px] font-mono font-medium px-4 py-1.5 border border-[#2A2D35] hover:border-[#4A4E5A] hover:bg-[#111317] transition-all rounded-sm"
          >
            {isLoading ? 'Connecting...' : 'Sign in →'}
          </button>
        </div>
      </nav>

      {/* Hero - Two column with live product screenshot */}
      <main className="pt-32 pb-20 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Left Column */}
            <div>
              <div className="inline-flex items-center gap-2 mb-6">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
                <span className="text-[11px] font-mono tracking-wider text-[#5E6673] uppercase">Enforcement platform</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-6">
                Study isn't a mood.
                <br />
                <span className="text-[#5E6673]">It's a system.</span>
              </h1>
              <p className="text-[#8E95A5] text-base leading-relaxed mb-8 max-w-md">
                Grynd tracks every second, enforces every session, and tells you exactly where you lost your edge. Built for JEE, NEET, and IPMAT students who are done lying to themselves.
              </p>
              <div className="flex items-center gap-4 mb-8">
                <button
                  onClick={signInWithGoogle}
                  className="px-6 py-2.5 bg-white text-[#0A0C0F] text-[12px] font-mono font-medium uppercase tracking-wider hover:bg-[#E8E8E6] transition rounded-sm"
                >
                  Start free
                </button>
                <button className="text-[12px] font-mono font-medium text-[#8E95A5] hover:text-[#E8E8E6] transition">
                  See how it works
                </button>
              </div>
              {error && (
                <div className="text-[11px] font-mono text-[#F97316] border border-[#F97316]/20 bg-[#F97316]/5 px-3 py-2 rounded-sm">
                  {error}
                </div>
              )}
              <div className="flex gap-6 text-[11px] font-mono text-[#5E6673] border-t border-[#1F2128] pt-6">
                <span>{stats.streak}-day streak avg</span>
                <span>{stats.dailyFocus}hr daily focus</span>
                <span>{stats.consistency}% consistency</span>
              </div>
            </div>

            {/* Right Column - Live Product Screenshot */}
            <div className="relative">
              <div className="border border-[#2A2D35] bg-[#0F1117] rounded-sm overflow-hidden shadow-2xl">
                {/* Browser Chrome */}
                <div className="bg-[#0A0C0F] px-4 py-2.5 border-b border-[#1F2128] flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2D35]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2D35]"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-[#2A2D35]"></div>
                  </div>
                  <div className="flex-1 max-w-[200px] mx-auto">
                    <div className="bg-[#1A1C24] rounded-sm px-3 py-1 text-[9px] font-mono text-[#5E6673] text-center">app.grynd.in/session</div>
                  </div>
                </div>
                {/* Dashboard Content */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider mb-1" style={{ color: stateConfig[demoState].accent }}>
                        {stateConfig[demoState].label}
                      </div>
                      <div className="text-lg font-medium">Current Session</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-mono text-[#5E6673]">Focus Score</div>
                      <div className="text-xl font-mono font-medium" style={{ color: stateConfig[demoState].accent }}>
                        {stateConfig[demoState].score}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-3xl font-mono font-medium tracking-tight">{formatTime(demoTimeLeft)}</div>
                    <div className="flex-1 h-1 bg-[#1F2128] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${(demoTimeLeft / 1500) * 100}%`, background: stateConfig[demoState].accent }}
                      ></div>
                    </div>
                  </div>
                  <div className="border-t border-[#1F2128] pt-4 mt-2">
                    <div className="flex justify-between text-[10px] font-mono text-[#5E6673]">
                      <span>Interruption rate: {demoState === 'storm' ? '0.8' : '0.1'}/min</span>
                      <span>Session quality: {demoState === 'storm' ? 'Critical' : 'Optimal'}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-center mt-3">
                <span className="text-[9px] font-mono text-[#5E6673] tracking-wider">LIVE DEMO · UPDATES EVERY 4 SECONDS</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Stats Strip - Clean data display */}
      <div className="border-y border-[#1F2128] py-4 my-8">
        <div className="max-w-6xl mx-auto px-8 flex justify-between text-[11px] font-mono text-[#5E6673]">
          <span>{stats.totalSessions.toLocaleString()} sessions tracked</span>
          <span>94% completion rate</span>
          <span>23 min avg interruption recovery</span>
          <span>0 excuses accepted</span>
        </div>
      </div>

      {/* Feature 1 - Session Intelligence */}
      <section className="max-w-6xl mx-auto px-8 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[10px] font-mono text-[#5E6673] mb-3">INTELLIGENT INTERFACE</div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">Your behavior changes the interface.</h2>
            <p className="text-[#8E95A5] text-sm leading-relaxed">
              Morning / Storm / Deep Focus auto-detection. No manual mode switching. The system reads your interruption rate, session quality, and focus score — and shifts the entire UI accent color automatically.
            </p>
          </div>
          <div className="flex gap-3">
            {Object.entries(stateConfig).map(([key, cfg]) => (
              <div key={key} className="flex-1 bg-[#0F1117] border border-[#1F2128] p-4">
                <div className="text-[9px] font-mono uppercase mb-2" style={{ color: cfg.accent }}>{key.toUpperCase()}</div>
                <div className="text-xl font-mono font-medium mb-1">{cfg.score}</div>
                <div className="text-[9px] font-mono text-[#5E6673]">focus score</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature 2 - Environment */}
      <section className="max-w-6xl mx-auto px-8 py-20 border-t border-[#1F2128]">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1">
            <div className="flex gap-2">
              {['dawn', 'plains', 'night'].map((type, i) => (
                <div key={type} className="flex-1 h-20 bg-[#0F1117] border border-[#1F2128] rounded-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0A0C0F]"></div>
                  <div className="absolute bottom-1 left-1 text-[7px] font-mono text-[#5E6673]">
                    {type === 'dawn' ? '5:32 AM' : type === 'plains' ? '3:17 PM' : '11:08 PM'}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 md:order-2">
            <div className="text-[10px] font-mono text-[#5E6673] mb-3">ADAPTIVE ENVIRONMENT</div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">The world outside changes as you study.</h2>
            <p className="text-[#8E95A5] text-sm leading-relaxed">
              Time-of-day environment — pre-dawn mountains, afternoon plains, night terrain. Always running, never configured. When you start a session the world quiets so you can work.
            </p>
          </div>
        </div>
      </section>

      {/* Feature 3 - GryndMode */}
      <section className="max-w-6xl mx-auto px-8 py-20 border-t border-[#1F2128]">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-[10px] font-mono text-[#5E6673] mb-3">ENFORCEMENT LAYER</div>
            <h2 className="text-3xl font-semibold tracking-tight mb-4">One click. Browser locked. No exits.</h2>
            <p className="text-[#8E95A5] text-sm leading-relaxed">
              Chrome extension enforcement — no new tabs, no tab switching, no leaving Grynd until session ends. Not a blocker. An enforcer.
            </p>
          </div>
          <div className="bg-[#0F1117] border border-[#1F2128] p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2128]">
              <div className="text-[10px] font-mono text-[#5E6673]">app.grynd.in/locked</div>
              <div className="text-[9px] font-mono text-[#10B981]">🔒 ENFORCED</div>
            </div>
            <div className="space-y-2 text-[11px] font-mono text-[#5E6673]">
              <div className="flex justify-between"><span>Tab switching</span><span className="text-[#F97316]">BLOCKED</span></div>
              <div className="flex justify-between"><span>New tab</span><span className="text-[#F97316]">BLOCKED</span></div>
              <div className="flex justify-between"><span>Exit session</span><span className="text-[#F97316]">UNAVAILABLE</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Promise System */}
      <section className="max-w-4xl mx-auto px-8 py-20 border-t border-[#1F2128] text-center">
        <div className="text-[10px] font-mono text-[#5E6673] mb-4 tracking-wider">ACCOUNTABILITY LAYER</div>
        <h2 className="text-4xl font-semibold tracking-tight mb-4">You said you'd study NLM yesterday.</h2>
        <p className="text-[#8E95A5] text-sm mb-10">Grynd remembered. Did you?</p>
        <div className="max-w-sm mx-auto bg-[#0F1117] border border-[#1F2128] p-6">
          <div className="text-[9px] font-mono text-[#F97316] uppercase mb-2">Outstanding Promise</div>
          <div className="text-base font-medium mb-1">NLM · Newton's Laws</div>
          <div className="text-[10px] font-mono text-[#5E6673] mb-4">Due: Yesterday</div>
          <button className="w-full py-2 bg-[#2A2D35] hover:bg-[#3A3E48] text-[11px] font-mono uppercase tracking-wider transition">
            Resume Session →
          </button>
        </div>
      </section>

      {/* Social Proof - Clean stats cards */}
      <section className="max-w-6xl mx-auto px-8 py-20 border-t border-[#1F2128]">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { exam: 'JEE 2025', quote: 'No more lying about study hours. Grynd shows exactly when I tabbed out.', name: 'Arjun S.', metric: '+18% mock scores' },
            { exam: 'NEET 2025', quote: 'The enforcement mode is brutal. But it works. First time I hit 6hrs deep work.', name: 'Neha K.', metric: '+2.4hr avg' },
            { exam: 'CAT 2025', quote: 'Environment shifts keep me in flow state. Recovery time tracking is a game changer.', name: 'Rohan M.', metric: '91% consistency' }
          ].map((t, i) => (
            <div key={i} className="bg-[#0F1117] border border-[#1F2128] p-6">
              <div className="text-[9px] font-mono text-[#5E6673] mb-3">{t.exam}</div>
              <p className="text-sm text-[#E8E8E6] mb-4 leading-relaxed">“{t.quote}”</p>
              <div className="flex justify-between items-center pt-3 border-t border-[#1F2128]">
                <span className="text-[11px] font-mono text-[#8E95A5]">{t.name}</span>
                <span className="text-[10px] font-mono text-[#10B981]">{t.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#1F2128] py-20 text-center">
        <div className="max-w-2xl mx-auto px-8">
          <h2 className="text-4xl font-semibold tracking-tight mb-3">Stop planning to study.</h2>
          <div className="text-2xl font-mono font-medium text-[#5E6673] mb-8">START SESSION →</div>
          <button
            onClick={signInWithGoogle}
            disabled={isLoading}
            className="px-8 py-3 bg-white text-[#0A0C0F] text-[12px] font-mono font-medium uppercase tracking-wider hover:bg-[#E8E8E6] transition rounded-sm"
          >
            {isLoading ? 'Connecting...' : 'Sign in with Google'}
          </button>
          <div className="text-[9px] font-mono text-[#5E6673] mt-4">Free during beta · No credit card required</div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F2128] py-6">
        <div className="max-w-6xl mx-auto px-8 flex justify-between items-center text-[10px] font-mono text-[#5E6673]">
          <div>GRYND</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#E8E8E6] transition">Privacy</a>
            <a href="#" className="hover:text-[#E8E8E6] transition">Terms</a>
            <a href="#" className="hover:text-[#E8E8E6] transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;