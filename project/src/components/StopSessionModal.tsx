import React, { useState } from 'react';

import { X } from 'lucide-react';

import { STOP_REASONS, StopReason } from '../types';

interface StopSessionModalProps {

  isOpen: boolean;

  onClose: () => void;

  onSubmit: (reason: StopReason, details?: string) => void;

}

export const StopSessionModal: React.FC<StopSessionModalProps> = ({

  isOpen,

  onClose,

  onSubmit,

}) => {

  const [selectedReason, setSelectedReason] = useState<StopReason>('distraction');

  const [details, setDetails] = useState('');

  const handleSubmit = (e: React.FormEvent) => {

    e.preventDefault();

    onSubmit(selectedReason, details.trim() || undefined);

    setDetails('');

    onClose();

  };

  if (!isOpen) return null;

  return (

    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">

        <div className="flex items-center justify-between mb-4">

          <h3 className="text-xl font-semibold text-white">

            Why did you stop your session early?

          </h3>

          <button

            onClick={onClose}

            className="text-gray-400 hover:text-white transition-colors"

          >

            <X size={20} />

          </button>

        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>

            <label className="block text-sm font-medium text-gray-300 mb-2">

              Reason

            </label>

            <select

              value={selectedReason}

              onChange={(e) => setSelectedReason(e.target.value as StopReason)}

              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"

            >

              {STOP_REASONS.map((reason) => (

                <option key={reason.value} value={reason.value}>

                  {reason.label}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="block text-sm font-medium text-gray-300 mb-2">

              Additional details (optional)

            </label>

            <textarea

              value={details}

              onChange={(e) => setDetails(e.target.value)}

              placeholder="What happened? How can you avoid this next time?"

              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"

              rows={3}

            />

          </div>

          <div className="flex gap-3">

            <button

              type="button"

              onClick={onClose}

              className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"

            >

              Cancel

            </button>

            <button

              type="submit"

              className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"

            >

              Submit

            </button>

          </div>

        </form>

      </div>

    </div>

  );

};