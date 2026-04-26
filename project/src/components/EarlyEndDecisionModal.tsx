import React from 'react';
import { AlertTriangle, Clock3, FileText } from 'lucide-react';

interface EarlyEndDecisionModalProps {
  isOpen: boolean;
  onLogSession: () => void;
  onMarkInterrupted: () => void;
  onClose: () => void;
}

export const EarlyEndDecisionModal: React.FC<EarlyEndDecisionModalProps> = ({
  isOpen,
  onLogSession,
  onMarkInterrupted,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-6 h-6 text-orange-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Session Ended Early</h2>
        </div>

        <p className="text-gray-600 mb-6">
          Your focus session ended before the timer completed. What would you like to do?
        </p>

        <div className="space-y-3">
          <button
            onClick={onLogSession}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-5 h-5 mr-2" />
            Log Session
          </button>

          <button
            onClick={onMarkInterrupted}
            className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Clock3 className="w-5 h-5 mr-2" />
            Mark as Interrupted
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};