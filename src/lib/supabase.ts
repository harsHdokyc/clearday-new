import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

// Singleton instance to prevent multiple clients
let supabaseInstance: ReturnType<typeof createClient> | null = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }
  
  supabaseInstance = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'dummy', {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
    global: {
      headers: {
        'X-Client-Info': 'clearday-app',
      },
    },
  });
  
  return supabaseInstance;
})();

// Test connection to Supabase
export const testSupabaseConnection = async () => {
  try {
    const start = Date.now();
    
    // Test database endpoint since auth seems to have issues
    const connectionPromise = supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // 10 second timeout for connection test
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection test timeout')), 10000)
    );
    
    const result = await Promise.race([connectionPromise, timeoutPromise]) as any;
    
    const duration = Date.now() - start;
    
    if (result.error) {
      return { success: false, error: result.error, duration };
    }
    
    return { success: true, data: result.data, duration };
  } catch (err: any) {
    return { success: false, error: err, duration: 0 };
  }
};
// Note: This should only be used on the server side or for trusted admin operations
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey || 'dummy',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
