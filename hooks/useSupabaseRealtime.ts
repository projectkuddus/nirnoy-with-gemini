import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook for managing Supabase real-time subscriptions
 */
export function useSupabaseRealtime<T>(
  channel: RealtimeChannel | null,
  callback: (payload: T) => void,
  deps: any[] = []
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!channel) return;

    const subscription = channel.on('postgres_changes', (payload: any) => {
      callbackRef.current(payload.new as T);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [channel, ...deps]);
}

/**
 * Hook for subscribing to table changes
 */
export function useTableSubscription<T>(
  table: string,
  filter?: string,
  callback?: (payload: T) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!callback) return;

    const { supabase } = require('../lib/supabase');
    
    const channel = supabase
      .channel(`table:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        (payload: any) => {
          callback(payload.new as T);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [table, filter, callback]);

  return channelRef.current;
}

