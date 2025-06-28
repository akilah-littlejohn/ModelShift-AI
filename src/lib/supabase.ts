import { createClient } from '@supabase/supabase-js';
import type { PromptExecution } from '../types';

// UUID validation utility
export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Environment variable validation with clear error messages
function validateEnvironmentVariables() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isProduction = import.meta.env.PROD;

  console.log('🔍 Environment Validation:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    isProduction,
    nodeEnv: import.meta.env.MODE
  });

  // Check if we have placeholder values
  const hasPlaceholderUrl = supabaseUrl === 'https://your-project-id.supabase.co' || !supabaseUrl;
  const hasPlaceholderKey = supabaseAnonKey === 'your-anon-key-here' || !supabaseAnonKey;

  // In production, require all variables
  if (isProduction) {
    const missing = [];
    if (hasPlaceholderUrl) missing.push('VITE_SUPABASE_URL');
    if (hasPlaceholderKey) missing.push('VITE_SUPABASE_ANON_KEY');

    if (missing.length > 0) {
      const errorMessage = `
❌ Missing Required Environment Variables:

${missing.map(key => `  ❌ ${key}`).join('\n')}

Required for production:
  ✅ VITE_SUPABASE_URL - Your Supabase project URL
  ✅ VITE_SUPABASE_ANON_KEY - Your Supabase anon/public key

Please add these to your .env file or deployment environment.
      `.trim();
      
      console.error(errorMessage);
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
  }

  return { 
    supabaseUrl, 
    supabaseAnonKey, 
    isProduction,
    hasPlaceholderUrl,
    hasPlaceholderKey
  };
}

// Create Supabase client
function createSupabaseClient() {
  const { 
    supabaseUrl, 
    supabaseAnonKey, 
    isProduction, 
    hasPlaceholderUrl, 
    hasPlaceholderKey 
  } = validateEnvironmentVariables();

  // If we have valid credentials, create real client
  if (supabaseUrl && supabaseAnonKey && !hasPlaceholderUrl && !hasPlaceholderKey) {
    console.log('✅ Creating real Supabase client with URL:', supabaseUrl);
    
    try {
      return createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        global: {
          headers: {
            'X-Client-Info': 'modelshift-ai@1.0.0',
          },
        },
        db: {
          schema: 'public',
        },
        realtime: {
          params: {
            eventsPerSecond: 2,
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to create Supabase client:', error);
      throw new Error(`Failed to initialize Supabase client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    console.warn('⚠️ Missing or invalid Supabase credentials');
    throw new Error('Supabase credentials are missing or invalid. Please check your environment variables.');
  }
}

// Create the main client
export const supabase = createSupabaseClient();

// Database Operations with improved error handling
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
        console.error('❌ Error creating user:', error);
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
        console.error('❌ Error getting user by ID:', error);
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
        console.error('❌ Error updating user usage:', error);
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
        console.error('❌ Error creating prompt execution:', error);
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
        console.error('❌ Error getting prompt executions:', error);
        throw error;
      }
    },
    
    async deleteById(userId: string, executionId: string): Promise<void> {
      try {
        const { error } = await supabase
          .from('prompt_executions')
          .delete()
          .eq('id', executionId)
          .eq('user_id', userId);
        
        if (error) throw error;
      } catch (error) {
        console.error('❌ Error deleting prompt execution:', error);
        throw error;
      }
    }
  }
};