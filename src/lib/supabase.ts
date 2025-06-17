import { createClient } from '@supabase/supabase-js';
import type { PromptExecution } from '../types';

// Get environment variables with fallbacks
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Supabase config:', { 
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'none'
});

// Validate environment variables
if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL environment variable is not set');
}

if (!supabaseAnonKey) {
  console.warn('VITE_SUPABASE_ANON_KEY environment variable is not set');
}

// Create Supabase client with error handling and timeout
let supabase: any;

try {
  if (supabaseUrl && supabaseAnonKey && 
      !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo')) {
    
    console.log('Creating real Supabase client');
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
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
  } else {
    console.warn('Creating mock Supabase client due to missing/demo environment variables');
    
    // Create a comprehensive mock client that won't cause errors
    supabase = {
      auth: {
        getSession: () => {
          console.log('Mock getSession called');
          return Promise.resolve({ 
            data: { session: null }, 
            error: null 
          });
        },
        signInWithPassword: ({ email, password }: { email: string, password: string }) => {
          console.log('Mock signInWithPassword called for:', email);
          return Promise.resolve({ 
            data: { 
              user: {
                id: 'mock-user-id',
                email: email,
                user_metadata: { name: email.split('@')[0] }
              },
              session: {
                access_token: 'mock-token',
                user: {
                  id: 'mock-user-id',
                  email: email,
                  user_metadata: { name: email.split('@')[0] }
                }
              }
            }, 
            error: null 
          });
        },
        signOut: () => {
          console.log('Mock signOut called');
          return Promise.resolve({ error: null });
        },
        onAuthStateChange: (callback: Function) => {
          console.log('Mock onAuthStateChange called');
          // Call callback with initial state
          setTimeout(() => {
            callback('INITIAL_SESSION', null);
          }, 100);
          
          return { 
            data: { 
              subscription: { 
                unsubscribe: () => {
                  console.log('Mock auth subscription unsubscribed');
                } 
              } 
            } 
          };
        },
        getUser: (token: string) => {
          console.log('Mock getUser called');
          return Promise.resolve({
            data: { user: null },
            error: null
          });
        }
      },
      from: (table: string) => {
        console.log('Mock from() called for table:', table);
        return {
          select: (columns?: string) => ({
            eq: (column: string, value: any) => ({
              single: () => {
                console.log(`Mock select ${columns} from ${table} where ${column} = ${value}`);
                return Promise.resolve({ 
                  data: null, 
                  error: { code: 'PGRST116', message: 'Mock: No rows found' } 
                });
              },
              limit: (count: number) => Promise.resolve({ data: [], error: null }),
              order: (column: string, options?: any) => ({
                limit: (count: number) => Promise.resolve({ data: [], error: null })
              })
            }),
            gte: (column: string, value: any) => ({
              lte: (column: string, value: any) => ({
                order: (column: string, options?: any) => ({
                  limit: (count: number) => Promise.resolve({ data: [], error: null })
                })
              })
            }),
            limit: (count: number) => Promise.resolve({ data: [], error: null })
          }),
          insert: (data: any[]) => ({
            select: () => ({
              single: () => {
                console.log(`Mock insert into ${table}:`, data);
                return Promise.resolve({ 
                  data: data[0], 
                  error: null 
                });
              }
            })
          }),
          update: (data: any) => ({
            eq: (column: string, value: any) => {
              console.log(`Mock update ${table} set`, data, `where ${column} = ${value}`);
              return Promise.resolve({ error: null });
            }
          })
        };
      },
      functions: {
        invoke: (functionName: string, options?: any) => {
          console.log(`Mock function invoke: ${functionName}`, options);
          
          if (functionName === 'ai-proxy') {
            // Mock AI proxy response
            return Promise.resolve({ 
              data: {
                success: false,
                error: 'Mock mode: Supabase not configured. Please configure your environment variables.'
              }, 
              error: null 
            });
          }
          
          return Promise.resolve({ 
            data: null, 
            error: { message: 'Mock mode: Functions not available' } 
          });
        }
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

// Database Operations with improved error handling and timeouts
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