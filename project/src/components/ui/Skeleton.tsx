/**
 * Skeleton UI Components
 * For loading states that don't block the UI
 */

import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = '100%',
  height = '1rem'
}) => {
  return (
    <div
      className={`bg-gray-700 animate-pulse rounded ${className}`}
      style={{ width, height }}
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
      <Skeleton height="1.5rem" className="mb-2" />
      <Skeleton height="2rem" className="mb-1" />
      <Skeleton height="0.75rem" width="60%" />
    </div>
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 1,
  className = ''
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1rem"
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  );
};