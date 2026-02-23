import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface User {
  email: string;
  name: string;
  id: string;
}

export interface Profile {
  skin_goal: string | null;
  skin_type: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  verifyEmail: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // 30-day session management
  const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  const SESSION_KEY = 'clearday-session-start';

  const checkSessionExpiry = () => {
    if (typeof window === 'undefined') return false;
    
    const sessionStart = localStorage.getItem(SESSION_KEY);
    if (!sessionStart) return false;
    
    const sessionAge = Date.now() - parseInt(sessionStart);
    return sessionAge >= SESSION_DURATION;
  };

  const setSessionStart = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SESSION_KEY, Date.now().toString());
    }
  };

  const clearSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SESSION_KEY);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    // Check if user is logged in
    const checkUser = async () => {
      try {
        // Check if Supabase is configured first
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseKey) {
          console.warn("Supabase anon key not configured. Skipping session check.");
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        // Check if session has expired (30 days)
        if (checkSessionExpiry()) {
          console.log("Session expired, logging out...");
          await supabase.auth.signOut();
          clearSession();
          if (mounted) {
            setUser(null);
            setProfile(null);
            setIsLoading(false);
          }
          return;
        }

        // Reduce session timeout and implement better fallback
        const sessionPromise = supabase.auth.getSession();
        const sessionTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session retrieval timeout')), 2000)
        );
        
        try {
          const { data: { session }, error } = await Promise.race([sessionPromise, sessionTimeoutPromise]) as any;
          
          if (!mounted) return;
          
          if (error) {
            if (mounted) {
              setIsLoading(false);
            }
            return;
          }
          
          if (session?.user) {
            // Set session start time if not exists
            if (!localStorage.getItem(SESSION_KEY)) {
              setSessionStart();
            }
            // Set user immediately, fetch profile in background
            setUserFromSession(session.user).catch(err => {
              console.error("Error setting user from session:", err);
            });
          }
        } catch (sessionError: any) {
          // Continue without session - user will need to login
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
      } catch (error: any) {
        console.error("Error checking session:", error);
        // If timeout or other error, still set loading to false
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setIsLoading(false); // Set loading false immediately when auth state changes
      if (session?.user) {
        await setUserFromSession(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setUserFromSession = async (supabaseUser: SupabaseUser) => {
    // Prevent duplicate calls
    if (isInitialized || isProfileLoading) {
      return;
    }
    
    setIsProfileLoading(true);
    
    // Set user immediately with metadata
    const userData: User = {
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      id: supabaseUser.id,
    };

    setUser(userData);

    // Fetch profile with retry logic
    try {
      const fetchWithRetry = async (attempt = 1): Promise<any> => {
        const fetchPromise = supabase
          .from('profiles')
          .select('name, skin_goal, skin_type')
          .eq('id', supabaseUser.id)
          .maybeSingle();
        
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 1500)
        );
        
        try {
          const result = await Promise.race([fetchPromise, timeoutPromise]) as any;
          return result;
        } catch (error: any) {
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 500));
            return fetchWithRetry(attempt + 1);
          }
          throw error;
        }
      };
      
      const result = await fetchWithRetry();
      
      const { data, error } = result;
      
      if (error) {
        return;
      }
      
      if (data) {
        if (data.name) setUser((u) => (u ? { ...u, name: data!.name! } : u));
        setProfile({ skin_goal: data.skin_goal ?? null, skin_type: data.skin_type ?? null });
      }
    } catch (error: any) {
      // Continue without profile - user can still access dashboard
    } finally {
      setIsInitialized(true);
      setIsProfileLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if Supabase is configured
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseKey) {
        return { success: false, error: "Supabase is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file." };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        // Set 30-day session start time
        setSessionStart();
        // Don't await setUserFromSession - let it run in background
        setUserFromSession(data.user).catch(err => {
          console.error("Error setting user from session:", err);
        });
        return { success: true };
      }

      return { success: false, error: "Login failed - no user data returned" };
    } catch (error: any) {
      const errorMessage = error?.message || "An error occurred during login";
      return { success: false, error: errorMessage };
    }
  };

  const signUp = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string; needsVerification?: boolean }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name || email.split('@')[0],
            full_name: name || email.split('@')[0],
          },
          emailRedirectTo: `${window.location.origin}/auth/verify`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: "An account with this email already exists. Please sign in.",
        };
      }

      // Check if email confirmation is required
      // If user is null or email is not confirmed, verification is needed
      if (!data.user || !data.session) {
        return { 
          success: true, 
          needsVerification: true 
        };
      }

      if (data.user) {
        // Try to create profile entry (might fail if table doesn't exist or trigger handles it)
        // This is non-blocking - trigger should handle it, but we try as fallback
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: name || email.split('@')[0],
            } as any)
            .select()
            .single();

          // Ignore duplicate key error (23505) and table not found (PGRST205)
          if (profileError && profileError.code !== '23505' && profileError.code !== 'PGRST205') {
            // Trigger might handle it, or table doesn't exist yet - that's okay
          }
        } catch (error: any) {
          // Profiles table might not exist yet (404) or trigger handles it - that's okay
          if (error?.code !== 'PGRST205') {
            // Silently ignore - trigger should handle profile creation
          }
        }

        // Don't await - let it run in background
        setUserFromSession(data.user).catch(err => {
          console.error("Error setting user from session:", err);
        });
        return { success: true };
      }

      return { success: false, error: "Sign up failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during sign up" };
    }
  };

  const verifyEmail = async (tokenHash: string, type: 'email' | 'signup' = 'signup'): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type === 'signup' ? 'signup' : 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await setUserFromSession(data.user);
        return { success: true };
      }

      return { success: false, error: "Verification failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during verification" };
    }
  };

  const verifyOtp = async (email: string, token: string, type: 'email' | 'signup' = 'signup'): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: type === 'signup' ? 'signup' : 'email',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        await setUserFromSession(data.user);
        return { success: true };
      }

      return { success: false, error: "Verification failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during verification" };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setIsInitialized(false);
      // Clear 30-day session tracker
      clearSession();
    } catch (error) {
      // Handle error silently
    }
  };

  const refreshProfile = async () => {
    const u = user;
    
    if (!u?.id) {
      return;
    }
    
    try {
      const { data, error } = await supabase.from('profiles').select('name, skin_goal, skin_type').eq('id', u.id).maybeSingle() as any;
      
      if (error) {
        return;
      }
      
      if (data) {
        setProfile({ skin_goal: data.skin_goal ?? null, skin_type: data.skin_type ?? null });
        
        if (data.name) {
          setUser(prev => prev ? { ...prev, name: data.name! } : prev);
        }
      }
    } catch (error) {
      // Handle error silently
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAuthenticated: !!user, login, signUp, verifyEmail, verifyOtp, logout, refreshProfile, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
