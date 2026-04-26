import React, { useState } from 'react';
import { Coffee, X, Clock, CheckCircle, Play, Timer } from 'lucide-react';

interface SessionData {
  subject: string;
  duration: number;
  type: 'focus' | 'break';
  actualDuration?: number;
}

interface BreakPromptModalProps {
  isOpen: boolean;
  onStartBreak: (duration: number) => void;
  onClose: () => void;
  sessionData?: SessionData;
}

// Better time formatting function
const formatTime = (seconds: number): string => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return '0min';
  }
  
  const totalMinutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (totalMinutes === 0) {
    return `${remainingSeconds}sec`;
  } else if (remainingSeconds === 0) {
    return `${totalMinutes}min`;
  } else {
    return `${totalMinutes}min ${remainingSeconds}sec`;
  }
};

// Get display time - prioritize actualDuration
const getDisplayTime = (sessionData?: SessionData): string => {
  if (!sessionData) {
    return '0min';
  }
  
  const timeToDisplay = sessionData.actualDuration ?? sessionData.duration ?? 0;
  return formatTime(timeToDisplay);
};

export const BreakPromptModal: React.FC<BreakPromptModalProps> = ({
  isOpen,
  onStartBreak,
  onClose,
  sessionData
}) => {
  const [accomplishments, setAccomplishments] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedBreakDuration, setSelectedBreakDuration] = useState(5);

  if (!isOpen) return null;

  const displayTime = getDisplayTime(sessionData);
  const isBreakSession = sessionData?.type === 'break';

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleAccomplishmentsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (e.target.value.length <= 200) {
      setAccomplishments(e.target.value);
    }
  };

  const handleStartBreak = () => {
    onStartBreak(selectedBreakDuration);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-3xl max-w-md w-full mx-4 border border-gray-700 shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Header with colored background */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">
                {isBreakSession ? 'Break Complete!' : 'Great Work! Session Complete'}
              </h3>
              <p className="text-green-100 text-sm flex items-center gap-1">
                <span>{sessionData?.subject || 'Session'}</span>
                <span>â€¢</span>
                <span>{displayTime}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Session accomplishment section */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-3">
              ðŸ“ What did you accomplish? (optional)
            </label>
            <textarea
              value={accomplishments}
              onChange={handleAccomplishmentsChange}
              placeholder="Completed chapter 5, solved 3 problems, reviewed concepts..."
              className="w-full bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={3}
            />
            <div className="text-right text-xs text-gray-500 mt-1">
              {accomplishments.length}/200
            </div>
          </div>

          {/* Tags section */}
          <div className="mb-6">
            <label className="block text-gray-400 text-sm mb-3">
              ðŸ·ï¸ Add tags (optional)
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {['Productive', 'Focused', 'Difficult', 'Easy', 'Breakthrough'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors border ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white border-gray-600 hover:border-purple-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {['Review', 'Practice', 'Theory', 'Problem Solving', 'Research'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors border ${
                    selectedTags.includes(tag)
                      ? 'bg-purple-600 text-white border-purple-500'
                      : 'bg-gray-800 hover:bg-purple-600 text-gray-300 hover:text-white border-gray-600 hover:border-purple-500'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Break section - Only show for focus sessions */}
          {!isBreakSession && (
            <>
              <div className="mb-6">
                <label className="block text-gray-400 text-sm mb-3">
                  â˜• Break duration (if taking a break)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                  {[5, 10, 15, 20].map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => setSelectedBreakDuration(minutes)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors border ${
                        selectedBreakDuration === minutes
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white border-gray-600 hover:border-blue-500'
                      }`}
                    >
                      {minutes}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleStartBreak}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Coffee size={18} />
                  <div className="text-center">
                    <div>Take a Break</div>
                    <div className="text-blue-200 text-sm">Start {selectedBreakDuration} minute break timer</div>
                  </div>
                </button>

                <button
                  onClick={onClose}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Play size={18} />
                  <div className="text-center">
                    <div>Log and Continue</div>
                    <div className="text-green-200 text-sm">Save session and keep working</div>
                  </div>
                </button>

                <button
                  onClick={onClose}
                  className="w-full text-gray-400 hover:text-white py-2 px-4 text-sm transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </>
          )}

          {/* For break sessions, just show continue option */}
          {isBreakSession && (
            <div className="text-center">
              <button
                onClick={onClose}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Play size={18} />
                Continue Studying
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Demo wrapper to show the modal
export default function BreakPromptDemo() {
  const [isModalOpen, setIsModalOpen] = useState(true);
  
  const demoSessionData: SessionData = {
    subject: "Mathematics",
    duration: 1500, // 25 minutes
    type: "focus",
    actualDuration: 1480 // 24 minutes 40 seconds
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <button
        onClick={() => setIsModalOpen(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
      >
        Show Break Prompt Modal
      </button>
      
      <BreakPromptModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStartBreak={(duration) => {
          console.log(`Starting ${duration} minute break`);
          setIsModalOpen(false);
        }}
        sessionData={demoSessionData}
      />
    </div>
  );
}
