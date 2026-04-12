import React from 'react';

interface GryndLogoProps {
  collapsed?: boolean;
}

export const GryndLogo: React.FC<GryndLogoProps> = ({ collapsed = false }) => {
  if (collapsed) {
    return (
      <span className="inline-flex h-3 w-3 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1] animate-pulse shadow-[0_0_16px_rgba(79,70,229,0.24)]" />
    );
  }

  return (
    <div className="relative inline-flex items-center text-white">
      <span className="text-2xl font-extrabold tracking-tight" style={{ letterSpacing: '-0.05em' }}>
        GRYND
      </span>
      <span className="absolute -top-2 -right-4 h-3 w-3 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#6366F1] animate-pulse shadow-[0_0_24px_rgba(79,70,229,0.8),0_0_48px_rgba(79,70,229,0.4)]" />
    </div>
  );
};
