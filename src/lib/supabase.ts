// Re-export from the auto-generated client for compatibility
// This file exists for backwards compatibility with existing imports
// All new code should import from '@/integrations/supabase/client'

export { supabase } from '@/integrations/supabase/client';

// Re-export types from the auto-generated types
export type { Database } from '@/integrations/supabase/types';

// Helper to get the Supabase URL
export const getSupabaseUrl = () => import.meta.env.VITE_SUPABASE_URL;
