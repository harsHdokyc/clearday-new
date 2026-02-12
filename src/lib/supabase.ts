import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'dummy', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'clearday-app',
    },
  },
});

// Test connection to Supabase
export const testSupabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    const start = Date.now();
    
    // Simple test - try to get a single row from a known table
    const connectionPromise = supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    // Aggressive timeout - 2 seconds max
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection test timeout')), 2000)
    );
    
    const result = await Promise.race([connectionPromise, timeoutPromise]) as any;
    
    const duration = Date.now() - start;
    console.log(`⏱️ Supabase test took ${duration}ms`);
    
    if (result.error) {
      console.error('❌ Supabase connection test failed:', result.error);
      return { success: false, error: result.error, duration };
    }
    
    console.log('✅ Supabase connection test successful');
    return { success: true, data: result.data, duration };
  } catch (err: any) {
    console.error('💥 Supabase connection test exception:', err);
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
