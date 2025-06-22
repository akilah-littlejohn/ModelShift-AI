import React, { useState, useEffect } from 'react';
import { Play, Settings, History, AlertCircle, Info, CheckCircle, XCircle } from 'lucide-react';
import { proxyService } from '../../lib/api/ProxyService';
import { providers } from '../../data/providers';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ResponseComparison } from './ResponseComparison';
import { DebateView } from './DebateView';
import { useAuth } from '../../contexts/AuthContext';

interface PlaygroundResponse {
  providerId: string;
  response: string;
  error?: string;
  model?: string;
  using_user_key?: boolean;
  metrics?: {
    responseTime: number;
    timestamp: string;
  };
}

export function PlaygroundView() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>(['openai']);
  const [selectedAgent, setSelectedAgent] = useState<string>('direct');
  const [responses, setResponses] = useState<PlaygroundResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'single' | 'comparison' | 'debate'>('single');
  const [showApiKeyWarning, setShowApiKeyWarning] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    configuredProviders: string[];
    errors: string[];
  } | null>(null);

  // Check health status on component mount
  useEffect(() => {
    checkHealthStatus();
  }, []);

  const checkHealthStatus = async () => {
    try {
      const status = await proxyService.checkHealth();
      setHealthStatus({
        configuredProviders: status.configuredProviders || [],
        errors: status.errors || []
      });
    } catch (error) {
      console.error('Failed to check health status:', error);
      setHealthStatus({
        configuredProviders: [],
        errors: ['Failed to check server configuration']
      });
    }
  };

  const executeProviderRequest = async (providerId: string, prompt: string): Promise<PlaygroundResponse> => {
    try {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) {
        throw new Error(`Provider ${providerId} not found`);
      }

      const result = await proxyService.callProvider({
        providerId,
        prompt,
        model: provider.models[0]?.id,
        userId: user?.id,
        agentId: selectedAgent !== 'direct' ? selectedAgent : undefined
      });

      return {
        providerId,
        response: result.response || '',
        model: result.model,
        using_user_key: result.using_user_key,
        metrics: result.metrics
      };
    } catch (error) {
      console.error(`Error with provider ${providerId}:`, error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Extract the formatted error from the JSON if it exists
        try {
          const errorMatch = errorMessage.match(/{"success":false,"error":"([^"]+)"/);
          if (errorMatch) {
            errorMessage = errorMatch[1];
          } else {
            // Try to parse the full JSON error
            const jsonMatch = errorMessage.match(/{.*}/s);
            if (jsonMatch) {
              const errorData = JSON.parse(jsonMatch[0]);
              if (errorData.error) {
                errorMessage = errorData.error;
              }
            }
          }
        } catch (parseError) {
          // If parsing fails, use the original error message
        }
      }

      return {
        providerId,
        response: '',
        error: errorMessage
      };
    }
  };

  const handleExecute = async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setResponses([]);
    setShowApiKeyWarning(false);

    try {
      const promises = selectedProviders.map(providerId => 
        executeProviderRequest(providerId, prompt)
      );

      const results = await Promise.all(promises);
      setResponses(results);

      // Check if any responses had API key errors
      const hasApiKeyErrors = results.some(result => 
        result.error && (
          result.error.includes('No API key found') ||
          result.error.includes('Authentication failed') ||
          result.error.includes('Invalid API key')
        )
      );

      if (hasApiKeyErrors) {
        setShowApiKeyWarning(true);
      }

    } catch (error) {
      console.error('Execution error:', error);
      alert(`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatErrorMessage = (error: string): JSX.Element => {
    // Split by newlines and format as structured text
    const lines = error.split('\n').filter(line => line.trim());
    
    return (
      <div className="space-y-2">
        {lines.map((line, index) => {
          if (line.startsWith('Option ') || line.startsWith('•')) {
            return (
              <div key={index} className="text-sm">
                {line.startsWith('Option ') ? (
                  <div className="font-semibold text-blue-600 dark:text-blue-400 mt-3">
                    {line}
                  </div>
                ) : (
                  <div className="ml-4 text-gray-600 dark:text-gray-400">
                    {line}
                  </div>
                )}
              </div>
            );
          }
          return (
            <div key={index} className={`text-sm ${index === 0 ? 'font-medium' : ''}`}>
              {line}
            </div>
          );
        })}
      </div>
    );
  };

  if (mode === 'debate') {
    return (
      <DebateView
        onBack={() => setMode('single')}
        selectedProviders={selectedProviders}
        onProvidersChange={setSelectedProviders}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Playground</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Test and compare AI models with your prompts
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Health Status Indicator */}
          {healthStatus && (
            <div className="flex items-center gap-2">
              {healthStatus.configuredProviders.length > 0 ? (
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">
                    {healthStatus.configuredProviders.length} provider{healthStatus.configuredProviders.length !== 1 ? 's' : ''} configured
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">No server keys configured</span>
                </div>
              )}
            </div>
          )}
          
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode('comparison')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                mode === 'comparison'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Compare
            </button>
            <button
              onClick={() => setMode('debate')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                mode === 'debate'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Debate
            </button>
          </div>
        </div>
      </div>

      {/* API Key Warning */}
      {showApiKeyWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                API Key Configuration Required
              </h3>
              <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                Some providers failed due to missing API keys. Configure your API keys in Settings → API Keys to use all providers.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select Provider{mode === 'comparison' ? 's' : ''}
            </label>
            <ProviderSelector
              selectedProviders={selectedProviders}
              onProvidersChange={setSelectedProviders}
              multiSelect={mode === 'comparison'}
              healthStatus={healthStatus}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Agent Mode
            </label>
            <AgentSelector
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
            />
          </div>
        </div>
      </div>

      {/* Prompt Input */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Your Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="w-full h-32 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
        />
        
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {prompt.length} characters
          </div>
          
          <button
            onClick={handleExecute}
            disabled={isLoading || !prompt.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {isLoading ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Results */}
      {responses.length > 0 && (
        <div className="space-y-6">
          {mode === 'comparison' ? (
            <ResponseComparison responses={responses} />
          ) : (
            <div className="space-y-4">
              {responses.map((response, index) => {
                const provider = providers.find(p => p.id === response.providerId);
                
                return (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {provider?.name.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {provider?.name || response.providerId}
                          </h3>
                          {response.model && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {response.model}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        {response.using_user_key && (
                          <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded text-xs">
                            User Key
                          </span>
                        )}
                        {response.metrics && (
                          <span>{response.metrics.responseTime}ms</span>
                        )}
                      </div>
                    </div>
                    
                    {response.error ? (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                              Error
                            </h4>
                            {formatErrorMessage(response.error)}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="prose dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                          {response.response}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}