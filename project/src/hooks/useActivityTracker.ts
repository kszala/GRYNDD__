import { useEffect, useRef } from "react";
import { useTimerStore } from "@/store/timestore";

export const useActivityTracker = () => {
  const markAwayRunning = useTimerStore((s) => s.markAwayRunning);
  const handleReturnFromAwayOrInterruption = useTimerStore((s) => s.handleReturnFromAwayOrInterruption);
  const currentState = useTimerStore((s) => s.currentState);
  const currentSessionId = useTimerStore((s) => s.currentSessionId);

  const lastActivityRef = useRef(Date.now());
  const idleTimeout = 60 * 1000; // 60 sec

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
    useTimerStore.setState({ lastUserInteractionAt: Date.now() });
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

      if (currentState === "focus" && now - lastActivityRef.current > idleTimeout) {
        markAwayRunning();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSessionId, currentState, markAwayRunning]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!currentSessionId) {
        return;
      }

      if (document.visibilityState === "hidden") {
        if (currentState === "focus") {
          markAwayRunning();
        }
      }

      if (document.visibilityState === "visible") {
        if (currentState === "away_running") {
          handleReturnFromAwayOrInterruption("tab_return");
        }
        if (currentState === "interrupted_running") {
          handleReturnFromAwayOrInterruption("interrupt_return");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentSessionId, currentState, markAwayRunning, handleReturnFromAwayOrInterruption]);

  useEffect(() => {
    const onReturnActivity = () => {
      const state = useTimerStore.getState();
      if (state.currentState === "away_running") {
        state.handleReturnFromAwayOrInterruption("activity");
      }
      if (state.currentState === "interrupted_running") {
        state.handleReturnFromAwayOrInterruption("interrupt_return");
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
