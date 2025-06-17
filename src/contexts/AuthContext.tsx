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
          isDemo: supabaseUrl?.includes('demo') || supabaseAnonKey?.includes('demo'),
          urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'none'
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

        // Try to get the current session with increased timeout
        console.log('Attempting to get Supabase session...');
        
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout after 8 seconds')), 8000)
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
          console.log('Falling back to mock user due to error:', error.message);
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
        console.warn('Auth initialization timed out after 12 seconds, using mock user');
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
    }, 12000); // 12 second timeout

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
      
      // Try to get user from database with increased timeout
      const userPromise = supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout after 8 seconds')), 8000)
      );

      let appUser: AppUser;

      try {
        console.log('Querying database for user:', supabaseUser.id);
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
            const createPromise = supabase
              .from('users')
              .insert([newUserData])
              .select()
              .single();
              
            const createTimeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('User creation timeout after 8 seconds')), 8000)
            );

            const { data: createdUser, error: createError } = await Promise.race([
              createPromise,
              createTimeoutPromise
            ]) as any;

            if (createError) {
              throw createError;
            } else {
              appUser = createdUser;
              console.log('Successfully created user:', appUser.email);
            }
          } catch (createError) {
            console.error('Error creating user:', createError);
            // Create fallback user object
            appUser = {
              ...newUserData,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            console.log('Using fallback user object for creation error');
          }
        } else if (error) {
          console.error('Database query error:', error);
          throw error;
        } else {
          appUser = existingUser;
          console.log('Found existing user:', appUser.email);
        }
      } catch (dbError) {
        console.error('Database error, creating fallback user:', dbError.message || dbError);
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
        console.log('Using fallback user object due to database error');
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
      console.log('Using final fallback user due to session handling error');
      setUser(fallbackUser);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      console.log('Attempting login for:', email);
      
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Login timeout after 10 seconds')), 10000)
      );

      const { data, error } = await Promise.race([
        loginPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        console.error('Login error:', error);
        throw error;
      }

      console.log('Login successful for:', email);
      // User session will be handled by the auth state change listener
    } catch (error) {
      console.error('Login failed:', error.message || error);
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Logging out user');
      
      const logoutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Logout timeout after 5 seconds')), 5000)
      );

      await Promise.race([logoutPromise, timeoutPromise]);
      setUser(null);
      console.log('Logout successful');
    } catch (error) {
      console.error('Error logging out:', error);
      // Force logout locally even if Supabase call fails
      setUser(null);
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