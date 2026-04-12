import React from 'react';
import { X } from 'lucide-react';

type Props = {
  message: string | null;
  onDismiss: () => void;
};

export const BehaviorNudgeBanner: React.FC<Props> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      className="pointer-events-auto fixed bottom-4 left-1/2 z-[100] max-w-md -translate-x-1/2 px-3"
      role="status"
    >
      <div className="flex items-start gap-2 rounded-lg border border-white/10 bg-[#14151a]/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
        <p className="flex-1 text-center text-[12px] leading-snug text-white/85">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-0.5 text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
