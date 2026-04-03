import React, { useMemo, useState } from 'react';
import { Clock } from 'lucide-react';
import { SessionData } from '../types/session';

interface SessionCompleteModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onComplete?: (focusRating?: number, reflection?: string, tags?: string[], takeBreak?: boolean) => void;
  onIncomplete?: (reason: string, details?: string) => void;
  sessionData: SessionData;
}

const formatDuration = (seconds: number) => {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

const SessionCompleteModal: React.FC<SessionCompleteModalProps> = ({
  isOpen = true,
  onClose = () => {},
  onComplete = () => {},
  sessionData,
}) => {
  const [summary, setSummary] = useState('');

  const durationLabel = useMemo(() => {
    const actual = typeof sessionData.actualDuration === 'number' ? sessionData.actualDuration : sessionData.duration;
    return formatDuration(actual || 0);
  }, [sessionData.actualDuration, sessionData.duration]);

  const handleContinue = () => {
    onComplete(undefined, summary.trim() || undefined, undefined, false);
    onClose();
  };

  const handleTakeBreak = () => {
    onComplete(undefined, summary.trim() || undefined, undefined, true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Session Complete</h3>
              <p className="text-gray-400 text-sm">{sessionData.subject} - {durationLabel}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <label className="block text-sm text-gray-300">What did you do? (optional)</label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Quick summary of progress..."
            className="min-h-[120px] w-full rounded-xl border border-gray-700 bg-gray-950 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none"
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleTakeBreak}
              className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Take Break
            </button>
            <button
              onClick={handleContinue}
              className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionCompleteModal;
