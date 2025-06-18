import React, { useState, useEffect } from 'react';
import { Play, Zap, Clock, DollarSign, AlertTriangle, Info, Key, Users, Swords, Settings, CheckCircle, XCircle } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ResponseComparison } from './ResponseComparison';
import { providers } from '../../data/providers';
import { AgentService } from '../../lib/agents';
import { ModelShiftAIClientFactory } from '../../lib/modelshift-ai-sdk';
import { ProxyService } from '../../lib/api/ProxyService';
import { keyVault } from '../../lib/encryption';
import { db } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';
import { analyticsService } from '../../lib/analytics/AnalyticsService';
import { useAuth } from '../../contexts/AuthContext';
import type { ComparisonResult, PromptExecution, ProviderResponse, DebateSideConfig } from '../../types';
import toast from 'react-hot-toast';

export function PlaygroundView() {
  const { user } = useAuth();
  const [isDebateMode, setIsDebateMode] = useState(false);
  
  // Standard mode state
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai', 'claude']);
  const [selectedAgent, setSelectedAgent] = useState('');
  
  // Debate mode state
  const [debateSideAConfig, setDebateSideAConfig] = useState<DebateSideConfig>({
    selectedProviders: ['openai'],
    selectedAgent: '',
    label: 'Side A'
  });
  const [debateSideBConfig, setDebateSideBConfig] = useState<DebateSideConfig>({
    selectedProviders: ['claude'],
    selectedAgent: '',
    label: 'Side B'
  });
  
  const [input, setInput] = useState('');
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [proxyHealth, setProxyHealth] = useState<{
    available: boolean;
    authenticated: boolean;
    configuredProviders: string[];
    errors: string[];
  } | null>(null);
  const [userApiKeys, setUserApiKeys] = useState<{
    hasKeys: boolean;
    providers: Record<string, boolean>;
  } | null>(null);

  // Check proxy health and user API keys on component mount
  useEffect(() => {
    checkProxyHealth();
    if (user && user.id !== 'demo-user-123') {
      checkUserApiKeys();
    }
  }, [user]);

  const checkProxyHealth = async () => {
    try {
      const health = await ProxyService.checkProxyHealth();
      setProxyHealth(health);
    } catch (error) {
      console.error('Failed to check proxy health:', error);
      setProxyHealth({
        available: false,
        authenticated: false,
        configuredProviders: [],
        errors: ['Failed to check proxy health']
      });
    }
  };

  const checkUserApiKeys = async () => {
    if (!user || user.id === 'demo-user-123') return;
    
    try {
      const keys = await ProxyService.checkUserApiKeys(user.id);
      setUserApiKeys(keys);
    } catch (error) {
      console.error('Failed to check user API keys:', error);
      setUserApiKeys({
        hasKeys: false,
        providers: { openai: false, gemini: false, claude: false, ibm: false }
      });
    }
  };

  // Check if we have a real Supabase session for database operations
  const hasRealSupabaseSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session && session.user && !session.user.email?.includes('demo') && session.user.id !== 'demo-user-123';
    } catch {
      return false;
    }
  };

  // Check if we're using proxy mode or direct mode
  const isUsingProxy = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return supabaseUrl && supabaseAnonKey && 
           !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');
  };

  // Check if we're in demo environment
  const isDemoEnvironment = () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    return !supabaseUrl || !supabaseAnonKey || 
           supabaseUrl.includes('demo') || supabaseAnonKey.includes('demo') ||
           (user && user.id === 'demo-user-123');
  };

  const handleExecute = async () => {
    if (!input.trim()) {
      toast.error('Please enter some input text');
      return;
    }

    if (!user) {
      toast.error('Please log in to use the playground');
      return;
    }

    let providersToCheck: string[] = [];
    
    if (isDebateMode) {
      providersToCheck = [...debateSideAConfig.selectedProviders, ...debateSideBConfig.selectedProviders];
      if (providersToCheck.length === 0) {
        toast.error('Please select at least one provider for each debate side');
        return;
      }
    } else {
      providersToCheck = selectedProviders;
      if (providersToCheck.length === 0) {
        toast.error('Please select at least one provider');
        return;
      }
    }

    // Check if API keys are configured for selected providers (only for direct mode)
    const usingProxy = isUsingProxy();
    const hasUserKeys = userApiKeys?.hasKeys || false;

    if (!usingProxy && !hasUserKeys) {
      const missingKeys = providersToCheck.filter(providerId => {
        const keyData = keyVault.retrieveDefault(providerId);
        return !keyData || Object.keys(keyData).length === 0;
      });

      if (missingKeys.length > 0) {
        const providerNames = missingKeys.map(id => {
          const provider = providers.find(p => p.id === id);
          return provider?.displayName || id;
        }).join(', ');
        
        toast.error(
          `Missing API keys for: ${providerNames}. Please add them in the Settings → API Keys section.`,
          { duration: 5000 }
        );
        return;
      }
    }

    setIsExecuting(true);
    const startTime = Date.now();

    // Initialize results based on mode
    let initialResults: ComparisonResult[] = [];
    
    if (isDebateMode) {
      // Create results for each side
      debateSideAConfig.selectedProviders.forEach(providerId => {
        initialResults.push({
          provider: providerId,
          response: '',
          loading: true,
          metrics: { latency: 0, tokens: 0, cost: 0 },
          sideId: 'A',
          sideLabel: debateSideAConfig.label
        });
      });
      
      debateSideBConfig.selectedProviders.forEach(providerId => {
        initialResults.push({
          provider: providerId,
          response: '',
          loading: true,
          metrics: { latency: 0, tokens: 0, cost: 0 },
          sideId: 'B',
          sideLabel: debateSideBConfig.label
        });
      });
    } else {
      // Standard mode
      initialResults = selectedProviders.map(providerId => ({
        provider: providerId,
        response: '',
        loading: true,
        metrics: { latency: 0, tokens: 0, cost: 0 }
      }));
    }
    
    setResults(initialResults);

    // Prepare data for analytics storage
    const providerResponses: ProviderResponse[] = [];
    let totalTokens = 0;

    // Execute requests based on mode
    if (isDebateMode) {
      // Execute debate mode
      const debatePromises: Promise<void>[] = [];
      
      // Side A executions
      debateSideAConfig.selectedProviders.forEach((providerId, providerIndex) => {
        const resultIndex = providerIndex;
        debatePromises.push(executeProviderRequest(
          providerId, 
          debateSideAConfig.selectedAgent, 
          input, 
          resultIndex, 
          'A',
          debateSideAConfig.label,
          providerResponses
        ));
      });
      
      // Side B executions
      debateSideBConfig.selectedProviders.forEach((providerId, providerIndex) => {
        const resultIndex = debateSideAConfig.selectedProviders.length + providerIndex;
        debatePromises.push(executeProviderRequest(
          providerId, 
          debateSideBConfig.selectedAgent, 
          input, 
          resultIndex, 
          'B',
          debateSideBConfig.label,
          providerResponses
        ));
      });
      
      await Promise.all(debatePromises);
    } else {
      // Standard mode execution
      const promises = selectedProviders.map((providerId, index) => 
        executeProviderRequest(providerId, selectedAgent, input, index, undefined, undefined, providerResponses)
      );
      await Promise.all(promises);
    }

    const totalTime = Date.now() - startTime;
    setIsExecuting(false);

    // Calculate total tokens
    totalTokens = providerResponses.reduce((sum, r) => sum + r.tokens, 0);

    // Track overall execution analytics
    await analyticsService.trackEvent({
      userId: user.id,
      eventType: 'prompt_execution',
      providerId: providersToCheck[0], // Primary provider for grouping
      agentId: isDebateMode ? 'debate_mode' : selectedAgent || undefined,
      promptLength: input.length,
      responseLength: providerResponses.reduce((sum, r) => sum + r.response.length, 0),
      success: providerResponses.some(r => r.success),
      metrics: {
        latency: totalTime,
        tokens: totalTokens,
        cost: providerResponses.reduce((sum, r) => {
          const provider = providers.find(p => p.id === r.provider);
          return sum + (provider ? (r.tokens * provider.capabilities.pricing.output) / 1000 : 0);
        }, 0)
      },
      metadata: {
        mode: isDebateMode ? 'debate' : 'standard',
        providersUsed: providersToCheck,
        successfulProviders: providerResponses.filter(r => r.success).map(r => r.provider),
        failedProviders: providerResponses.filter(r => !r.success).map(r => r.provider),
        usingProxy: usingProxy,
        usingUserKeys: hasUserKeys,
        ...(isDebateMode && {
          sideAProviders: debateSideAConfig.selectedProviders,
          sideBProviders: debateSideBConfig.selectedProviders,
          sideAAgent: debateSideAConfig.selectedAgent || 'direct',
          sideBAgent: debateSideBConfig.selectedAgent || 'direct'
        })
      }
    });
    
    // Save execution data to Supabase only if we have a real authenticated session
    const hasRealSession = await hasRealSupabaseSession();
    if (hasRealSession) {
      try {
        const executionData: Omit<PromptExecution, 'id' | 'created_at'> = {
          user_id: user.id,
          prompt: input, // Store original input, not the processed prompt
          agent_type: isDebateMode ? 'debate_mode' : (selectedAgent || 'direct'),
          providers: providersToCheck,
          responses: providerResponses,
          execution_time: totalTime,
          tokens_used: totalTokens
        };

        await db.prompts.create(executionData);
        
        // Update user usage count
        await db.users.updateUsage(user.id, user.usage_count + 1);
        
        toast.success(`${isDebateMode ? 'Debate' : 'Execution'} completed in ${(totalTime / 1000).toFixed(1)}s`);
      } catch (error) {
        console.error('Failed to save execution data:', error);
        toast.success(`${isDebateMode ? 'Debate' : 'Execution'} completed in ${(totalTime / 1000).toFixed(1)}s`);
      }
    } else {
      console.log('Using mock authentication - skipping Supabase database operations');
      toast.success(`${isDebateMode ? 'Debate' : 'Execution'} completed in ${(totalTime / 1000).toFixed(1)}s`);
    }
  };

  const executeProviderRequest = async (
    providerId: string, 
    agentId: string, 
    input: string, 
    resultIndex: number, 
    sideId?: 'A' | 'B',
    sideLabel?: string,
    providerResponses?: ProviderResponse[]
  ) => {
    const requestStart = Date.now();
    
    try {
      // Generate prompt - use prompt agent if selected, otherwise use direct input
      let prompt = input;
      if (agentId) {
        try {
          prompt = AgentService.buildPrompt(agentId, input);
        } catch (error) {
          // If prompt agent not found, fall back to direct input
          prompt = input;
        }
      }

      // Create client and generate response
      // Use user's API key if available
      const client = await ModelShiftAIClientFactory.createWithUserKey(
        providerId,
        user!.id,
        agentId
      );
      
      const response = await client.generate(prompt);
      
      const latency = Date.now() - requestStart;
      const estimatedTokens = Math.ceil(response.length / 4);
      const providerInfo = providers.find(p => p.id === providerId);
      const estimatedCost = providerInfo ? 
        (estimatedTokens * providerInfo.capabilities.pricing.output) / 1000 : 0;

      // Store provider response for analytics
      if (providerResponses) {
        providerResponses.push({
          provider: providerId,
          response,
          latency,
          tokens: estimatedTokens,
          success: true
        });
      }

      // Track analytics event for successful execution
      await analyticsService.trackEvent({
        userId: user!.id,
        eventType: 'provider_call',
        providerId,
        agentId: agentId || undefined,
        promptLength: prompt.length,
        responseLength: response.length,
        success: true,
        metrics: {
          latency,
          tokens: estimatedTokens,
          cost: estimatedCost
        },
        metadata: {
          originalInput: input,
          agentUsed: agentId || 'direct',
          mode: isDebateMode ? 'debate' : 'standard',
          usingProxy: isUsingProxy(),
          usingUserKey: userApiKeys?.providers[providerId] || false,
          ...(sideId && { debateSide: sideId })
        }
      });

      // Update specific result
      setResults(prev => prev.map((result, i) => 
        i === resultIndex ? {
          ...result,
          response,
          loading: false,
          metrics: {
            latency,
            tokens: estimatedTokens,
            cost: estimatedCost
          },
          sideId,
          sideLabel
        } : result
      ));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const latency = Date.now() - requestStart;
      
      // Enhanced error handling for API key issues and server configuration
      let userFriendlyError = errorMessage;
      let errorType = 'unknown';
      
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `Invalid API key for ${providerName}. Please check your API key in the Settings → API Keys section.`;
        errorType = 'authentication';
      } else if (errorMessage.includes('401')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `Authentication failed for ${providerName}. Please verify your API credentials.`;
        errorType = 'authentication';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
        userFriendlyError = `Network error: Unable to connect to ${providerId}. This may be due to CORS restrictions. Please ensure the development server proxy is configured correctly.`;
        errorType = 'network';
      } else if (errorMessage.includes('not set in Supabase secrets') || errorMessage.includes('not configured on the server')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `${providerName} API key is not configured on the server. The server administrator needs to configure the API key in Supabase Edge Function secrets. Alternatively, you can configure your own API key in the Settings → API Keys section.`;
        errorType = 'server_config';
      } else if (errorMessage.includes('GEMINI_API_KEY not set in Supabase secrets')) {
        userFriendlyError = `Google Gemini API key is not configured on the server. The server administrator needs to configure the GEMINI_API_KEY in Supabase Edge Function secrets. Alternatively, you can configure your own API key in the Settings → API Keys section.`;
        errorType = 'server_config';
      } else if (errorMessage.includes('No API key found')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `No API key found for ${providerName}. Please add your API key in the Settings → API Keys section.`;
        errorType = 'missing_key';
      }
      
      // Store failed response for analytics
      if (providerResponses) {
        providerResponses.push({
          provider: providerId,
          response: '',
          latency,
          tokens: 0,
          success: false,
          error: userFriendlyError
        });
      }

      // Track analytics event for failed execution
      await analyticsService.trackEvent({
        userId: user!.id,
        eventType: 'provider_call',
        providerId,
        agentId: agentId || undefined,
        promptLength: input.length,
        responseLength: 0,
        success: false,
        errorType,
        metrics: {
          latency,
          tokens: 0,
          cost: 0
        },
        metadata: {
          originalInput: input,
          agentUsed: agentId || 'direct',
          errorMessage: userFriendlyError,
          mode: isDebateMode ? 'debate' : 'standard',
          usingProxy: isUsingProxy(),
          usingUserKey: userApiKeys?.providers[providerId] || false,
          ...(sideId && { debateSide: sideId })
        }
      });
      
      setResults(prev => prev.map((result, i) => 
        i === resultIndex ? {
          ...result,
          loading: false,
          error: userFriendlyError,
          metrics: {
            latency,
            tokens: 0,
            cost: 0
          },
          sideId,
          sideLabel
        } : result
      ));

      // Show toast for specific error types
      if (errorType === 'authentication') {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        toast.error(`${providerName}: Invalid API key. Please update your credentials in Settings → API Keys.`, { duration: 5000 });
      } else if (errorType === 'server_config') {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        toast.error(`${providerName}: Server API key not configured. Please add your own API key in Settings → API Keys.`, { duration: 8000 });
      } else if (errorType === 'missing_key') {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        toast.error(`${providerName}: No API key found. Please add your API key in Settings → API Keys.`, { duration: 5000 });
      } else if (errorType === 'network') {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        toast.error(`${providerName}: Network/CORS error. Please check the development server proxy configuration.`, { duration: 6000 });
      }
    }
  };

  const availableAgents = AgentService.getAllAgents();

  // Check if we're in a development environment that might have CORS issues
  const isDevelopmentEnvironment = window.location.hostname === 'localhost' || 
                                   window.location.hostname.includes('webcontainer') ||
                                   window.location.hostname.includes('stackblitz');

  // Check for missing API keys
  const usingProxy = isUsingProxy();
  let missingApiKeys: string[] = [];
  
  if (!usingProxy && (!userApiKeys || !userApiKeys.hasKeys)) {
    const providersToCheck = isDebateMode 
      ? [...debateSideAConfig.selectedProviders, ...debateSideBConfig.selectedProviders]
      : selectedProviders;
    
    missingApiKeys = providersToCheck.filter(providerId => {
      // Check if user has this provider key
      if (userApiKeys?.providers[providerId]) {
        return false;
      }
      
      // Fall back to legacy key vault
      const keyData = keyVault.retrieveDefault(providerId);
      return !keyData || Object.keys(keyData).length === 0;
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          AI Playground
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Test and compare AI responses across multiple providers
        </p>
      </div>

      {/* Demo Environment Notice */}
      {isDemoEnvironment() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Demo Environment Active
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                You're using a demo version. Some features may be limited and API calls may fail due to missing server configuration.
              </p>
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-blue-600 dark:text-blue-400">
                  Configure your API keys in the Settings → API Keys section to test with real providers
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proxy Health Status */}
      {proxyHealth && usingProxy && (
        <div className={`border rounded-lg p-4 ${
          proxyHealth.available && proxyHealth.authenticated
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
        }`}>
          <div className="flex items-start space-x-3">
            {proxyHealth.available && proxyHealth.authenticated ? (
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-medium mb-1 ${
                proxyHealth.available && proxyHealth.authenticated
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {proxyHealth.available && proxyHealth.authenticated 
                  ? 'Authenticated Proxy Service Active'
                  : 'Proxy Service Issues Detected'
                }
              </h3>
              <p className={`text-sm mb-2 ${
                proxyHealth.available && proxyHealth.authenticated
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              }`}>
                {proxyHealth.available && proxyHealth.authenticated
                  ? `API calls are being routed through the authenticated proxy service. ${proxyHealth.configuredProviders.length} provider(s) configured.`
                  : 'There are issues with the proxy service configuration.'
                }
              </p>
              
              {proxyHealth.configuredProviders.length > 0 && (
                <div className="text-xs mb-2">
                  <span className="font-medium">Configured providers: </span>
                  <span className="text-green-600 dark:text-green-400">
                    {proxyHealth.configuredProviders.join(', ')}
                  </span>
                </div>
              )}
              
              {proxyHealth.errors.length > 0 && (
                <div className="text-xs">
                  <span className="font-medium">Issues: </span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {proxyHealth.errors.map((error, index) => (
                      <li key={index} className="text-red-600 dark:text-red-400">{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User API Keys Status */}
      {userApiKeys && (
        <div className={`border rounded-lg p-4 ${
          userApiKeys.hasKeys
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
        }`}>
          <div className="flex items-start space-x-3">
            {userApiKeys.hasKeys ? (
              <Key className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Key className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <h3 className={`font-medium mb-1 ${
                userApiKeys.hasKeys
                  ? 'text-green-900 dark:text-green-100'
                  : 'text-amber-900 dark:text-amber-100'
              }`}>
                {userApiKeys.hasKeys 
                  ? 'Your API Keys Configured'
                  : 'No Personal API Keys Found'
                }
              </h3>
              <p className={`text-sm mb-2 ${
                userApiKeys.hasKeys
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-amber-700 dark:text-amber-300'
              }`}>
                {userApiKeys.hasKeys
                  ? 'You have configured your own API keys for some providers. These will be used instead of server keys when available.'
                  : 'You haven\'t configured any personal API keys yet. The system will use server keys if available.'
                }
              </p>
              
              {userApiKeys.hasKeys && (
                <div className="text-xs mb-2">
                  <span className="font-medium">Your configured providers: </span>
                  <span className="text-green-600 dark:text-green-400">
                    {Object.entries(userApiKeys.providers)
                      .filter(([_, hasKey]) => hasKey)
                      .map(([providerId]) => {
                        const provider = providers.find(p => p.id === providerId);
                        return provider?.displayName || providerId;
                      })
                      .join(', ')}
                  </span>
                </div>
              )}
              
              <button
                onClick={() => window.location.href = '#/settings/api-keys'}
                className="text-xs px-2 py-1 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors"
              >
                {userApiKeys.hasKeys ? 'Manage API Keys' : 'Add Your API Keys'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Server Configuration Notice */}
      {usingProxy && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-1">
                Using Authenticated Proxy Mode
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                API calls are being routed through a secure authenticated server proxy. The system will use your personal API keys when available, and fall back to server keys when needed.
              </p>
              <div className="text-xs text-green-600 dark:text-green-400">
                <p className="font-medium mb-1">API Key Priority:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Your personal API keys (if configured in Settings → API Keys)</li>
                  <li>Server API keys (if configured by administrator)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Missing API Keys Warning */}
      {!usingProxy && missingApiKeys.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Key className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                Missing API Keys
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
                You need to add API keys for the following providers: {missingApiKeys.map(id => {
                  const provider = providers.find(p => p.id === id);
                  return provider?.displayName || id;
                }).join(', ')}
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Go to Settings → API Keys to add your credentials before using the playground.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Development Environment Notice */}
      {isDevelopmentEnvironment && !usingProxy && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Development Environment - CORS Proxy Active
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                You're running in a development environment. API calls to external services are being routed through the Vite development proxy to bypass CORS restrictions.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p className="font-medium mb-1">Proxy routes configured:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>/api/openai → OpenAI API</li>
                  <li>/api/anthropic → Anthropic Claude API</li>
                  <li>/api/gemini → Google Gemini API</li>
                  <li>/api/ibm → IBM WatsonX API</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Playground Mode
            </h3>
            <div className="flex items-center space-x-2">
              <Users className={`w-5 h-5 ${!isDebateMode ? 'text-primary-500' : 'text-neutral-400'}`} />
              <button
                onClick={() => setIsDebateMode(!isDebateMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isDebateMode 
                    ? 'bg-orange-600' 
                    : 'bg-primary-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDebateMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <Swords className={`w-5 h-5 ${isDebateMode ? 'text-orange-500' : 'text-neutral-400'}`} />
            </div>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {isDebateMode ? 'Debate Mode: Compare two different AI configurations' : 'Standard Mode: Compare multiple providers'}
          </div>
        </div>

        {isDebateMode && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <Swords className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-900 dark:text-orange-100 mb-1">
                  Debate Mode Active
                </h4>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Configure two different AI setups to compare their responses side-by-side. Perfect for testing different approaches or comparing provider capabilities.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Panel */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        {isDebateMode ? (
          /* Debate Mode Configuration */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            {/* Side A Configuration */}
            <div className="border-2 border-orange-200 dark:border-orange-800 rounded-lg p-6 bg-orange-50 dark:bg-orange-900/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {debateSideAConfig.label}
                </h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Select Providers</h4>
                  <ProviderSelector
                    selected={debateSideAConfig.selectedProviders}
                    onChange={(providers) => setDebateSideAConfig(prev => ({ ...prev, selectedProviders: providers }))}
                    userApiKeys={userApiKeys?.providers}
                  />
                </div>
                
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Choose Prompt Agent (Optional)</h4>
                  {availableAgents.length > 0 ? (
                    <AgentSelector
                      selected={debateSideAConfig.selectedAgent}
                      onChange={(agent) => setDebateSideAConfig(prev => ({ ...prev, selectedAgent: agent }))}
                    />
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                        No prompt agents available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Side B Configuration */}
            <div className="border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6 bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  B
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {debateSideBConfig.label}
                </h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Select Providers</h4>
                  <ProviderSelector
                    selected={debateSideBConfig.selectedProviders}
                    onChange={(providers) => setDebateSideBConfig(prev => ({ ...prev, selectedProviders: providers }))}
                    userApiKeys={userApiKeys?.providers}
                  />
                </div>
                
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Choose Prompt Agent (Optional)</h4>
                  {availableAgents.length > 0 ? (
                    <AgentSelector
                      selected={debateSideBConfig.selectedAgent}
                      onChange={(agent) => setDebateSideBConfig(prev => ({ ...prev, selectedAgent: agent }))}
                    />
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                        No prompt agents available
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Mode Configuration */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Provider Selection */}
            <div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Select Providers
              </h3>
              <ProviderSelector
                selected={selectedProviders}
                onChange={setSelectedProviders}
                userApiKeys={userApiKeys?.providers}
              />
            </div>

            {/* Prompt Agent Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Choose Prompt Agent (Optional)
                </h3>
                {availableAgents.length === 0 && (
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">
                    No prompt agents available
                  </span>
                )}
              </div>
              {availableAgents.length > 0 ? (
                <AgentSelector
                  selected={selectedAgent}
                  onChange={setSelectedAgent}
                />
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                  <p className="text-neutral-500 dark:text-neutral-400 mb-2">
                    No custom prompt agents available
                  </p>
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">
                    You can still use the playground with direct prompts, or create prompt agents in Prompt Agent Management
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Input
            </h3>
            {isDebateMode && (
              <div className="flex items-center space-x-4">
                {debateSideAConfig.selectedAgent && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Side A: {AgentService.getAgent(debateSideAConfig.selectedAgent)?.name || 'Unknown'}
                    </span>
                  </div>
                )}
                {debateSideBConfig.selectedAgent && (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      Side B: {AgentService.getAgent(debateSideBConfig.selectedAgent)?.name || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>
            )}
            {!isDebateMode && selectedAgent && (
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 rounded-full text-sm font-medium">
                  {AgentService.getAgent(selectedAgent)?.name || 'Unknown'}
                </span>
              </div>
            )}
          </div>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isDebateMode 
              ? 'Enter your prompt for the debate. Both sides will respond to the same input...'
              : 'Enter your prompt here... (You can use this playground with or without selecting a prompt agent)'
            }
            className="w-full h-32 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none transition-colors"
          />

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-4 text-sm text-neutral-500 dark:text-neutral-400">
              <span>{input.length} characters</span>
              <span>~{Math.ceil(input.length / 4)} tokens</span>
              {isDebateMode && (
                <span className="text-orange-600 dark:text-orange-400">
                  Debate Mode: {debateSideAConfig.selectedProviders.length + debateSideBConfig.selectedProviders.length} total providers
                </span>
              )}
            </div>
            
            <button
              onClick={handleExecute}
              disabled={
                isExecuting || 
                !input.trim() || 
                (isDebateMode 
                  ? (debateSideAConfig.selectedProviders.length === 0 || debateSideBConfig.selectedProviders.length === 0)
                  : selectedProviders.length === 0
                ) ||
                (!usingProxy && missingApiKeys.length > 0)
              }
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-medium hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isExecuting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isDebateMode ? 'Running Debate...' : 'Executing...'}</span>
                </>
              ) : (
                <>
                  {isDebateMode ? <Swords className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isDebateMode ? 'Start Debate' : 'Execute'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ResponseComparison results={results} isDebateMode={isDebateMode} />
      )}
    </div>
  );
}