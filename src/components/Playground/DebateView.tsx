import React, { useState, useEffect } from 'react';
import { Swords, Play, X, Settings, Plus, Minus, RefreshCw, AlertTriangle, Info } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ResponseComparison } from './ResponseComparison';
import { ProxyService } from '../../lib/api/ProxyService';
import { useAuth } from '../../contexts/AuthContext';
import { AgentService } from '../../lib/agents';
import toast from 'react-hot-toast';
import type { DebateSideConfig, ComparisonResult } from '../../types';

export function DebateView() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [connectionMode, setConnectionMode] = useState('server');
  const [showSettings, setShowSettings] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  
  // Debate configuration
  const [sideA, setSideA] = useState<DebateSideConfig>({
    selectedProviders: ['openai'],
    selectedAgent: '',
    label: 'Side A'
  });
  
  const [sideB, setSideB] = useState<DebateSideConfig>({
    selectedProviders: ['gemini'],
    selectedAgent: '',
    label: 'Side B'
  });

  // Load connection mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('modelshift-connection-mode');
    if (savedMode) {
      setConnectionMode(savedMode);
    }
  }, []);

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const promptToUse = improvedPrompt || prompt;
    
    if (!promptToUse.trim()) {
      toast.error('Please enter a prompt');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to use the debate feature');
      return;
    }
    
    if (sideA.selectedProviders.length === 0 || sideB.selectedProviders.length === 0) {
      toast.error('Please select at least one provider for each side');
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    
    // Initialize results with loading state
    const initialResults: ComparisonResult[] = [
      ...sideA.selectedProviders.map(provider => ({
        provider,
        response: '',
        loading: true,
        error: undefined,
        metrics: { latency: 0, tokens: 0, cost: 0 },
        sideId: 'A',
        sideLabel: sideA.label
      })),
      ...sideB.selectedProviders.map(provider => ({
        provider,
        response: '',
        loading: true,
        error: undefined,
        metrics: { latency: 0, tokens: 0, cost: 0 },
        sideId: 'B',
        sideLabel: sideB.label
      }))
    ];
    
    setResults(initialResults);
    
    // Process each provider in parallel
    const promises = [
      ...sideA.selectedProviders.map((provider, index) => 
        processProvider(provider, sideA.selectedAgent, 'A', sideA.label, index, promptToUse)
      ),
      ...sideB.selectedProviders.map((provider, index) => 
        processProvider(provider, sideB.selectedAgent, 'B', sideB.label, sideA.selectedProviders.length + index, promptToUse)
      )
    ];
    
    await Promise.all(promises);
    setIsLoading(false);
  };
  
  const processProvider = async (
    providerId: string, 
    agentId: string, 
    sideId: 'A' | 'B',
    sideLabel: string,
    resultIndex: number,
    promptText: string
  ) => {
    try {
      // Prepare the prompt based on agent and debate context
      let finalPrompt = promptText;
      
      if (agentId) {
        try {
          finalPrompt = AgentService.buildPrompt(agentId, promptText);
        } catch (error) {
          console.error(`Error building prompt for agent ${agentId}:`, error);
          // Fall back to original prompt
        }
      }
      
      // Add debate context to the prompt
      const debateContext = `You are participating in a debate as ${sideLabel}. 
Your goal is to provide a thoughtful, well-reasoned response to the following prompt.
Focus on making the strongest possible case for your position.

PROMPT: ${finalPrompt}`;

      // Make the API call
      const response = await ProxyService.callProvider({
        providerId,
        prompt: debateContext,
        agentId: agentId || undefined,
        userId: user?.id,
        useUserKey: connectionMode === 'browser'
      });

      // Update the result
      setResults(prevResults => {
        const newResults = [...prevResults];
        newResults[resultIndex] = {
          provider: providerId,
          response: response.success ? response.response || '' : '',
          loading: false,
          error: response.success ? undefined : response.error,
          metrics: response.metrics || { latency: 0, tokens: 0, cost: 0 },
          sideId,
          sideLabel
        };
        return newResults;
      });

    } catch (error) {
      console.error(`Error processing provider ${providerId}:`, error);
      
      // Update the result with error
      setResults(prevResults => {
        const newResults = [...prevResults];
        newResults[resultIndex] = {
          provider: providerId,
          response: '',
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: { latency: 0, tokens: 0, cost: 0 },
          sideId,
          sideLabel
        };
        return newResults;
      });
    }
  };

  const improvePromptWithGemini = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to improve');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to use this feature');
      return;
    }
    
    setIsImprovingPrompt(true);
    
    try {
      const improvementPrompt = `You are an expert prompt engineer. Your task is to improve the following debate prompt to make it more balanced, nuanced, and conducive to thoughtful debate.

Original prompt: "${prompt}"

Please provide an improved version that:
1. Ensures the prompt is balanced and doesn't favor one side
2. Adds nuance and complexity to encourage deeper thinking
3. Makes the prompt clearer and more specific
4. Frames it as a debate question with clear opposing viewpoints

Return ONLY the improved prompt text without any explanations, introductions, or additional text.`;

      const response = await ProxyService.callProvider({
        providerId: 'gemini',
        prompt: improvementPrompt,
        userId: user.id,
        useUserKey: connectionMode === 'browser'
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to improve prompt');
      }

      setImprovedPrompt(response.response);
      toast.success('Prompt improved successfully!');
    } catch (error) {
      console.error('Error improving prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to improve prompt');
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleAddProvider = (side: 'A' | 'B') => {
    if (side === 'A') {
      if (sideA.selectedProviders.length >= 3) {
        toast.error('Maximum 3 providers per side');
        return;
      }
      setSideA({
        ...sideA,
        selectedProviders: [...sideA.selectedProviders, 'openai']
      });
    } else {
      if (sideB.selectedProviders.length >= 3) {
        toast.error('Maximum 3 providers per side');
        return;
      }
      setSideB({
        ...sideB,
        selectedProviders: [...sideB.selectedProviders, 'gemini']
      });
    }
  };

  const handleRemoveProvider = (side: 'A' | 'B', index: number) => {
    if (side === 'A') {
      if (sideA.selectedProviders.length <= 1) {
        toast.error('At least one provider is required');
        return;
      }
      const newProviders = [...sideA.selectedProviders];
      newProviders.splice(index, 1);
      setSideA({
        ...sideA,
        selectedProviders: newProviders
      });
    } else {
      if (sideB.selectedProviders.length <= 1) {
        toast.error('At least one provider is required');
        return;
      }
      const newProviders = [...sideB.selectedProviders];
      newProviders.splice(index, 1);
      setSideB({
        ...sideB,
        selectedProviders: newProviders
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <Swords className="w-6 h-6 text-orange-500" />
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            AI Debate Arena
          </h1>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          Compare AI models in a debate format with opposing viewpoints
        </p>
      </div>

      {/* Connection Mode Indicator */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectionMode === 'server' ? 'bg-primary-500' : 'bg-secondary-500'}`}></div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {connectionMode === 'server' ? 'Server Proxy Mode' : 'Direct Browser Mode'}
            </span>
          </div>
          <a 
            href="#" 
            onClick={(e) => {
              e.preventDefault();
              window.location.href = '/settings';
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Change in Settings
          </a>
        </div>
      </div>

      {/* Debate Configuration */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
            Debate Configuration
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-2 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>{showSettings ? 'Hide Settings' : 'Show Settings'}</span>
          </button>
        </div>

        {showSettings && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Side A Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Side A Configuration</h3>
                  <input
                    type="text"
                    value={sideA.label}
                    onChange={(e) => setSideA({ ...sideA, label: e.target.value })}
                    placeholder="Side A Label"
                    className="mt-1 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Side A Providers */}
              <div className="space-y-3">
                {sideA.selectedProviders.map((provider, index) => (
                  <div key={`sideA-${index}`} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <ProviderSelector
                        selected={[provider]}
                        onChange={(providers) => {
                          const newProviders = [...sideA.selectedProviders];
                          newProviders[index] = providers[0];
                          setSideA({ ...sideA, selectedProviders: newProviders });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveProvider('A', index)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddProvider('A')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Provider</span>
                </button>
              </div>

              {/* Side A Agent */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Prompt Agent (Optional)
                </h4>
                <AgentSelector
                  selected={sideA.selectedAgent}
                  onChange={(agentId) => setSideA({ ...sideA, selectedAgent: agentId })}
                />
              </div>
            </div>

            {/* Side B Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Side B Configuration</h3>
                  <input
                    type="text"
                    value={sideB.label}
                    onChange={(e) => setSideB({ ...sideB, label: e.target.value })}
                    placeholder="Side B Label"
                    className="mt-1 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Side B Providers */}
              <div className="space-y-3">
                {sideB.selectedProviders.map((provider, index) => (
                  <div key={`sideB-${index}`} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <ProviderSelector
                        selected={[provider]}
                        onChange={(providers) => {
                          const newProviders = [...sideB.selectedProviders];
                          newProviders[index] = providers[0];
                          setSideB({ ...sideB, selectedProviders: newProviders });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveProvider('B', index)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => handleAddProvider('B')}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Provider</span>
                </button>
              </div>

              {/* Side B Agent */}
              <div>
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Prompt Agent (Optional)
                </h4>
                <AgentSelector
                  selected={sideB.selectedAgent}
                  onChange={(agentId) => setSideB({ ...sideB, selectedAgent: agentId })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Prompt Input */}
        <form onSubmit={handlePromptSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Debate Prompt
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setImprovedPrompt(null); // Reset improved prompt when original changes
                }}
                placeholder="Enter a debate topic or question..."
                rows={4}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                disabled={isLoading || isImprovingPrompt}
              />
              <div className="absolute right-2 bottom-2">
                <button
                  type="button"
                  onClick={improvePromptWithGemini}
                  disabled={isLoading || isImprovingPrompt || !prompt.trim()}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-secondary-500 text-white rounded hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isImprovingPrompt ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Improving...</span>
                    </>
                  ) : (
                    <>
                      <span>Improve with Gemini</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Improved Prompt */}
          {improvedPrompt && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-green-900 dark:text-green-100">
                      Improved Prompt (by Gemini)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setImprovedPrompt(null)}
                      className="text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-green-800 dark:text-green-200">
                    {improvedPrompt}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || (!prompt.trim() && !improvedPrompt)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 text-white rounded-lg hover:from-orange-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Generating Debate...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Start Debate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <ResponseComparison results={results} isDebateMode={true} />
      )}
    </div>
  );
}