/**
 * Re-export Supabase client from lib
 * This provides backwards compatibility for imports
 */
export { supabase, getSupabaseClient, subscribeToChannel } from '../../lib/supabase';

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key);
};

export default isSupabaseConfigured;

