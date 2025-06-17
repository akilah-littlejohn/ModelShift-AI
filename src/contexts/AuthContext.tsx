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

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          await handleUserSession(session.user);
        } else if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (supabaseUser: User) => {
    try {
      console.log('Handling user session for:', supabaseUser.email);
      
      // Check if user exists in our users table
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      let appUser: AppUser;

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

        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }

        appUser = createdUser;
        console.log('Successfully created user:', appUser.email);
      } else if (error) {
        console.error('Error fetching user:', error);
        throw error;
      } else {
        appUser = existingUser;
        console.log('Found existing user:', appUser.email);
      }

      setUser(appUser);
    } catch (error) {
      console.error('Error handling user session:', error);
      // Don't throw error, just log it and continue
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