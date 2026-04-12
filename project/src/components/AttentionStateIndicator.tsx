import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Pause, Play, Video, AlertTriangle } from 'lucide-react';

type AttentionState = 'FOCUS_ACTIVE' | 'VIDEO_ENGAGED' | 'VIDEO_PASSIVE' | 'PAUSED' | 'IDLE' | 'AWAY';

const stateConfig = {
  FOCUS_ACTIVE: { icon: Play, color: 'text-green-400', label: 'Focus' },
  VIDEO_ENGAGED: { icon: Video, color: 'text-blue-400', label: 'Video' },
  VIDEO_PASSIVE: { icon: Video, color: 'text-blue-300', label: 'Video' },
  PAUSED: { icon: Pause, color: 'text-yellow-400', label: 'Paused' },
  IDLE: { icon: EyeOff, color: 'text-gray-400', label: 'Idle' },
  AWAY: { icon: AlertTriangle, color: 'text-red-400', label: 'Away' },
};

export const AttentionStateIndicator: React.FC = () => {
  const [currentState, setCurrentState] = useState<AttentionState>('IDLE');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Listen for attention state changes from localStorage or a custom event
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'attention-state') {
        setCurrentState(e.newValue as AttentionState);
      }
    };

    const handleAttentionChange = (e: CustomEvent<AttentionState>) => {
      setCurrentState(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('attention-state-change' as any, handleAttentionChange);

    // Get initial state
    const initialState = localStorage.getItem('attention-state') as AttentionState;
    if (initialState) {
      setCurrentState(initialState);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('attention-state-change' as any, handleAttentionChange);
    };
  }, []);

  const config = stateConfig[currentState];
  const Icon = config.icon;

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        title="Show Attention State"
      >
        <Eye size={16} />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.color} bg-white/5 border border-white/10`}
        title={`Attention: ${config.label}`}
      >
        <Icon size={12} />
        <span className="hidden sm:inline">{config.label}</span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
        title="Hide Attention State"
      >
        <EyeOff size={14} />
      </button>
    </div>
  );
};