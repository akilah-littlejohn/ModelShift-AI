import React, { useState } from 'react';
import { Play, Zap, Clock, DollarSign, AlertTriangle, Info, Key, Users, Swords } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ResponseComparison } from './ResponseComparison';
import { providers } from '../../data/providers';
import { AgentService } from '../../lib/agents';
import { ModelShiftAIClientFactory } from '../../lib/modelshift-ai-sdk';
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

  // Check if we have a real Supabase session for database operations
  const hasRealSupabaseSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session && session.user && !session.user.email?.includes('demo');
    } catch {
      return false;
    }
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

    // Check if API keys are configured for selected providers (only for legacy mode)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isUsingProxy = supabaseUrl && supabaseAnonKey && 
                       !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');

    if (!isUsingProxy) {
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
          `Missing API keys for: ${providerNames}. Please add them in the API Keys section.`,
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

      // Check if API key exists for legacy mode
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const isUsingProxy = supabaseUrl && supabaseAnonKey && 
                         !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');

      let keyData = null;
      if (!isUsingProxy) {
        keyData = keyVault.retrieveDefault(providerId);
        if (!keyData || Object.keys(keyData).length === 0) {
          throw new Error(`API credentials not found for ${providerId}. Please add them in the API Keys section.`);
        }

        // Validate required fields for the provider
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          const missingFields = provider.keyRequirements
            .filter(req => req.required && (!keyData[req.name] || !keyData[req.name].trim()))
            .map(req => req.label);
          
          if (missingFields.length > 0) {
            throw new Error(`Missing required fields for ${providerId}: ${missingFields.join(', ')}`);
          }
        }
      }

      // Create client and generate response
      const client = ModelShiftAIClientFactory.create(providerId, keyData || undefined);
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
      
      // Enhanced error handling for API key issues
      let userFriendlyError = errorMessage;
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `Invalid API key for ${providerName}. Please check your API key in the API Keys section.`;
      } else if (errorMessage.includes('401')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        userFriendlyError = `Authentication failed for ${providerName}. Please verify your API credentials.`;
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('CORS')) {
        userFriendlyError = `Network error: Unable to connect to ${providerId}. This may be due to CORS restrictions in the development environment.`;
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
        errorType: errorMessage.includes('401') ? 'authentication' : 
                   errorMessage.includes('network') ? 'network' : 'unknown',
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

      // Show toast for API key errors
      if (errorMessage.includes('invalid_api_key') || errorMessage.includes('Incorrect API key') || errorMessage.includes('401')) {
        const providerName = providers.find(p => p.id === providerId)?.displayName || providerId;
        toast.error(`${providerName}: Invalid API key. Please update your credentials.`, { duration: 5000 });
      }
    }
  };

  const availableAgents = AgentService.getAllAgents();

  // Check if we're in a development environment that might have CORS issues
  const isDevelopmentEnvironment = window.location.hostname === 'localhost' || 
                                   window.location.hostname.includes('webcontainer') ||
                                   window.location.hostname.includes('stackblitz');

  // Check for missing API keys (only for legacy mode)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isUsingProxy = supabaseUrl && supabaseAnonKey && 
                     !supabaseUrl.includes('demo') && !supabaseAnonKey.includes('demo');

  let missingApiKeys: string[] = [];
  if (!isUsingProxy) {
    const providersToCheck = isDebateMode 
      ? [...debateSideAConfig.selectedProviders, ...debateSideBConfig.selectedProviders]
      : selectedProviders;
    
    missingApiKeys = providersToCheck.filter(providerId => {
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

      {/* Missing API Keys Warning */}
      {!isUsingProxy && missingApiKeys.length > 0 && (
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
                Go to the API Keys section to add your credentials before using the playground.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Development Environment Notice */}
      {isDevelopmentEnvironment && !isUsingProxy && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                Development Environment Notice
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                You're running in a development environment. API calls to external services may be blocked due to CORS restrictions.
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p className="font-medium mb-1">For production deployment:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Deploy to a production server with proper CORS configuration</li>
                  <li>Use a backend proxy to handle API calls</li>
                  <li>Implement server-side API routes for external service calls</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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
                (!isUsingProxy && missingApiKeys.length > 0)
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