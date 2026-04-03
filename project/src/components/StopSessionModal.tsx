import React, { useMemo, useState } from 'react';
import { AlertTriangle, Clock3, Coffee, FileText, X } from 'lucide-react';

interface StopSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogEarly: (payload: { takeBreak: boolean; note?: string; breakMinutes?: number }) => void;
  onInterrupted: () => void;
}

type StopMode = 'choose' | 'log_early';

const BREAK_OPTIONS = [5, 10, 15, 20];

export const StopSessionModal: React.FC<StopSessionModalProps> = ({
  isOpen,
  onClose,
  onLogEarly,
  onInterrupted,
}) => {
  const [mode, setMode] = useState<StopMode>('choose');
  const [note, setNote] = useState('');
  const [breakMinutes, setBreakMinutes] = useState(5);

  const noteCount = useMemo(() => note.trim().length, [note]);

  const resetAndClose = () => {
    setMode('choose');
    setNote('');
    setBreakMinutes(5);
    onClose();
  };

  const handleLogAndContinue = () => {
    onLogEarly({ takeBreak: false, note: note.trim() || undefined, breakMinutes });
    resetAndClose();
  };

  const handleTakeBreak = () => {
    onLogEarly({ takeBreak: true, note: note.trim() || undefined, breakMinutes });
    resetAndClose();
  };

  const handleInterrupted = () => {
    onInterrupted();
    resetAndClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
              <Clock3 size={20} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">End Session</h3>
              <p className="text-sm text-slate-400">Choose how to log this stop</p>
            </div>
          </div>
          <button
            onClick={resetAndClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {mode === 'choose' && (
            <div className="space-y-3">
              <button
                onClick={() => setMode('log_early')}
                className="w-full rounded-xl border border-slate-600 bg-slate-700/60 p-4 text-left transition-colors hover:bg-slate-700"
              >
                <div className="flex items-center gap-3 text-white">
                  <FileText size={18} className="text-emerald-300" />
                  <span className="font-medium">Log Session Early</span>
                </div>
                <p className="mt-1 text-sm text-slate-300">Save progress and either continue your day or take a short break.</p>
              </button>

              <button
                onClick={handleInterrupted}
                className="w-full rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-left transition-colors hover:bg-amber-600/20"
              >
                <div className="flex items-center gap-3 text-white">
                  <AlertTriangle size={18} className="text-amber-300" />
                  <span className="font-medium">Interrupted</span>
                </div>
                <p className="mt-1 text-sm text-amber-100/90">Start interrupted mode now. You&apos;ll be asked for reason when you return.</p>
              </button>
            </div>
          )}

          {mode === 'log_early' && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">What did you accomplish? (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Completed chapter 5, solved 3 problems..."
                  className="min-h-[110px] w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <div className="mt-1 text-right text-xs text-slate-400">{noteCount}/200</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-300">Break duration (if taking a break)</div>
                <div className="grid grid-cols-4 gap-2">
                  {BREAK_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setBreakMinutes(m)}
                      className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                        breakMinutes === m
                          ? 'border-indigo-400 bg-indigo-500/20 text-white'
                          : 'border-slate-600 bg-slate-700/40 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={handleTakeBreak}
                  className="flex-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  <span className="inline-flex items-center gap-2"><Coffee size={15} />Take a Break</span>
                </button>
                <button
                  onClick={handleLogAndContinue}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Log and Continue
                </button>
              </div>

              <button
                onClick={() => setMode('choose')}
                className="w-full rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
