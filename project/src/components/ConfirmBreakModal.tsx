import React from 'react';

interface ConfirmBreakModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmBreakModal: React.FC<ConfirmBreakModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto mx-auto transform transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Take a break?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            Would you like to take a short break before your next session?
          </p>
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-800"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmBreakModal;