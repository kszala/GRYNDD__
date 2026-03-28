import { useState, useEffect, useCallback } from 'react';

// High-precision timing utilities for nanosecond accuracy

export class PrecisionTimer {
  private startTime: number | null = null;
  private pausedTime: number = 0;
  private isPaused: boolean = false;
  private animationFrameId: number | null = null;
  private callbacks: Array<(elapsed: number, remaining: number) => void> = [];
  private duration: number;

  constructor(durationSeconds: number) {
    this.duration = durationSeconds;
  }

  start(): void {
    if (this.isPaused) {
      // Resume from pause
      this.startTime = performance.now() - this.pausedTime;
      this.isPaused = false;
    } else {
      // Fresh start
      this.startTime = performance.now();
      this.pausedTime = 0;
    }
    this.tick();
  }

  pause(): void {
    if (this.startTime && !this.isPaused) {
      this.pausedTime = performance.now() - this.startTime;
      this.isPaused = true;
      this.stopTicking();
    }
  }

  stop(): void {
    this.stopTicking();
    this.startTime = null;
    this.pausedTime = 0;
    this.isPaused = false;
  }

  getElapsed(): number {
    if (!this.startTime) return 0;
    
    if (this.isPaused) {
      return this.pausedTime / 1000; // Convert to seconds
    }
    
    return (performance.now() - this.startTime) / 1000;
  }

  getRemaining(): number {
    const elapsed = this.getElapsed();
    return Math.max(0, this.duration - elapsed);
  }

  isComplete(): boolean {
    return this.getElapsed() >= this.duration;
  }

  onTick(callback: (elapsed: number, remaining: number) => void): void {
    this.callbacks.push(callback);
  }

  private tick = (): void => {
    const elapsed = this.getElapsed();
    const remaining = this.getRemaining();
    
    // Call all registered callbacks
    this.callbacks.forEach(callback => callback(elapsed, remaining));
    
    // Continue ticking if not complete and not paused
    if (remaining > 0 && !this.isPaused) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    } else if (remaining <= 0) {
      // Timer completed
      this.callbacks.forEach(callback => callback(this.duration, 0));
      this.stop();
    }
  };

  private stopTicking(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

// High-precision time formatting
export const formatPreciseTime = (totalSeconds: number, options: {
  showMilliseconds?: boolean;
  showMicroseconds?: boolean;
  showHours?: boolean;
} = {}): string => {
  const { showMilliseconds = false, showMicroseconds = false, showHours = false } = options;
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const milliseconds = Math.floor((totalSeconds % 1) * 1000);
  const microseconds = Math.floor(((totalSeconds % 1) * 1000000) % 1000);
  
  let timeString = '';
  
  if (showHours || hours > 0) {
    timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  if (showMilliseconds) {
    timeString += `.${milliseconds.toString().padStart(3, '0')}`;
  }
  
  if (showMicroseconds) {
    timeString += `${milliseconds.toString().padStart(3, '0')}`;
  }
  
  return timeString;
};

// Performance monitoring for timing accuracy
export class TimingPerformanceMonitor {
  private measurements: number[] = [];
  private expectedInterval: number;
  
  constructor(expectedIntervalMs: number = 16.67) { // ~60fps
    this.expectedInterval = expectedIntervalMs;
  }
  
  recordFrame(timestamp: number): void {
    if (this.measurements.length > 0) {
      const lastTimestamp = this.measurements[this.measurements.length - 1];
      const actualInterval = timestamp - lastTimestamp;
      this.measurements.push(actualInterval);
      
      // Keep only last 100 measurements for performance
      if (this.measurements.length > 100) {
        this.measurements.shift();
      }
    } else {
      this.measurements.push(timestamp);
    }
  }
  
  getAverageFrameTime(): number {
    if (this.measurements.length < 2) return 0;
    const intervals = this.measurements.slice(1); // Skip first timestamp
    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  }
  
  getFrameTimeVariance(): number {
    const avg = this.getAverageFrameTime();
    const intervals = this.measurements.slice(1);
    const squaredDiffs = intervals.map(interval => Math.pow(interval - avg, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / intervals.length;
  }
  
  getTimingAccuracy(): { 
    averageError: number; 
    maxError: number; 
    accuracy: number; 
  } {
    const intervals = this.measurements.slice(1);
    const errors = intervals.map(interval => Math.abs(interval - this.expectedInterval));
    
    const averageError = errors.reduce((sum, error) => sum + error, 0) / errors.length;
    const maxError = Math.max(...errors);
    const accuracy = Math.max(0, 100 - (averageError / this.expectedInterval) * 100);
    
    return { averageError, maxError, accuracy };
  }
}

// Session timing data structure
export interface PreciseSessionData {
  id: string;
  subject: string;
  type: 'focus' | 'break';
  plannedDuration: number;
  actualDuration: number;
  startTime: number; // High-precision timestamp
  endTime: number; // High-precision timestamp
  pausedDuration: number;
  interruptions: Array<{
    startTime: number;
    endTime: number;
    reason?: string;
  }>;
  notes?: string;
  tags?: string[];
  focusRating?: number;
  timingAccuracy: {
    averageFrameTime: number;
    variance: number;
    accuracy: number;
  };
}

// Utility to create session data with precise timing
export const createPreciseSessionData = (
  sessionId: string,
  subject: string,
  type: 'focus' | 'break',
  plannedDuration: number,
  timer: PrecisionTimer,
  performanceMonitor: TimingPerformanceMonitor,
  additionalData?: Partial<PreciseSessionData>
): PreciseSessionData => {
  const now = performance.now();
  const actualDuration = timer.getElapsed();
  
  return {
    id: sessionId,
    subject,
    type,
    plannedDuration,
    actualDuration,
    startTime: now - (actualDuration * 1000), // Reconstruct start time
    endTime: now,
    pausedDuration: 0, // This would need to be tracked separately
    interruptions: [],
    timingAccuracy: {
      averageFrameTime: performanceMonitor.getAverageFrameTime(),
      variance: performanceMonitor.getFrameTimeVariance(),
      accuracy: performanceMonitor.getTimingAccuracy().accuracy,
    },
    ...additionalData,
  };
};

// Hook for precise timer management
export const usePrecisionTimer = (durationSeconds: number) => {
  const [timer] = useState(() => new PrecisionTimer(durationSeconds));
  const [performanceMonitor] = useState(() => new TimingPerformanceMonitor());
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(durationSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  useEffect(() => {
    const handleTick = (elapsedTime: number, remainingTime: number) => {
      performanceMonitor.recordFrame(performance.now());
      setElapsed(elapsedTime);
      setRemaining(remainingTime);
      
      if (remainingTime <= 0) {
        setIsRunning(false);
        setIsPaused(false);
      }
    };
    
    timer.onTick(handleTick);
  }, [timer, performanceMonitor]);
  
  const start = useCallback(() => {
    timer.start();
    setIsRunning(true);
    setIsPaused(false);
  }, [timer]);
  
  const pause = useCallback(() => {
    timer.pause();
    setIsRunning(false);
    setIsPaused(true);
  }, [timer]);
  
  const stop = useCallback(() => {
    timer.stop();
    setIsRunning(false);
    setIsPaused(false);
    setElapsed(0);
    setRemaining(durationSeconds);
  }, [timer, durationSeconds]);
  
  return {
    elapsed,
    remaining,
    isRunning,
    isPaused,
    isComplete: remaining <= 0,
    start,
    pause,
    stop,
    getTimingStats: () => performanceMonitor.getTimingAccuracy(),
    formatElapsed: (options?: Parameters<typeof formatPreciseTime>[1]) => 
      formatPreciseTime(elapsed, options),
    formatRemaining: (options?: Parameters<typeof formatPreciseTime>[1]) => 
      formatPreciseTime(remaining, options),
  };
};