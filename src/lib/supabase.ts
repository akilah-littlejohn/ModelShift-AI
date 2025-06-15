import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

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

    async updateUsage(id: string, increment: number = 1) {
      const { error } = await supabase
        .from('users')
        .update({ usage_count: increment })
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
    async create(prompt: any) {
      const { data, error } = await supabase
        .from('prompt_executions')
        .insert([prompt])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async getByUserId(userId: string, limit: number = 50) {
      const { data, error } = await supabase
        .from('prompt_executions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data || [];
    }
  }
};