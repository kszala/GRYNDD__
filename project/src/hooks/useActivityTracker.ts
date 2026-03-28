import { useEffect, useRef } from "react";
import { useTimerStore } from "@/store/timestore";

export const useActivityTracker = () => {
  const transitionState = useTimerStore((s) => s.transitionState);
  const currentState = useTimerStore((s) => s.currentState);
  const currentSessionId = useTimerStore((s) => s.currentSessionId);

  const lastActivityRef = useRef(Date.now());
  const idleTimeout = 60 * 1000; // 60 sec

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
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

      if (!currentSessionId || currentState === "away") {
        return;
      }

      if (currentState === "focus" && now - lastActivityRef.current > idleTimeout) {
        transitionState("idle");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentSessionId, currentState, transitionState]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!currentSessionId) {
        return;
      }

      if (document.hidden) {
        if (currentState === "focus") {
          transitionState("away");
        }
      } else {
        if (currentState === "away" || currentState === "idle") {
          transitionState("paused", { reason: "awaiting_reflection", eventType: "reflection_start", returned: true });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [currentSessionId, currentState, transitionState]);
};
