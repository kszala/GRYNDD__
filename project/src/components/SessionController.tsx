import { useState } from 'react';
import { useTimerStore } from '../store/timestore';
import  SessionCompleteModal  from './SessionCompleteModal';

export const SessionController = () => {
  const { 
    startSession,
    stop, 
    complete,
    currentSessionId,
    totalTime,
    sessionType,
    subject,
    startTime
  } = useTimerStore();
  
  const [showModal, setShowModal] = useState(false);
  const [wasEndedEarly, setWasEndedEarly] = useState(false);

  const handleStartSession = (duration: number, subject: string) => {
    startSession(subject, duration * 60, 'focus');
  };

  const handleStopSession = (endedEarly: boolean) => {
    stop('manual_stop', 'Stopped from session controller', endedEarly);
    setWasEndedEarly(endedEarly);
    setShowModal(true);
  };

  return (
    <>
      {/* Your timer UI components here */}
      
      <SessionCompleteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onComplete={(rating, reflection, tags, takeBreak) => {
          complete(rating, reflection, tags);
          if (takeBreak) {
            // Start break logic
          }
        }}
        sessionData={{
          id: currentSessionId || `session-${Date.now()}`,
          sessionId: currentSessionId || `session-${Date.now()}`,
          subject,
          startTime: startTime ? new Date(startTime) : new Date(),
          duration: totalTime,
          completed: !wasEndedEarly,
          type: sessionType,
          wasEndedEarly
        }}
      />
    </>
  );
};
