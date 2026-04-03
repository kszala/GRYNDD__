/**
 * Real-time Analytics Hook
 * Automatically refetches metrics when session events are inserted
 * Minimal implementation: subscribe to session_events table and trigger refresh
 */

import { useEffect } from 'react';
import supabase from '../supabaseClient';

interface UseAnalyticsRealtimeOptions {
  userId: string | null | undefined;
  onDataChange?: () => void;
}

/**
 * Subscribe to session_events table changes for real-time analytics updates
 * Calls the callback whenever new events are inserted for the user
 */
export const useAnalyticsRealtime = ({ userId, onDataChange }: UseAnalyticsRealtimeOptions) => {
  useEffect(() => {
    if (!userId) return;

    // Subscribe to INSERT and UPDATE events on session_events table
    const channel = supabase
      .channel(`session-events-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'session_events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Trigger parent component to refetch metrics
          if (onDataChange) {
            // Debounce: wait 500ms to batch multiple events
            setTimeout(() => {
              onDataChange();
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onDataChange]);
};
