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
        setSession(data.session);
        setUser(data.session.user);
      } else {
        // Check for demo mode token in localStorage
        const stored = localStorage.getItem('supabase.auth.token');
        if (stored) {
          try {
            const tokenObj = JSON.parse(stored);
            const demoSession = tokenObj?.currentSession;
            
            if (demoSession && demoSession.access_token && demoSession.access_token.startsWith('demo-token')) {
              console.log('Demo mode session detected');
              setSession(demoSession);
              setUser(demoSession.user);
            } else {
              setSession(null);
              setUser(null);
            }
          } catch (e) {
            console.error('Error parsing stored token:', e);
            setSession(null);
            setUser(null);
          }
        } else {
          setSession(null);
          setUser(null);
        }
      }
    } catch (error) {
      console.warn('⚠️ Session fetch failed, falling back to token parsing.');

      const stored = localStorage.getItem('supabase.auth.token');
      const tokenObj = stored ? JSON.parse(stored) : null;
      const access_token = tokenObj?.currentSession?.access_token;

      if (access_token) {
        // Check if this is a demo token
        if (access_token.startsWith('demo-token')) {
          console.log('Demo token detected, using demo user');
          setUser(tokenObj.currentSession.user);
          setSession(tokenObj.currentSession);
        } else {
          // Regular JWT token
          const decoded = parseJwt(access_token);
          if (decoded?.sub) {
            setUser({ id: decoded.sub });
            setSession({ access_token });
          }
        }
      } else {
        setUser(null);
        setSession(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
    setUser(data.user);
  };

  const logout = async () => {
    // Clear the demo token if it exists
    const stored = localStorage.getItem('supabase.auth.token');
    if (stored) {
      try {
        const tokenObj = JSON.parse(stored);
        const access_token = tokenObj?.currentSession?.access_token;
        if (access_token && access_token.startsWith('demo-token')) {
          localStorage.removeItem('supabase.auth.token');
        }
      } catch (e) {
        console.error('Error parsing stored token during logout:', e);
      }
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  useEffect(() => {
    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // If we have a session but no user, check for demo mode
      if (!session) {
        const stored = localStorage.getItem('supabase.auth.token');
        if (stored) {
          try {
            const tokenObj = JSON.parse(stored);
            const demoSession = tokenObj?.currentSession;
            
            if (demoSession && demoSession.access_token && demoSession.access_token.startsWith('demo-token')) {
              console.log('Demo mode session detected during auth change');
              setSession(demoSession);
              setUser(demoSession.user);
            }
          } catch (e) {
            console.error('Error parsing stored token during auth change:', e);
          }
        }
      }
    });

    return () => subscription.unsubscribe();
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