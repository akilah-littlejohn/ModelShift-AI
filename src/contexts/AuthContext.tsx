import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const mockUserData = localStorage.getItem('modelshift-ai-user');
    if (mockUserData) {
      try {
        const parsedUser = JSON.parse(mockUserData);
        
        // Validate that the user has a valid UUID
        if (parsedUser && parsedUser.id && isValidUUID(parsedUser.id)) {
          setUser(parsedUser);
        } else {
          // Invalid user data (likely from old session with non-UUID ID)
          console.warn('Invalid user data found in localStorage, clearing...');
          localStorage.removeItem('modelshift-ai-user');
          setUser(null);
        }
      } catch (error) {
        // Corrupted data in localStorage
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem('modelshift-ai-user');
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Demo authentication - always generate a proper UUID
    const mockUser: User = {
      id: uuidv4(), // This ensures we always have a valid UUID
      email,
      name: email.split('@')[0],
      plan: 'pro',
      created_at: new Date().toISOString(),
      usage_limit: 1000,
      usage_count: 0
    };

    localStorage.setItem('modelshift-ai-user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('modelshift-ai-user');
    setUser(null);
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