import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
}

// Create Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'nirnoy-web@1.0.0',
      },
    },
  }
);

// Helper function to get authenticated client
export const getSupabaseClient = (): SupabaseClient<Database> => {
  return supabase;
};

// Helper for real-time subscriptions
export const subscribeToChannel = (
  channel: string,
  callback: (payload: any) => void,
  filter?: { event?: string; schema?: string; table?: string }
) => {
  const channelInstance = supabase.channel(channel);
  
  if (filter) {
    channelInstance.on(
      'postgres_changes' as any,
      {
        event: filter.event || '*',
        schema: filter.schema || 'public',
        table: filter.table || '*',
      },
      callback
    );
  } else {
    channelInstance.on('*', callback);
  }
  
  return channelInstance.subscribe();
};

export default supabase;

