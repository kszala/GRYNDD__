import React, { useState } from 'react';
import { AlertTriangle, Coffee, Play, Star } from 'lucide-react';

interface ReturnModalProps {
  isOpen: boolean;
  onSubmit: (action: 'resume' | 'stay_idle' | 'interrupted' | 'distracted' | 'still_studying', mood?: number) => void;
  onClose: () => void;
  type: 'short' | 'medium' | 'long' | null;
  duration: number;
}

export const ReturnModal: React.FC<ReturnModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
  type,
  duration,
}) => {
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [selected, setSelected] = useState<'interrupted' | 'distracted' | 'still_studying' | null>(null);

  if (!isOpen || !type) return null;

  const handleSubmit = (action: 'resume' | 'stay_idle' | 'interrupted' | 'distracted' | 'still_studying') => {
    onSubmit(action, type === 'long' ? mood : undefined);
    onClose();
  };

  if (type === 'short') {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl p-5">
          <p className="text-white text-center mb-4">You stepped away briefly</p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit('resume')}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium"
            >
              Resume
            </button>
            <button
              onClick={() => handleSubmit('stay_idle')}
              className="flex-1 bg-gray-600 text-white p-3 rounded-lg font-medium"
            >
              Stay idle
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'medium') {
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl p-5">
          <p className="text-white text-center mb-4">
            You were away for {Math.round(duration / 60)} min
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit('resume')}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium"
            >
              Resume
            </button>
            <button
              onClick={() => handleSubmit('stay_idle')}
              className="flex-1 bg-gray-600 text-white p-3 rounded-lg font-medium"
            >
              Stay idle
            </button>
          </div>
        </div>
      </div>
    );
  }

  // long
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">What happened?</h3>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="space-y-3 mb-4">
            <button
              onClick={() => setSelected('interrupted')}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected === 'interrupted'
                  ? 'border-red-600/40 bg-red-600/10'
                  : 'border-slate-600 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 text-white">
                <AlertTriangle size={18} className="text-red-300" />
                <span className="font-medium">Interrupted</span>
              </div>
            </button>

            <button
              onClick={() => setSelected('distracted')}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected === 'distracted'
                  ? 'border-yellow-600/40 bg-yellow-600/10'
                  : 'border-slate-600 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 text-white">
                <Coffee size={18} className="text-yellow-300" />
                <span className="font-medium">Distracted</span>
              </div>
            </button>

            <button
              onClick={() => setSelected('still_studying')}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${
                selected === 'still_studying'
                  ? 'border-green-600/40 bg-green-600/10'
                  : 'border-slate-600 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 text-white">
                <Play size={18} className="text-green-300" />
                <span className="font-medium">Still studying</span>
              </div>
            </button>
          </div>

          {selected && (
            <div className="mb-4 border-t border-slate-700 pt-4">
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
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 text-white p-3 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => selected && handleSubmit(selected)}
              disabled={!selected}
              className="flex-1 bg-blue-600 text-white p-3 rounded-lg font-medium disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};