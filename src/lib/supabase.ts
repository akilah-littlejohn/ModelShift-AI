import { createClient } from '@supabase/supabase-js';
import type { PromptExecution } from '../types';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate environment variables
if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL environment variable is not set');
}

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY environment variable is not set');
}

// Create Supabase client with error handling
let supabase: any;

try {
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    // Create a mock client for development
    console.warn('Creating mock Supabase client due to missing environment variables');
    supabase = {
      auth: {
        getSession: () => Promise.resolve({ data: { session: null }, error: null }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
        insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) }),
        update: () => ({ eq: () => Promise.resolve({ error: new Error('Supabase not configured') }) })
      }),
      functions: {
        invoke: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') })
      }
    };
  }
} catch (error) {
  console.error('Error creating Supabase client:', error);
  // Create a minimal mock client
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase client error') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase client error') }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase client error') }) }) }),
      update: () => ({ eq: () => Promise.resolve({ error: new Error('Supabase client error') }) })
    }),
    functions: {
      invoke: () => Promise.resolve({ data: null, error: new Error('Supabase client error') })
    }
  };
}

export { supabase };

// Database Operations with error handling
export const db = {
  users: {
    async create(user: { email: string; name: string }) {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{ ...user, plan: 'free', usage_limit: 100, usage_count: 0 }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    },
    
    async getById(id: string) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error getting user by ID:', error);
        throw error;
      }
    },

    async updateUsage(id: string, newUsageCount: number) {
      try {
        const { error } = await supabase
          .from('users')
          .update({ usage_count: newUsageCount })
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error updating user usage:', error);
        throw error;
      }
    }
  },

  apiKeys: {
    async create(apiKey: { user_id: string; provider: string; encrypted_key: string; name: string }) {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .insert([{ ...apiKey, is_active: true }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating API key:', error);
        throw error;
      }
    },

    async getByUserId(userId: string) {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error getting API keys:', error);
        return [];
      }
    },

    async delete(id: string) {
      try {
        const { error } = await supabase
          .from('api_keys')
          .update({ is_active: false })
          .eq('id', id);
        
        if (error) throw error;
      } catch (error) {
        console.error('Error deleting API key:', error);
        throw error;
      }
    }
  },

  prompts: {
    async create(prompt: Omit<PromptExecution, 'id' | 'created_at'>): Promise<PromptExecution> {
      try {
        const { data, error } = await supabase
          .from('prompt_executions')
          .insert([{
            ...prompt,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating prompt execution:', error);
        throw error;
      }
    },

    async getByUserId(userId: string, limit: number = 50): Promise<PromptExecution[]> {
      try {
        const { data, error } = await supabase
          .from('prompt_executions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error getting prompt executions:', error);
        return [];
      }
    },

    async getAnalytics(userId: string, days: number = 30) {
      try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const { data, error } = await supabase
          .from('prompt_executions')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error getting analytics:', error);
        return [];
      }
    }
  },

  analytics: {
    async createEvent(event: {
      id: string;
      user_id: string;
      event_type: string;
      provider_id: string;
      agent_id?: string;
      prompt_length: number;
      response_length: number;
      success: boolean;
      error_type?: string;
      metrics: any;
      metadata?: any;
      timestamp: string;
    }) {
      try {
        const { data, error } = await supabase
          .from('analytics_events')
          .insert([event])
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error creating analytics event:', error);
        throw error;
      }
    },

    async getEvents(userId: string, startDate: string, endDate: string, limit: number = 1000) {
      try {
        const { data, error } = await supabase
          .from('analytics_events')
          .select('*')
          .eq('user_id', userId)
          .gte('timestamp', startDate)
          .lte('timestamp', endDate)
          .order('timestamp', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error getting analytics events:', error);
        return [];
      }
    },

    async getAggregations(userId: string, startDate: string, endDate: string) {
      try {
        const { data, error } = await supabase
          .from('analytics_aggregations')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });
        
        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error('Error getting analytics aggregations:', error);
        return [];
      }
    }
  }
};