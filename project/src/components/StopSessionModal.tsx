import React, { useState } from 'react';
import { CheckCircle, Coffee, Clock3, X, Star } from 'lucide-react';

interface StopSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: (mood?: number) => void;
  onTakeBreak: (mood?: number) => void;
}

export const StopSessionModal: React.FC<StopSessionModalProps> = ({
  isOpen,
  onClose,
  onDone,
  onTakeBreak,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mood, setMood] = useState<number | undefined>(undefined);

  const handleDone = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onDone(mood);
    onClose();
  };

  const handleTakeBreak = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    onTakeBreak(mood);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <Clock3 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">Ending session</h3>
              <p className="text-sm text-slate-400">Choose what to do next</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="space-y-3">
            <button
              onClick={handleDone}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-4 text-left transition-colors hover:bg-emerald-600/20 disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-white">
                <CheckCircle size={18} className="text-emerald-300" />
                <span className="font-medium">Done</span>
              </div>
              <p className="mt-1 text-sm text-emerald-100/90">Complete this session and save your progress.</p>
            </button>

            <button
              onClick={handleTakeBreak}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-indigo-600/40 bg-indigo-600/10 p-4 text-left transition-colors hover:bg-indigo-600/20 disabled:opacity-50"
            >
              <div className="flex items-center gap-3 text-white">
                <Coffee size={18} className="text-indigo-300" />
                <span className="font-medium">Take a Break</span>
              </div>
              <p className="mt-1 text-sm text-indigo-100/90">Pause your session and take a short break.</p>
            </button>
          </div>

          <div className="mt-4 border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400 mb-2">⭐ Mood (optional)</p>
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setMood(mood === i + 1 ? undefined : i + 1)}
                  className="p-1 transition-colors"
                >
                  <Star
                    size={24}
                    className={mood && mood > i ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
