import { supabase } from './supabase';

/**
 * Test Supabase connection and configuration
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  details: {
    url: boolean;
    anonKey: boolean;
    connection: boolean;
    auth: boolean;
    database: boolean;
  };
  message: string;
}> {
  console.log('🔍 Testing Supabase connection...');
  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  const details = {
    url: !!supabaseUrl && !supabaseUrl.includes('demo'),
    anonKey: !!supabaseAnonKey && !supabaseAnonKey.includes('demo'),
    connection: false,
    auth: false,
    database: false
  };
  
  if (!details.url || !details.anonKey) {
    return {
      success: false,
      details,
      message: 'Supabase URL or Anon Key not configured properly'
    };
  }
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('users').select('count').limit(1);
    details.connection = !error;
    
    if (error) {
      console.error('❌ Database connection test failed:', error);
      return {
        success: false,
        details,
        message: `Database connection failed: ${error.message}`
      };
    }
    
    details.database = true;
    console.log('✅ Database connection successful');
    
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getSession();
    details.auth = !authError;
    
    if (authError) {
      console.error('❌ Auth test failed:', authError);
      return {
        success: false,
        details,
        message: `Auth system failed: ${authError.message}`
      };
    }
    
    console.log('✅ Auth system working properly');
    
    return {
      success: true,
      details,
      message: 'Supabase connection successful'
    };
  } catch (error) {
    console.error('❌ Supabase test failed with exception:', error);
    return {
      success: false,
      details,
      message: `Supabase test failed: ${error.message}`
    };
  }
}

/**
 * Test RLS policies
 */
export async function testRLSPolicies(): Promise<{
  success: boolean;
  details: {
    authenticated: boolean;
    userTable: boolean;
    promptExecutionsTable: boolean;
    analyticsEventsTable: boolean;
  };
  message: string;
}> {
  console.log('🔍 Testing RLS policies...');
  
  const details = {
    authenticated: false,
    userTable: false,
    promptExecutionsTable: false,
    analyticsEventsTable: false
  };
  
  try {
    // Check if authenticated
    const { data: session, error: sessionError } = await supabase.auth.getSession();
    details.authenticated = !!session?.session;
    
    if (sessionError || !session?.session) {
      console.warn('⚠️ Not authenticated, cannot fully test RLS policies');
      return {
        success: false,
        details,
        message: 'Not authenticated, cannot test RLS policies'
      };
    }
    
    // Test users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.session.user.id)
      .single();
    
    details.userTable = !userError && !!userData;
    
    if (userError) {
      console.error('❌ Users table RLS test failed:', userError);
    } else {
      console.log('✅ Users table RLS working properly');
    }
    
    // Test prompt_executions table
    const { data: promptData, error: promptError } = await supabase
      .from('prompt_executions')
      .select('count')
      .eq('user_id', session.session.user.id)
      .limit(1);
    
    details.promptExecutionsTable = !promptError;
    
    if (promptError) {
      console.error('❌ Prompt executions table RLS test failed:', promptError);
    } else {
      console.log('✅ Prompt executions table RLS working properly');
    }
    
    // Test analytics_events table
    const { data: analyticsData, error: analyticsError } = await supabase
      .from('analytics_events')
      .select('count')
      .eq('user_id', session.session.user.id)
      .limit(1);
    
    details.analyticsEventsTable = !analyticsError;
    
    if (analyticsError) {
      console.error('❌ Analytics events table RLS test failed:', analyticsError);
    } else {
      console.log('✅ Analytics events table RLS working properly');
    }
    
    const success = details.userTable && details.promptExecutionsTable && details.analyticsEventsTable;
    
    return {
      success,
      details,
      message: success 
        ? 'All RLS policies working properly' 
        : 'Some RLS policies failed, check details'
    };
  } catch (error) {
    console.error('❌ RLS test failed with exception:', error);
    return {
      success: false,
      details,
      message: `RLS test failed: ${error.message}`
    };
  }
}

/**
 * Test Edge Functions
 */
export async function testEdgeFunctions(): Promise<{
  success: boolean;
  details: {
    aiProxy: boolean;
    analyticsFunction: boolean;
    dynamicAiProxy: boolean;
  };
  message: string;
}> {
  console.log('🔍 Testing Edge Functions...');
  
  const details = {
    aiProxy: false,
    analyticsFunction: false,
    dynamicAiProxy: false
  };
  
  try {
    // Test ai-proxy function
    const { data: aiProxyData, error: aiProxyError } = await supabase.functions.invoke('ai-proxy', {
      body: { providerId: 'health-check', prompt: 'test' }
    });
    
    details.aiProxy = !aiProxyError && aiProxyData?.success;
    
    if (aiProxyError || !aiProxyData?.success) {
      console.error('❌ ai-proxy function test failed:', aiProxyError || 'Function returned unsuccessful response');
    } else {
      console.log('✅ ai-proxy function working properly');
    }
    
    // Test analytics-dashboard function (if it exists)
    try {
      const { data: analyticsData, error: analyticsError } = await supabase.functions.invoke('analytics-dashboard', {
        body: { 
          userId: 'test', 
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      });
      
      details.analyticsFunction = !analyticsError;
      
      if (analyticsError) {
        console.warn('⚠️ analytics-dashboard function test failed:', analyticsError);
      } else {
        console.log('✅ analytics-dashboard function working properly');
      }
    } catch (error) {
      console.warn('⚠️ analytics-dashboard function may not exist:', error);
    }
    
    // Test dynamic-ai-proxy function (if it exists)
    try {
      const { data: dynamicData, error: dynamicError } = await supabase.functions.invoke('dynamic-ai-proxy', {
        body: { 
          providerConfig: { id: 'test' },
          prompt: 'test'
        }
      });
      
      details.dynamicAiProxy = !dynamicError;
      
      if (dynamicError) {
        console.warn('⚠️ dynamic-ai-proxy function test failed:', dynamicError);
      } else {
        console.log('✅ dynamic-ai-proxy function working properly');
      }
    } catch (error) {
      console.warn('⚠️ dynamic-ai-proxy function may not exist:', error);
    }
    
    const success = details.aiProxy; // Only require ai-proxy to be working
    
    return {
      success,
      details,
      message: success 
        ? 'Edge Functions working properly' 
        : 'Some Edge Functions failed, check details'
    };
  } catch (error) {
    console.error('❌ Edge Functions test failed with exception:', error);
    return {
      success: false,
      details,
      message: `Edge Functions test failed: ${error.message}`
    };
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<{
  success: boolean;
  connection: {
    success: boolean;
    message: string;
  };
  rls: {
    success: boolean;
    message: string;
  };
  functions: {
    success: boolean;
    message: string;
  };
}> {
  console.log('🔍 Running all Supabase tests...');
  
  const connection = await testSupabaseConnection();
  const rls = await testRLSPolicies();
  const functions = await testEdgeFunctions();
  
  const success = connection.success && rls.success && functions.success;
  
  console.log(`${success ? '✅' : '❌'} All tests ${success ? 'passed' : 'failed'}`);
  
  return {
    success,
    connection: {
      success: connection.success,
      message: connection.message
    },
    rls: {
      success: rls.success,
      message: rls.message
    },
    functions: {
      success: functions.success,
      message: functions.message
    }
  };
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).supabaseTests = {
    testConnection: testSupabaseConnection,
    testRLS: testRLSPolicies,
    testFunctions: testEdgeFunctions,
    runAll: runAllTests
  };
}