import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { History } from './components/History';
import { useTimerStore } from './store/timestore';
import supabase from './supabaseClient';
import GryndFlow from './components/GryndFlow';
import GryndTube from './components/GryndTube';
import PrivacyPage from './components/PrivacyPage';
import TermsPage from './components/TermsPage';
import { useActivityTracker } from '@/hooks/useActivityTracker';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ErrorBoundary({ children, fallback }: ErrorBoundaryProps) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setError(event.error);
      setHasError(true);
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      setError(event.reason);
      setHasError(true);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div style={{ minHeight: '100vh', background: '#12110F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: '#A65C52', letterSpacing: '0.15em', marginBottom: '16px' }}>
            SOMETHING WENT WRONG
          </div>
          <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', color: '#5C5649', marginBottom: '24px' }}>
            {error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => { setHasError(false); setError(null); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#8B9E6E', border: 'none', borderRadius: '6px', fontFamily: 'Geist, sans-serif', fontSize: '13px', color: '#1C1A16', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Fallback Analytics Component
function FallbackAnalytics() {
  return (
    <div style={{ minHeight: '100vh', background: '#12110F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: '#5C5649', letterSpacing: '0.15em' }}>
          ANALYTICS UNAVAILABLE
        </div>
      </div>
    </div>
  );
}

const Analytics = lazy(() => {
  return import('./components/Analytics').catch(() => ({
    default: FallbackAnalytics
  }));
});

// Loading Component
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div style={{ minHeight: '100vh', background: '#12110F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: '#5C5649', letterSpacing: '0.15em' }}>
      {message.toUpperCase()}
    </div>
  </div>
);

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializeFromStorage = useTimerStore(state => state.initializeFromStorage);
  const recoverActiveSession = useTimerStore(state => state.recoverActiveSession);
  const recoverUnfinishedSessionFromDatabase = useTimerStore(state => state.recoverUnfinishedSessionFromDatabase);
  const restorePendingEnforcement = useTimerStore(state => state.restorePendingEnforcement);

  useActivityTracker();

  const handleAuthSuccess = (userData: any) => {
    setUser(userData);
  };

  useEffect(() => {
    initializeFromStorage();
    recoverActiveSession();
    restorePendingEnforcement();
    void recoverUnfinishedSessionFromDatabase();
    
    const checkSession = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const hasOAuthParams =
          urlParams.get('code') ||
          hashParams.get('access_token');

        if (hasOAuthParams) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          if (hasOAuthParams) {
            window.history.replaceState(null, '', window.location.pathname + '#/');
          }
        }
      } catch (err) {
        setError(`Failed to check session: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);
        setLoading(false);
      }
    );

    return () => { subscription.unsubscribe(); };
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading GRYND" />;
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: '#12110F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: '11px', color: '#A65C52', letterSpacing: '0.15em', marginBottom: '16px' }}>
            APPLICATION ERROR
          </div>
          <div style={{ fontFamily: 'Geist, sans-serif', fontSize: '13px', color: '#5C5649', marginBottom: '24px' }}>
            {error}
          </div>
          <button
            onClick={() => { setError(null); window.location.reload(); }}
            style={{ padding: '10px 24px', background: '#8B9E6E', border: 'none', borderRadius: '6px', fontFamily: 'Geist, sans-serif', fontSize: '13px', color: '#1C1A16', cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route
            path="/"
            element={!user ? <LandingPage onAuthSuccess={handleAuthSuccess} /> : <Layout />}
          >
            {user && (
              <>
                <Route index element={<Dashboard />} />
                <Route path="flow" element={<GryndFlow />} />
                <Route path="gryndtube" element={<GryndTube user={user} />} />
                <Route
                  path="analytics"
                  element={
                    <ErrorBoundary>
                      <Analytics />
                    </ErrorBoundary>
                  }
                />
                <Route path="history" element={<History />} />
              </>
            )}
          </Route>

          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="*" element={!user ? <LandingPage onAuthSuccess={handleAuthSuccess} /> : <Layout />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
