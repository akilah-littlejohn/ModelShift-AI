import { createClient } from '@supabase/supabase-js';
import type { PromptExecution } from '../types';

// Ensure we have valid environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate the Supabase URL - must be an absolute URL
if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
  throw new Error('Invalid or missing VITE_SUPABASE_URL environment variable. Must be an absolute URL starting with http:// or https://');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Operations
export const db = {
  users: {
    async create(user: { email: string; name: string }) {
      const { data, error } = await supabase
        .from('users')
        .insert([{ ...user, plan: 'free', usage_limit: 100, usage_count: 0 }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    
    async getById(id: string) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async updateUsage(id: string, newUsageCount: number) {
      const { error } = await supabase
        .from('users')
        .update({ usage_count: newUsageCount })
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  apiKeys: {
    async create(apiKey: { user_id: string; provider: string; encrypted_key: string; name: string }) {
      const { data, error } = await supabase
        .from('api_keys')
        .insert([{ ...apiKey, is_active: true }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string) {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data || [];
    },

    async delete(id: string) {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    }
  },

  prompts: {
    async create(prompt: Omit<PromptExecution, 'id' | 'created_at'>): Promise<PromptExecution> {
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
    },

    async getByUserId(userId: string, limit: number = 50): Promise<PromptExecution[]> {
      const { data, error } = await supabase
        .from('prompt_executions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    },

    async getAnalytics(userId: string, days: number = 30) {
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
    }
  }
};