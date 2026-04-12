// project/src/components/InterruptReturnModal.tsx
import React, { useState } from 'react';
import { Star } from 'lucide-react';

type InterruptReason = 'family' | 'distracted' | 'urgent_task' | 'disturbed_by_somebody';

interface InterruptReturnModalProps {
  isOpen: boolean;
  durationSeconds?: number;
  onClose: () => void;
  onSubmit: (reason: InterruptReason, mood?: number, details?: string) => void;
}

const OPTIONS: Array<{ key: InterruptReason; label: string }> = [
  { key: 'family', label: 'Family' },
  { key: 'distracted', label: 'Distracted' },
  { key: 'urgent_task', label: 'Urgent task' },
  { key: 'disturbed_by_somebody', label: 'Disturbed by somebody' },
];

export const InterruptReturnModal: React.FC<InterruptReturnModalProps> = ({
  isOpen,
  durationSeconds = 0,
  onClose,
  onSubmit,
}) => {
  const [selected, setSelected] = useState<InterruptReason | null>(null);
  const [mood, setMood] = useState<number | undefined>(undefined);
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-rose-950 shadow-2xl">
        <div className="px-6 py-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-rose-300">Interrupt return</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Where were you during the interruption?</h2>
              <p className="mt-2 text-sm text-rose-200">
                You were paused for {Math.floor(durationSeconds / 60)}m {durationSeconds % 60}s. Share what pulled you away so you can return with focus.
              </p>
            </div>
            <span className="rounded-full bg-rose-500/20 px-3 py-1 text-sm text-rose-100">
              Return
            </span>
          </div>

          <div className="space-y-3">
            {OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelected(option.key)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                  selected === option.key
                    ? 'border-rose-400 bg-rose-500/20 text-white'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-rose-400'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {selected && (
            <div className="mt-5 rounded-3xl border border-rose-500/30 bg-rose-500/5 p-4">
              <p className="mb-3 text-sm text-rose-200">Optional mood & details</p>

              <div className="mb-4 flex items-center justify-center gap-1">
                {Array.from({ length: 5 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setMood(mood === index + 1 ? undefined : index + 1)}
                    className="p-1"
                  >
                    <Star
                      size={22}
                      className={
                        mood && mood > index
                          ? 'text-rose-300 fill-rose-300'
                          : 'text-slate-600'
                      }
                    />
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                placeholder="Write a quick note about what happened..."
                className="w-full resize-none rounded-2xl border border-rose-500/30 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-rose-400 focus:outline-none"
              />
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:border-rose-400"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => selected && onSubmit(selected, mood, details)}
              disabled={!selected}
              className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};