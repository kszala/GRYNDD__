import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock } from 'lucide-react';
import { 
  SessionData,
  CompleteSessionData,
  IncompleteSessionData,
  HistoryEntry,
  AnalyticsMetrics
} from '../types/session';

interface SessionCompleteModalProps {
  isOpen?: boolean;
  onClose?: (showBreakPrompt?: boolean) => void;
  onComplete?: (focusRating?: number, reflection?: string, tags?: string[], takeBreak?: boolean) => void;
  onIncomplete?: (reason: string, details?: string) => void;
  sessionData: SessionData;
  startPassiveTimer?: () => void;
  startInterruptedTimer?: () => void;
  updateHistory?: (entry: HistoryEntry) => void;
  updateAnalytics?: (metrics: AnalyticsMetrics) => void;
}

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
};

const SessionCompleteModal: React.FC<SessionCompleteModalProps> = ({
  isOpen = true,
  onClose = () => {},
  onComplete = () => {},
  onIncomplete = () => {},
  sessionData,
  startPassiveTimer = () => console.log('Starting passive timer'),
  startInterruptedTimer = () => console.log('Starting interrupted timer'),
  updateHistory = () => console.log('Updating history'),
  updateAnalytics = () => console.log('Updating analytics'),
}) => {
  const [step, setStep] = useState<'initial' | 'incomplete'>('initial');
  const [incompleteReason, setIncompleteReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const COMPLETION_REASONS = [
    { value: 'taking_break', label: 'â¸ï¸ Taking Break', color: 'text-blue-400' },
    { value: 'distracted', label: 'âŒ Got Distracted', color: 'text-red-400' },
    { value: 'lost_motivation', label: 'ðŸ˜´ Lost Motivation', color: 'text-orange-400' },
    { value: 'urgent_task', label: 'ðŸš¨ Urgent Task', color: 'text-yellow-400' },
    { value: 'custom', label: 'ðŸ“ Other Reason', color: 'text-purple-400' },
  ];

  const handleComplete = () => {
    const timestamp = new Date().toISOString();
    const completeData: CompleteSessionData = {
      id: sessionData.id || `comp-${Date.now()}`,
      sessionId: sessionData.sessionId,
      subject: sessionData.subject,
      type: sessionData.type,
      startTime: new Date(sessionData.startTime || Date.now()),
      duration: sessionData.duration,
      actualDuration: sessionData.actualDuration,
      completed: true,
      wasEndedEarly: sessionData.wasEndedEarly,
      status: 'completed',
      timestamp,
      syllabusId: sessionData.syllabusId,
    };

    onComplete(undefined, undefined, undefined, true);
    updateHistory({
      sessionId: sessionData.sessionId,
      subject: sessionData.subject,
      duration: sessionData.duration,
      status: 'completed',
      timestamp,
    });
    updateAnalytics({
      sessionId: sessionData.sessionId,
      eventType: 'session_complete',
      duration: sessionData.duration,
      subject: sessionData.subject,
      timestamp,
    });

    onClose(true);
  };

  const handleIncomplete = () => {
    const timestamp = new Date().toISOString();
    const reason = incompleteReason === 'custom' ? customReason : incompleteReason;
    const incompleteData: IncompleteSessionData = {
      id: sessionData.id || `incomp-${Date.now()}`,
      sessionId: sessionData.sessionId,
      subject: sessionData.subject,
      type: sessionData.type,
      startTime: new Date(sessionData.startTime || Date.now()),
      duration: sessionData.duration,
      actualDuration: sessionData.actualDuration,
      completed: false,
      wasEndedEarly: true,
      status: 'incomplete',
      reason: incompleteReason,
      details: reason,
      timestamp,
      syllabusId: sessionData.syllabusId,
    };

    onIncomplete(incompleteReason, reason);
    updateHistory({
      sessionId: sessionData.sessionId,
      subject: sessionData.subject,
      duration: sessionData.duration,
      status: 'incomplete',
      reason,
      timestamp,
    });
    updateAnalytics({
      sessionId: sessionData.sessionId,
      eventType: 'session_interrupt',
      interruptReason: reason,
      duration: sessionData.duration,
      subject: sessionData.subject,
      timestamp,
    });

    if (incompleteReason === 'taking_break') {
      startPassiveTimer();
    } else {
      startInterruptedTimer();
    }

    onClose();
  };

  const handleClose = () => {
    setStep('initial');
    setIncompleteReason('');
    setCustomReason('');
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
              <h3 className="text-xl font-bold text-white">Session Complete!</h3>
              <p className="text-gray-400 text-sm">
                {sessionData.subject} â€¢ {formatDuration(sessionData.duration)}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {step === 'initial' ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-300 mb-6">How would you like to log this session?</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={handleComplete}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl hover:from-green-600/30 hover:to-emerald-600/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Mark as Completed</div>
                    <div className="text-green-300 text-sm">Session was productive</div>
                  </div>
                </button>
                <button
                  onClick={() => setStep('incomplete')}
                  className="flex items-center gap-4 p-4 bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500/30 rounded-xl hover:from-red-600/30 hover:to-orange-600/30 transition-all group"
                >
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">Didn't Complete</div>
                    <div className="text-red-300 text-sm">Session was interrupted</div>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Why are you ending early?
                </label>
                <div className="space-y-2">
                  {COMPLETION_REASONS.map((reason) => (
                    <button
                      key={reason.value}
                      onClick={() => setIncompleteReason(reason.value)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${
                        incompleteReason === reason.value
                          ? 'bg-gray-600 border border-gray-500'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <span className={`text-lg ${reason.color}`}>{reason.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {incompleteReason === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Please specify:
                  </label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="What happened?"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('initial')}
                  className="flex-1 py-3 px-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleIncomplete}
                  disabled={!incompleteReason || (incompleteReason === 'custom' && !customReason.trim())}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Log as Incomplete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCompleteModal;
