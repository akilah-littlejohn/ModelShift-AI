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
    nodeEnv: import.meta.env.MODE
  });

  // Check if we have placeholder values
  const hasPlaceholderUrl = supabaseUrl === 'https://your-project-id.supabase.co' || !supabaseUrl;
  const hasPlaceholderKey = supabaseAnonKey === 'your-anon-key-here' || !supabaseAnonKey;

  // Force demo mode if we have placeholder values OR if explicitly set
  const shouldUseDemoMode = isDemoMode || hasPlaceholderUrl || hasPlaceholderKey;

  // In production, require all variables ONLY if not in demo mode
  if (isProduction && !shouldUseDemoMode) {
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

  // Always use demo mode if explicitly set or if we have placeholder values
  if (isDemoMode) {
    console.warn('⚠️  Using mock Supabase client (demo mode enabled)');
    if (hasPlaceholderUrl || hasPlaceholderKey) {
      console.warn('⚠️  Detected placeholder environment variables - using demo mode');
    }
    return createMockSupabaseClient();
  }

  // If we have valid credentials, try to create real client
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
      console.warn('⚠️  Falling back to mock client due to connection error');
      return createMockSupabaseClient();
    }
  }

  // Fallback to mock client if we don't have valid credentials
  console.warn('⚠️  Using mock Supabase client (missing or invalid credentials)');
  return createMockSupabaseClient();
}

// Mock client for development/demo mode
function createMockSupabaseClient() {
  // Store demo session in memory
  let demoSession = null;
  let demoUser = null;

  const createDemoUser = (email = 'demo@example.com') => {
    return {
      id: 'demo-user-' + Math.random().toString(36).substr(2, 9),
      email: email,
      user_metadata: { name: email.split('@')[0] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  };

  const createDemoSession = (user) => {
    return {
      access_token: 'demo-token-' + Math.random().toString(36).substr(2, 9),
      refresh_token: 'demo-refresh-token',
      expires_in: 3600,
      token_type: 'bearer',
      user: user
    };
  };

  // Initialize demo session
  demoUser = createDemoUser();
  demoSession = createDemoSession(demoUser);

  return {
    auth: {
      getSession: () => {
        console.log('🔄 Mock getSession called');
        return Promise.resolve({ 
          data: { 
            session: demoSession
          }, 
          error: null 
        });
      },
      signInWithPassword: ({ email, password }: { email: string, password: string }) => {
        console.log('🔄 Mock signInWithPassword called for:', email);
        
        demoUser = createDemoUser(email);
        demoSession = createDemoSession(demoUser);
        
        return Promise.resolve({ 
          data: { 
            user: demoUser,
            session: demoSession
          }, 
          error: null 
        });
      },
      signUp: ({ email, password, options }: { email: string, password: string, options?: any }) => {
        console.log('🔄 Mock signUp called for:', email);
        
        demoUser = createDemoUser(email);
        demoUser.user_metadata = options?.data || { name: email.split('@')[0] };
        demoSession = createDemoSession(demoUser);
        
        return Promise.resolve({ 
          data: { 
            user: demoUser,
            session: demoSession
          }, 
          error: null 
        });
      },
      signOut: () => {
        console.log('🔄 Mock signOut called');
        demoSession = null;
        demoUser = null;
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: (callback: Function) => {
        console.log('🔄 Mock onAuthStateChange called');
        
        // Trigger the callback with the current session
        setTimeout(() => {
          if (demoSession) {
            callback('SIGNED_IN', { session: demoSession });
          } else {
            callback('SIGNED_OUT', { session: null });
          }
        }, 100);
        
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
        return Promise.resolve({
          data: { user: demoUser },
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
                    email: demoUser?.email || 'demo@example.com',
                    name: demoUser?.user_metadata?.name || 'Demo User',
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
              // Return the inserted data with generated fields
              const mockData = {
                ...data[0],
                id: 'mock-id-' + Math.random().toString(36).substr(2, 9),
                created_at: new Date().toISOString()
              };
              return Promise.resolve({ 
                data: mockData, 
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