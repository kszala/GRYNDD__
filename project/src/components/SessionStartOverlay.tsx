import React, { useEffect, useMemo, useState } from 'react';

interface SessionStartOverlayProps {
  subject: string;
  lastSession: {
    duration: number;
    completed: boolean;
  } | null;
  onComplete: () => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)}m`;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function getBehavioralLine(
  subject: string,
  lastSession: { duration: number; completed: boolean } | null
): string {
  if (!lastSession) {
    return 'The first session sets the standard.';
  }

  if (lastSession.completed) {
    return `Last session completed. ${formatDuration(lastSession.duration)}.`;
  }

  if (lastSession.duration < 600) {
    return `${formatDuration(lastSession.duration)} last time. Stay longer today.`;
  }

  return `Last time you opened ${subject} you left after ${formatDuration(lastSession.duration)}.`;
}

export const SessionStartOverlay: React.FC<SessionStartOverlayProps> = ({
  subject,
  lastSession,
  onComplete
}) => {
  const [showBehavioralLine, setShowBehavioralLine] = useState(false);
  const behavioralLine = useMemo(() => getBehavioralLine(subject, lastSession), [subject, lastSession]);

  useEffect(() => {
    const lineTimer = window.setTimeout(() => {
      setShowBehavioralLine(true);
    }, 1500);

    const completeTimer = window.setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      window.clearTimeout(lineTimer);
      window.clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#0D0B08',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px'
        }}
      >
        <div
          style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: '64px',
            fontWeight: 400,
            color: '#E8E0D0',
            letterSpacing: '-0.02em',
            animation: 'fadeIn 600ms ease forwards'
          }}
        >
          {subject}
        </div>

        <div
          style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: '13px',
            color: '#5C5649',
            letterSpacing: '0.08em',
            opacity: showBehavioralLine ? 1 : 0,
            animation: showBehavioralLine ? 'fadeIn 600ms ease forwards' : undefined
          }}
        >
          {behavioralLine}
        </div>
      </div>
    </>
  );
};
