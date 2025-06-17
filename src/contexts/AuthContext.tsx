import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { User as AppUser } from '../types';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check if Supabase is properly configured
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        console.log('Initializing auth with:', { 
          hasUrl: !!supabaseUrl, 
          hasKey: !!supabaseAnonKey,
          isDemo: supabaseUrl?.includes('demo') || supabaseAnonKey?.includes('demo')
        });
        
        if (!supabaseUrl || !supabaseAnonKey || 
            supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo')) {
          console.log('Supabase not configured properly, using mock authentication');
          
          // Create a mock user for demo purposes
          const mockUser: AppUser = {
            id: 'demo-user-123',
            email: 'demo@modelshift.ai',
            name: 'Demo User',
            plan: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_limit: 100,
            usage_count: 0
          };
          
          if (mounted) {
            console.log('Setting mock user');
            setUser(mockUser);
            setIsLoading(false);
          }
          return;
        }

        // Try to get the current session with timeout
        console.log('Attempting to get Supabase session...');
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );
        
        const { data: { session }, error } = await Promise.race([
          sessionPromise,
          timeoutPromise
        ]) as any;
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        console.log('Session result:', { hasSession: !!session, userEmail: session?.user?.email });

        if (session?.user && mounted) {
          await handleUserSession(session.user);
        } else if (mounted) {
          console.log('No session found, user not logged in');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        
        // Fallback to mock user on any error
        if (mounted) {
          console.log('Falling back to mock user due to error');
          const mockUser: AppUser = {
            id: 'demo-user-123',
            email: 'demo@modelshift.ai',
            name: 'Demo User',
            plan: 'free',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_limit: 100,
            usage_count: 0
          };
          setUser(mockUser);
          setIsLoading(false);
        }
      }
    };

    // Add a maximum timeout for the entire initialization
    const initTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn('Auth initialization timed out, using mock user');
        const mockUser: AppUser = {
          id: 'demo-user-123',
          email: 'demo@modelshift.ai',
          name: 'Demo User',
          plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_limit: 100,
          usage_count: 0
        };
        setUser(mockUser);
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    initializeAuth().finally(() => {
      clearTimeout(initTimeout);
    });

    // Listen for auth changes only if Supabase is configured
    let subscription: any = null;
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseAnonKey && 
          !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
        
        const {
          data: { subscription: authSubscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          console.log('Auth state change:', event, session?.user?.email);
          
          if (session?.user) {
            await handleUserSession(session.user);
          } else {
            setUser(null);
            setIsLoading(false);
          }
        });
        
        subscription = authSubscription;
      }
    } catch (error) {
      console.error('Error setting up auth listener:', error);
    }

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleUserSession = async (supabaseUser: User) => {
    try {
      console.log('Handling user session for:', supabaseUser.email);
      
      // Try to get user from database with timeout
      const userPromise = supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      );

      let appUser: AppUser;

      try {
        const { data: existingUser, error } = await Promise.race([
          userPromise,
          timeoutPromise
        ]) as any;

        if (error && error.code === 'PGRST116') {
          // User doesn't exist, create new user record
          console.log('Creating new user record for:', supabaseUser.email);
          
          const newUserData = {
            id: supabaseUser.id,
            email: supabaseUser.email || '',
            name: supabaseUser.user_metadata?.name || 
                  supabaseUser.user_metadata?.full_name || 
                  supabaseUser.email?.split('@')[0] || 'User',
            plan: 'free' as const,
            usage_limit: 100,
            usage_count: 0
          };

          try {
            const { data: createdUser, error: createError } = await supabase
              .from('users')
              .insert([newUserData])
              .select()
              .single();

            if (createError) {
              throw createError;
            } else {
              appUser = createdUser;
            }
          } catch (createError) {
            console.error('Error creating user:', createError);
            // Create fallback user object
            appUser = {
              ...newUserData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          }
        } else if (error) {
          throw error;
        } else {
          appUser = existingUser;
          console.log('Found existing user:', appUser.email);
        }
      } catch (dbError) {
        console.error('Database error, creating fallback user:', dbError);
        // Create a fallback user object
        appUser = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.name || 
                supabaseUser.user_metadata?.full_name || 
                supabaseUser.email?.split('@')[0] || 'User',
          plan: 'free' as const,
          usage_limit: 100,
          usage_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      console.log('Setting app user:', appUser.email);
      setUser(appUser);
    } catch (error) {
      console.error('Error handling user session:', error);
      // Create a fallback user object to prevent infinite loading
      const fallbackUser: AppUser = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.name || 
              supabaseUser.user_metadata?.full_name || 
              supabaseUser.email?.split('@')[0] || 'User',
        plan: 'free' as const,
        usage_limit: 100,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setUser(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful for:', email);
      // User session will be handled by the auth state change listener
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}