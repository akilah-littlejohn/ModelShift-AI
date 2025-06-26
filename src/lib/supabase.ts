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
  const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';
  const isProduction = import.meta.env.PROD;

  console.log('🔍 Environment Validation:', {
    hasUrl: !!supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    isDemoMode,
    isProduction,
    nodeEnv: import.meta.env.MODE,
    urlValue: supabaseUrl,
    keyValue: supabaseAnonKey ? '[REDACTED]' : 'missing'
  });

  // Check if we have placeholder values
  const hasPlaceholderUrl = supabaseUrl === 'https://your-project-id.supabase.co' || !supabaseUrl;
  const hasPlaceholderKey = supabaseAnonKey === 'your-anon-key-here' || !supabaseAnonKey;

  // In production, require all variables
  if (isProduction && !isDemoMode) {
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

  // Force demo mode if we have placeholder values
  const shouldUseDemoMode = isDemoMode || hasPlaceholderUrl || hasPlaceholderKey;

  return { 
    supabaseUrl, 
    supabaseAnonKey, 
    isDemoMode: shouldUseDemoMode, 
    isProduction,
    hasPlaceholderUrl,
    hasPlaceholderKey
  };
}

// Create environment-aware Supabase client
function createSupabaseClient() {
  const { 
    supabaseUrl, 
    supabaseAnonKey, 
    isDemoMode, 
    isProduction, 
    hasPlaceholderUrl, 
    hasPlaceholderKey 
  } = validateEnvironmentVariables();

  // Demo mode or missing configuration in development
  if (isDemoMode || hasPlaceholderUrl || hasPlaceholderKey) {
    if (!isProduction) {
      console.warn('⚠️  Using mock Supabase client (development/demo mode)');
      if (hasPlaceholderUrl || hasPlaceholderKey) {
        console.warn('⚠️  Detected placeholder environment variables - using demo mode');
      }
      return createMockSupabaseClient();
    } else {
      throw new Error('Supabase configuration required in production mode');
    }
  }

  console.log('✅ Creating real Supabase client');
  
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
    throw new Error(`Supabase client creation failed: ${error.message}`);
  }
}

// Mock client for development/demo mode
function createMockSupabaseClient() {
  return {
    auth: {
      getSession: () => {
        console.log('🔄 Mock getSession called');
        // Return a mock session for demo mode
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: 'demo@example.com',
          user_metadata: { name: 'Demo User' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const mockSession = {
          access_token: 'mock-token-' + Date.now(),
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser
        };
        
        return Promise.resolve({ 
          data: { 
            session: mockSession
          }, 
          error: null 
        });
      },
      signInWithPassword: ({ email, password }: { email: string, password: string }) => {
        console.log('🔄 Mock signInWithPassword called for:', email);
        
        // Simulate a successful login
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: email,
          user_metadata: { name: email.split('@')[0] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const mockSession = {
          access_token: 'mock-token-' + Date.now(),
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser
        };
        
        return Promise.resolve({ 
          data: { 
            user: mockUser,
            session: mockSession
          }, 
          error: null 
        });
      },
      signUp: ({ email, password, options }: { email: string, password: string, options?: any }) => {
        console.log('🔄 Mock signUp called for:', email);
        
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: email,
          user_metadata: options?.data || { name: email.split('@')[0] },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const mockSession = {
          access_token: 'mock-token-' + Date.now(),
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser
        };
        
        return Promise.resolve({ 
          data: { 
            user: mockUser,
            session: mockSession
          }, 
          error: null 
        });
      },
      signOut: () => {
        console.log('🔄 Mock signOut called');
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: (callback: Function) => {
        console.log('🔄 Mock onAuthStateChange called');
        
        // Create a mock session for demo mode
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: 'demo@example.com',
          user_metadata: { name: 'Demo User' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const mockSession = {
          access_token: 'mock-token-' + Date.now(),
          refresh_token: 'mock-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: mockUser
        };
        
        // Trigger the callback with the mock session
        setTimeout(() => callback('SIGNED_IN', { session: mockSession }), 100);
        
        return { 
          data: { 
            subscription: { 
              unsubscribe: () => console.log('🔄 Mock auth subscription unsubscribed') 
            } 
          } 
        };
      },
      getUser: () => {
        console.log('🔄 Mock getUser called');
        
        // Return a mock user for demo mode
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          email: 'demo@example.com',
          user_metadata: { name: 'Demo User' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return Promise.resolve({
          data: { user: mockUser },
          error: null
        });
      }
    },
    from: (table: string) => {
      console.log('🔄 Mock from() called for table:', table);
      return {
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: () => {
              console.log(`🔄 Mock select ${columns} from ${table} where ${column} = ${value}`);
              
              // For users table, return a mock user
              if (table === 'users') {
                return Promise.resolve({ 
                  data: {
                    id: value,
                    email: 'demo@example.com',
                    name: 'Demo User',
                    plan: 'free',
                    usage_limit: 100,
                    usage_count: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, 
                  error: null
                });
              }
              
              return Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116', message: 'Mock: No rows found' } 
              });
            },
            limit: (count: number) => {
              // For prompt_executions table, return mock data
              if (table === 'prompt_executions') {
                return Promise.resolve({ 
                  data: [], 
                  error: null 
                });
              }
              
              return Promise.resolve({ data: [], error: null });
            },
            order: (column: string, options?: any) => ({
              limit: (count: number) => {
                // For prompt_executions table, return mock data
                if (table === 'prompt_executions') {
                  return Promise.resolve({ 
                    data: [], 
                    error: null 
                  });
                }
                
                return Promise.resolve({ data: [], error: null });
              }
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
              console.log(`🔄 Mock insert into ${table}:`, data);
              return Promise.resolve({ 
                data: data[0], 
                error: null 
              });
            }
          })
        }),
        update: (data: any) => ({
          eq: (column: string, value: any) => {
            console.log(`🔄 Mock update ${table} set`, data, `where ${column} = ${value}`);
            return Promise.resolve({ error: null });
          }
        })
      };
    },
    functions: {
      invoke: (functionName: string, options?: any) => {
        console.log(`🔄 Mock function invoke: ${functionName}`, options);
        
        if (functionName === 'ai-proxy') {
          // For health check, return a successful response
          if (options?.body?.providerId === 'health-check') {
            return Promise.resolve({ 
              data: {
                success: true,
                configuredProviders: ['openai', 'gemini', 'claude', 'ibm'],
                errors: [],
                requestId: 'mock-request-id',
                serverInfo: {
                  timestamp: new Date().toISOString(),
                  environment: 'development',
                  version: '1.0.1'
                }
              }, 
              error: null 
            });
          }
          
          // For actual provider calls, return a mock response
          return Promise.resolve({ 
            data: {
              success: true,
              response: `This is a mock response from ${options?.body?.providerId} in demo mode. In production, this would be a real response from the AI provider.`,
              provider: options?.body?.providerId,
              model: options?.body?.model || 'default',
              requestId: 'mock-request-id',
              using_user_key: false,
              metrics: {
                responseTime: 500,
                tokens: 100,
                cost: 0.002,
                timestamp: new Date().toISOString()
              }
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
        return [];
      }
    }
  }
};