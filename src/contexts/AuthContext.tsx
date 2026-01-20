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

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string; needsVerification?: boolean }>;
  verifyEmail: (token: string, type?: 'email' | 'signup') => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (email: string, token: string, type?: 'email' | 'signup') => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

        // Add timeout to session check
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );

        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        
        if (error) {
          console.error("Error getting session:", error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }
        
        if (session?.user) {
          // Don't await - let it run in background
          setUserFromSession(session.user).catch(err => {
            console.error("Error setting user from session:", err);
          });
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

    // Set a fallback timeout to ensure loading doesn't hang forever
    const timeoutId = setTimeout(() => {
      if (mounted) {
        console.warn("Session check taking too long, setting loading to false");
        setIsLoading(false);
      }
    }, 3000);

    checkUser().finally(() => {
      clearTimeout(timeoutId);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setIsLoading(false); // Set loading false immediately when auth state changes
      if (session?.user) {
        await setUserFromSession(session.user);
      } else {
        setUser(null);
        setProfile(null);
        localStorage.removeItem("onboarded");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const setUserFromSession = async (supabaseUser: SupabaseUser) => {
    // Set user immediately with metadata, don't wait for profile
    const userData: User = {
      email: supabaseUser.email || '',
      name: supabaseUser.user_metadata?.name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      id: supabaseUser.id,
    };

    setUser(userData);

    // Fetch profile (name, skin_goal, skin_type)
    try {
      const profilePromise = supabase
        .from('profiles')
        .select('name, skin_goal, skin_type')
        .eq('id', supabaseUser.id)
        .maybeSingle();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
      );
      const result = await Promise.race([profilePromise, timeoutPromise]) as { data?: { name?: string; skin_goal?: string | null; skin_type?: string | null } };
      const p = result?.data;
      if (p) {
        if (p.name) setUser((u) => (u ? { ...u, name: p!.name! } : u));
        setProfile({ skin_goal: p.skin_goal ?? null, skin_type: p.skin_type ?? null });
        if (p.skin_goal || p.skin_type) localStorage.setItem('onboarded', 'true');
      }
    } catch {
      // timeouts or missing table: keep user, leave profile null
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Check if Supabase is configured
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseKey) {
        return { success: false, error: "Supabase is not configured. Please add VITE_SUPABASE_ANON_KEY to your .env file." };
      }

      // Add timeout to login request
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login request timeout')), 10000)
      );

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any;

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.user) {
        // Don't await setUserFromSession - let it run in background
        setUserFromSession(data.user).catch(err => {
          console.error("Error setting user from session:", err);
        });
        return { success: true };
      }

      return { success: false, error: "Login failed - no user data returned" };
    } catch (error: any) {
      const errorMessage = error?.message || "An error occurred during login";
      if (errorMessage.includes('timeout')) {
        return { success: false, error: "Login request timed out. Please check your internet connection and try again." };
      }
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
            })
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
      localStorage.removeItem("onboarded");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const refreshProfile = async () => {
    const u = user;
    if (!u?.id) return;
    const { data } = await supabase.from('profiles').select('skin_goal, skin_type').eq('id', u.id).maybeSingle();
    if (data) setProfile({ skin_goal: data.skin_goal ?? null, skin_type: data.skin_type ?? null });
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
