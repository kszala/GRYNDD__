import { addToQueue } from '../utils/outboxQueue';
import { useTimerStore } from '../store/timestore';

let lastActivityTime = Date.now();
let currentState: 'ACTIVE' | 'IDLE' | 'AWAY' = 'ACTIVE';

const IDLE_THRESHOLD = 60 * 1000; // 60 sec

function updateActivity() {
  lastActivityTime = Date.now();

  if (currentState !== 'ACTIVE') {
    transitionState('ACTIVE');
    // Presence should not set FOCUS_ACTIVE, only signal IDLE/AWAY
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    transitionState('AWAY');

    const timerState = useTimerStore.getState();
    if (timerState.currentState === 'active') {
      timerState.markAwayRunning();
    }
  } else {
    updateActivity();
  }
}

function transitionState(newState: 'ACTIVE' | 'IDLE' | 'AWAY') {
  const prevState = currentState;
  currentState = newState;

  // Get current session ID from store
  const currentSessionId = useTimerStore.getState().currentSessionId;

  // Only log if there's an active session
  if (currentSessionId) {
    addToQueue('log_session_event', {
      sessionId: currentSessionId,
      eventType: newState === 'IDLE' ? 'idle_detected' : newState === 'AWAY' ? 'away_detected' : 'resume',
      eventCategory: 'system',
      sessionPhase: 'active',
      metadata: {
        from: prevState,
        to: newState,
        source: 'presence_engine'
      }
    });
  }

  // Auto "away reason" trigger
  if (newState === 'AWAY') {
    setTimeout(() => {
      if (currentState === 'AWAY') {
        triggerAwayModal();
      }
    }, 60000); // 1 minute
  }
}

function triggerAwayModal() {
  // TODO: Replace with proper modal component
  // This should show a modal asking for the reason of being away
  // For now, we'll use a browser alert
  if (window.confirm('You\'ve been away for a while. Would you like to continue your session?')) {
    // User chose to continue - resume the session
    useTimerStore.getState().handleReturnFromAway('activity');
  } else {
    // User chose not to continue - could end session or mark as interrupted
    console.log('User chose not to continue session');
  }
}

// Idle detection
setInterval(() => {
  const now = Date.now();

  if (!document.hidden) {
    if (now - lastActivityTime > IDLE_THRESHOLD) {
      if (currentState !== 'IDLE') {
        transitionState('IDLE');

        const timerState = useTimerStore.getState();
        if (timerState.currentSessionId) {
          timerState.pauseTimer('idle_timeout');
        }
      }
    }
  }
}, 5000);

// Event listeners
window.addEventListener('mousemove', updateActivity);
window.addEventListener('keydown', updateActivity);
document.addEventListener('visibilitychange', handleVisibilityChange);

// Initialize
export function initPresenceTracker() {
  // Presence tracker is initialized when this module is imported
  console.log('Presence tracker initialized');
}