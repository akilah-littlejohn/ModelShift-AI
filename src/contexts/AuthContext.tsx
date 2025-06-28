import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextProps {
  user: any;
  session: any;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  session: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const parseJwt = (token: string) => {
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (e) {
      return null;
    }
  };

  const loadSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data.session) {
        console.log('Found active Supabase session');
        setSession(data.session);
        setUser(data.session.user);
      } else {
        console.log('No session found');
        setSession(null);
        setUser(null);
      }
    } catch (error) {
      console.warn('⚠️ Session fetch failed, falling back to token parsing.');

      const stored = localStorage.getItem('supabase.auth.token');
      const tokenObj = stored ? JSON.parse(stored) : null;
      const access_token = tokenObj?.currentSession?.access_token;

      if (access_token) {
        // Regular JWT token
        const decoded = parseJwt(access_token);
        if (decoded?.sub) {
          setUser({ id: decoded.sub });
          setSession({ access_token });
        } else {
          console.log('Invalid token, no user data found');
          setUser(null);
          setSession(null);
        }
      } else {
        console.log('No token found');
        setUser(null);
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    console.log('Attempting login for:', email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    console.log('Login successful, setting session and user');
    setSession(data.session);
    setUser(data.user);
  };

  const logout = async () => {
    console.log('Logging out...');
    await supabase.auth.signOut();
    console.log('Signed out, clearing user and session');
    setUser(null);
    setSession(null);
  };

  useEffect(() => {
    console.log('AuthProvider mounted, loading session');
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, !!session);
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      console.log('Unsubscribing from auth state changes');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};