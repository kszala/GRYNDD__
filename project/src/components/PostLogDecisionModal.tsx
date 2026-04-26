import React from 'react';
import { Coffee, Play } from 'lucide-react';

interface PostLogDecisionModalProps {
  isOpen: boolean;
  onTakeBreak: () => void;
  onContinueWorking: () => void;
  onClose: () => void;
}

export const PostLogDecisionModal: React.FC<PostLogDecisionModalProps> = ({
  isOpen,
  onTakeBreak,
  onContinueWorking,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">What Next?</h2>

        <p className="text-gray-600 mb-6">
          Choose how you'd like to proceed after logging your session.
        </p>

        <div className="space-y-3">
          <button
            onClick={onTakeBreak}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Coffee className="w-5 h-5 mr-2" />
            Take a Break
          </button>

          <button
            onClick={onContinueWorking}
            className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Play className="w-5 h-5 mr-2" />
            Continue Working
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