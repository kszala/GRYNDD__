import { useEffect, useRef } from "react";
import { useTimerStore } from "@/store/timestore";

export const useActivityTracker = () => {
  const markAwayRunning = useTimerStore((s) => s.markAwayRunning);
  const handleReturnFromAway = useTimerStore((s) => s.handleReturnFromAway);
  const handleReturnFromInterruption = useTimerStore((s) => s.handleReturnFromInterruption);
  const handleReturnFromPostSessionAway = useTimerStore((s) => s.handleReturnFromPostSessionAway);
  const detectIntentionalActivity = useTimerStore((s) => s.detectIntentionalActivity);
  const currentState = useTimerStore((s) => s.currentState);
  const currentSessionId = useTimerStore((s) => s.currentSessionId);
  const postSessionAwayEnabled = useTimerStore((s) => s.postSessionAwayEnabled);
  const returnDetectionEnabled = useTimerStore((s) => s.returnDetectionEnabled);

  const lastActivityRef = useRef(Date.now());
  const idleTimeout = 30 * 1000; // 30 sec minimum before away/interruption detection

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    useTimerStore.setState({ lastUserInteractionAt: Date.now() });

    // If return detection is enabled, call detectIntentionalActivity
    if (returnDetectionEnabled) {
      detectIntentionalActivity();
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);
    window.addEventListener("click", updateActivity);

    return () => {
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
      window.removeEventListener("click", updateActivity);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (!currentSessionId || currentState === "away_running" || currentState === "interrupted_running") {
        return;
      }

      if (currentState === "active" && now - lastActivityRef.current > idleTimeout) {
        markAwayRunning();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSessionId, currentState, markAwayRunning]);

  // Post-session away detection
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      if (currentSessionId || !postSessionAwayEnabled) {
        return;
      }

      if (now - lastActivityRef.current > idleTimeout) {
        // Mark post-session away start
        useTimerStore.setState({
          postSessionAwayStartTime: lastActivityRef.current + idleTimeout,
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSessionId, postSessionAwayEnabled]);


  useEffect(() => {
    const handleVisibility = () => {
      if (currentSessionId) {
        // During active session
        if (document.visibilityState === "hidden") {
          if (currentState === "active") {
            markAwayRunning();
          }
        }

        if (document.visibilityState === "visible") {
          if (currentState === "away_running") {
            handleReturnFromAway("tab_return");
          }
          if (currentState === "interrupted_running" && returnDetectionEnabled) {
            handleReturnFromInterruption("interrupt_return");
          }
        }
      } else if (postSessionAwayEnabled) {
        // Post-session away detection
        if (document.visibilityState === "visible") {
          handleReturnFromPostSessionAway("tab_return");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentSessionId, currentState, markAwayRunning, handleReturnFromAway, handleReturnFromInterruption, postSessionAwayEnabled, handleReturnFromPostSessionAway]);

  useEffect(() => {
    const onReturnActivity = () => {
      const state = useTimerStore.getState();
      if (state.currentState === "away_running") {
        state.handleReturnFromAway("activity");
      }
      if (state.currentState === "interrupted_running" && state.returnDetectionEnabled) {
        state.handleReturnFromInterruption("interrupt_return");
      }
      if (!state.currentSessionId && state.postSessionAwayEnabled) {
        state.handleReturnFromPostSessionAway("activity");
      }
    };

    window.addEventListener("mousemove", onReturnActivity, { passive: true });
    window.addEventListener("keydown", onReturnActivity, { passive: true });
    window.addEventListener("click", onReturnActivity, { passive: true });
    window.addEventListener("touchstart", onReturnActivity, { passive: true });

    return () => {
      window.removeEventListener("mousemove", onReturnActivity);
      window.removeEventListener("keydown", onReturnActivity);
      window.removeEventListener("click", onReturnActivity);
      window.removeEventListener("touchstart", onReturnActivity);
    };
  }, []);
};
