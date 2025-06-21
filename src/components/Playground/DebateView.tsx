import React, { useState, useEffect } from 'react';
import { Swords, Play, X, Settings, Plus, Minus, RefreshCw, AlertTriangle, Info, Download, Copy, Check } from 'lucide-react';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ResponseComparison } from './ResponseComparison';
import { ProxyService } from '../../lib/api/ProxyService';
import { useAuth } from '../../contexts/AuthContext';
import { AgentService } from '../../lib/agents';
import { db } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { DebateSideConfig, ComparisonResult } from '../../types';

// Predefined prompt packs for debate topics
const PROMPT_PACKS = [
  {
    id: 'general',
    name: 'General Topics',
    topics: [
      'Should artificial intelligence be regulated by governments?',
      'Is social media doing more harm than good to society?',
      'Should college education be free for all citizens?',
      'Is universal basic income a good solution for economic inequality?',
      'Should voting be mandatory in democratic countries?'
    ]
  },
  {
    id: 'technology',
    name: 'Technology & Future',
    topics: [
      'Will cryptocurrency replace traditional banking in the next decade?',
      'Should autonomous vehicles be allowed on public roads?',
      'Is the metaverse the future of human interaction?',
      'Should we colonize Mars in the next 20 years?',
      'Are smart homes improving or compromising our quality of life?'
    ]
  },
  {
    id: 'ethics',
    name: 'Ethics & Society',
    topics: [
      'Is it ethical to use genetic engineering on human embryos?',
      'Should euthanasia be legal for terminally ill patients?',
      'Do corporations have a responsibility to prioritize environmental concerns over profits?',
      'Should hate speech be protected under freedom of expression?',
      'Is cultural appropriation harmful or beneficial to society?'
    ]
  },
  {
    id: 'philosophy',
    name: 'Philosophy 101',
    topics: [
      'Does free will truly exist?',
      'Is morality objective or subjective?',
      'Can artificial intelligence ever be conscious?',
      'Is knowledge possible without experience?',
      'Does the existence of evil disprove the existence of an all-powerful, benevolent God?'
    ]
  }
];

export function DebateView() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [connectionMode, setConnectionMode] = useState('server');
  const [showSettings, setShowSettings] = useState(false);
  const [improvedPrompt, setImprovedPrompt] = useState<string | null>(null);
  const [isImprovingPrompt, setIsImprovingPrompt] = useState(false);
  const [selectedPack, setSelectedPack] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [debateRound, setDebateRound] = useState(0);
  const [debateHistory, setDebateHistory] = useState<Array<{round: number, positionA: string, positionB: string}>>([]);
  const [activePosition, setActivePosition] = useState<'A' | 'B'>('A');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  
  // Debate configuration
  const [sideA, setSideA] = useState<DebateSideConfig>({
    selectedProviders: ['openai'],
    selectedAgent: '',
    label: 'Position A'
  });
  
  const [sideB, setSideB] = useState<DebateSideConfig>({
    selectedProviders: ['gemini'],
    selectedAgent: '',
    label: 'Position B'
  });

  // Load connection mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('modelshift-connection-mode');
    if (savedMode) {
      setConnectionMode(savedMode);
    }
  }, []);

  // Handle topic selection from prompt packs
  const handleTopicSelect = (topic: string) => {
    setPrompt(topic);
    setImprovedPrompt(null);
  };

  const handlePromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const promptToUse = improvedPrompt || prompt;
    
    if (!promptToUse.trim()) {
      toast.error('Please enter a debate topic');
      return;
    }
    
    if (!user?.id) {
      toast.error('You must be logged in to use the debate feature');
      return;
    }
    
    if (sideA.selectedProviders.length === 0 || sideB.selectedProviders.length === 0) {
      toast.error('Please select at least one provider for each position');
      return;
    }
    
    setIsLoading(true);
    setResults([]);
    setDebateRound(1);
    
    // Generate a unique ID for this debate execution
    const debateId = uuidv4();
    setExecutionId(debateId);
    
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
        processProvider(provider, sideA.selectedAgent, 'A', sideA.label, index, promptToUse, 1)
      ),
      ...sideB.selectedProviders.map((provider, index) => 
        processProvider(provider, sideB.selectedAgent, 'B', sideB.label, sideA.selectedProviders.length + index, promptToUse, 1)
      )
    ];
    
    await Promise.all(promises);
    
    // Record the debate execution in the database
    try {
      const allResponses = results.map(r => ({
        provider: r.provider,
        response: r.response,
        latency: r.metrics.latency,
        tokens: r.metrics.tokens,
        success: !r.error,
        error: r.error
      }));
      
      const totalTokens = results.reduce((sum, r) => sum + r.metrics.tokens, 0);
      const totalTime = results.reduce((sum, r) => sum + r.metrics.latency, 0);
      
      await db.prompts.create({
        user_id: user.id,
        prompt: promptToUse,
        agent_type: 'debate',
        providers: [...sideA.selectedProviders, ...sideB.selectedProviders],
        responses: allResponses,
        execution_time: totalTime,
        tokens_used: totalTokens
      });
    } catch (dbError) {
      console.error('Failed to record debate execution:', dbError);
      // Don't fail the request if recording fails
    }
    
    setIsLoading(false);
  };
  
  const processProvider = async (
    providerId: string, 
    agentId: string, 
    sideId: 'A' | 'B',
    sideLabel: string,
    resultIndex: number,
    promptText: string,
    round: number
  ) => {
    try {
      // Start tracking execution time
      const startTime = Date.now();
      
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
      let debateContext = '';
      
      if (round === 1) {
        // Opening statements
        debateContext = `You are participating in a debate as ${sideLabel}. 
Your goal is to provide a thoughtful, well-reasoned opening statement on the following topic.
Focus on making the strongest possible case for your position.

DEBATE TOPIC: ${finalPrompt}

Provide an opening statement of 3-4 paragraphs that clearly states your position and main arguments.
Be persuasive, logical, and evidence-based. Avoid logical fallacies and emotional appeals.`;
      } else {
        // Rebuttals - include previous rounds
        const previousRounds = debateHistory.slice(0, round - 1);
        const previousRoundsText = previousRounds.map(r => 
          `Round ${r.round}:\n${sideLabel === sideA.label ? 'Your position' : 'Opposing position'}: ${r.positionA}\n${sideLabel === sideB.label ? 'Your position' : 'Opposing position'}: ${r.positionB}`
        ).join('\n\n');
        
        debateContext = `You are participating in a debate as ${sideLabel} on the topic: "${finalPrompt}"

Previous rounds of the debate:
${previousRoundsText}

Now, provide a rebuttal for round ${round}. Address the arguments made by the opposing position, defend your position against criticisms, and introduce new supporting evidence for your stance.

Your response should be 3-4 paragraphs, focused on the strongest counterarguments and most compelling points for your position.`;
      }

      // Make the API call
      const response = await ProxyService.callProvider({
        providerId,
        prompt: debateContext,
        agentId: agentId || undefined,
        userId: user?.id,
        useUserKey: connectionMode === 'browser'
      });

      // Calculate execution time
      const executionTime = Date.now() - startTime;

      // Update the result
      setResults(prevResults => {
        const newResults = [...prevResults];
        newResults[resultIndex] = {
          provider: providerId,
          response: response.success ? response.response || '' : '',
          loading: false,
          error: response.success ? undefined : response.error,
          metrics: {
            latency: executionTime,
            tokens: response.metrics?.tokens || Math.ceil((debateContext.length + (response.response?.length || 0)) / 4),
            cost: response.metrics?.cost || 0
          },
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
        toast.error('Maximum 3 providers per position');
        return;
      }
      setSideA({
        ...sideA,
        selectedProviders: [...sideA.selectedProviders, 'openai']
      });
    } else {
      if (sideB.selectedProviders.length >= 3) {
        toast.error('Maximum 3 providers per position');
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

  const togglePosition = () => {
    setActivePosition(prev => prev === 'A' ? 'B' : 'A');
    toast.success(`Switched to ${activePosition === 'A' ? 'Position B' : 'Position A'}`);
  };

  const continueDebate = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to continue the debate');
      return;
    }
    
    if (results.length === 0) {
      toast.error('No debate results to continue from');
      return;
    }
    
    // Save current round to history
    const positionAResponses = results.filter(r => r.sideId === 'A' && !r.loading && !r.error);
    const positionBResponses = results.filter(r => r.sideId === 'B' && !r.loading && !r.error);
    
    if (positionAResponses.length === 0 || positionBResponses.length === 0) {
      toast.error('Both positions must have at least one successful response to continue');
      return;
    }
    
    // Get the best response from each side (for now, just take the first one)
    const positionAResponse = positionAResponses[0].response;
    const positionBResponse = positionBResponses[0].response;
    
    setDebateHistory(prev => [
      ...prev, 
      {
        round: debateRound,
        positionA: positionAResponse,
        positionB: positionBResponse
      }
    ]);
    
    // Start next round
    const nextRound = debateRound + 1;
    setDebateRound(nextRound);
    setIsLoading(true);
    
    // Initialize results with loading state for next round
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
    
    // Process each provider in parallel for the next round
    const promptToUse = improvedPrompt || prompt;
    const promises = [
      ...sideA.selectedProviders.map((provider, index) => 
        processProvider(provider, sideA.selectedAgent, 'A', sideA.label, index, promptToUse, nextRound)
      ),
      ...sideB.selectedProviders.map((provider, index) => 
        processProvider(provider, sideB.selectedAgent, 'B', sideB.label, sideA.selectedProviders.length + index, promptToUse, nextRound)
      )
    ];
    
    await Promise.all(promises);
    
    // Record the debate continuation in the database
    try {
      const allResponses = results.map(r => ({
        provider: r.provider,
        response: r.response,
        latency: r.metrics.latency,
        tokens: r.metrics.tokens,
        success: !r.error,
        error: r.error
      }));
      
      const totalTokens = results.reduce((sum, r) => sum + r.metrics.tokens, 0);
      const totalTime = results.reduce((sum, r) => sum + r.metrics.latency, 0);
      
      await db.prompts.create({
        user_id: user.id,
        prompt: `${promptToUse} (Round ${nextRound})`,
        agent_type: 'debate',
        providers: [...sideA.selectedProviders, ...sideB.selectedProviders],
        responses: allResponses,
        execution_time: totalTime,
        tokens_used: totalTokens
      });
    } catch (dbError) {
      console.error('Failed to record debate continuation:', dbError);
      // Don't fail the request if recording fails
    }
    
    setIsLoading(false);
  };

  const exportDebate = async () => {
    if (results.length === 0 && debateHistory.length === 0) {
      toast.error('No debate to export');
      return;
    }
    
    // Compile the debate into markdown
    let markdown = `# AI Debate: ${improvedPrompt || prompt}\n\n`;
    
    // Add position labels
    markdown += `## Positions\n\n`;
    markdown += `- **${sideA.label}**\n`;
    markdown += `- **${sideB.label}**\n\n`;
    
    // Add debate history
    for (let i = 0; i < debateHistory.length; i++) {
      const round = debateHistory[i];
      markdown += `## Round ${round.round}\n\n`;
      markdown += `### ${sideA.label}\n\n${round.positionA}\n\n`;
      markdown += `### ${sideB.label}\n\n${round.positionB}\n\n`;
    }
    
    // Add current round if not in history
    if (results.length > 0) {
      const positionAResponses = results.filter(r => r.sideId === 'A' && !r.loading && !r.error);
      const positionBResponses = results.filter(r => r.sideId === 'B' && !r.loading && !r.error);
      
      if (positionAResponses.length > 0 || positionBResponses.length > 0) {
        markdown += `## Round ${debateRound}\n\n`;
        
        if (positionAResponses.length > 0) {
          markdown += `### ${sideA.label}\n\n${positionAResponses[0].response}\n\n`;
        }
        
        if (positionBResponses.length > 0) {
          markdown += `### ${sideB.label}\n\n${positionBResponses[0].response}\n\n`;
        }
      }
    }
    
    // Add metadata
    markdown += `## Debate Metadata\n\n`;
    markdown += `- **Date**: ${new Date().toLocaleDateString()}\n`;
    markdown += `- **Topic**: ${improvedPrompt || prompt}\n`;
    markdown += `- **Position A Providers**: ${sideA.selectedProviders.join(', ')}\n`;
    markdown += `- **Position B Providers**: ${sideB.selectedProviders.join(', ')}\n`;
    
    // Create a blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debate-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Debate exported successfully');
  };

  const copyDebateToClipboard = async () => {
    if (results.length === 0 && debateHistory.length === 0) {
      toast.error('No debate to copy');
      return;
    }
    
    // Compile the debate into markdown
    let markdown = `# AI Debate: ${improvedPrompt || prompt}\n\n`;
    
    // Add position labels
    markdown += `## Positions\n\n`;
    markdown += `- **${sideA.label}**\n`;
    markdown += `- **${sideB.label}**\n\n`;
    
    // Add debate history
    for (let i = 0; i < debateHistory.length; i++) {
      const round = debateHistory[i];
      markdown += `## Round ${round.round}\n\n`;
      markdown += `### ${sideA.label}\n\n${round.positionA}\n\n`;
      markdown += `### ${sideB.label}\n\n${round.positionB}\n\n`;
    }
    
    // Add current round if not in history
    if (results.length > 0) {
      const positionAResponses = results.filter(r => r.sideId === 'A' && !r.loading && !r.error);
      const positionBResponses = results.filter(r => r.sideId === 'B' && !r.loading && !r.error);
      
      if (positionAResponses.length > 0 || positionBResponses.length > 0) {
        markdown += `## Round ${debateRound}\n\n`;
        
        if (positionAResponses.length > 0) {
          markdown += `### ${sideA.label}\n\n${positionAResponses[0].response}\n\n`;
        }
        
        if (positionBResponses.length > 0) {
          markdown += `### ${sideB.label}\n\n${positionBResponses[0].response}\n\n`;
        }
      }
    }
    
    try {
      await navigator.clipboard.writeText(markdown);
      setCopiedText('debate');
      toast.success('Debate copied to clipboard');
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
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
            {/* Position A Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                  A
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Position A Configuration</h3>
                  <input
                    type="text"
                    value={sideA.label}
                    onChange={(e) => setSideA({ ...sideA, label: e.target.value })}
                    placeholder="Position A Label"
                    className="mt-1 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Position A Providers */}
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

              {/* Position A Agent */}
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

            {/* Position B Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-2">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                  B
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Position B Configuration</h3>
                  <input
                    type="text"
                    value={sideB.label}
                    onChange={(e) => setSideB({ ...sideB, label: e.target.value })}
                    placeholder="Position B Label"
                    className="mt-1 px-3 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Position B Providers */}
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

              {/* Position B Agent */}
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

        {/* Prompt Packs */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Select Prompt Pack
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {PROMPT_PACKS.map(pack => (
              <button
                key={pack.id}
                onClick={() => setSelectedPack(pack.id === selectedPack ? '' : pack.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedPack === pack.id
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <h4 className="font-medium text-neutral-900 dark:text-white mb-1">
                  {pack.name}
                </h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {pack.topics.length} debate topics
                </p>
              </button>
            ))}
          </div>
          
          {selectedPack && (
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-neutral-900 dark:text-white mb-3">
                Select a Topic
              </h4>
              <div className="space-y-2">
                {PROMPT_PACKS.find(p => p.id === selectedPack)?.topics.map((topic, index) => (
                  <button
                    key={index}
                    onClick={() => handleTopicSelect(topic)}
                    className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <p className="text-neutral-800 dark:text-neutral-200">{topic}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Prompt Input */}
        <form onSubmit={handlePromptSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Debate Topic
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
        <div className="space-y-6">
          {/* Debate Controls */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Round:</span>
                  <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-full text-sm font-bold">
                    {debateRound}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Active Position:</span>
                  <button
                    onClick={togglePosition}
                    className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${
                      activePosition === 'A'
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                    }`}
                  >
                    {activePosition === 'A' ? sideA.label : sideB.label}
                  </button>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={continueDebate}
                  disabled={isLoading || results.some(r => r.loading)}
                  className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Continue Debate</span>
                </button>
                
                <div className="relative group">
                  <button
                    className="flex items-center space-x-2 px-3 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>
                  
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="p-1">
                      <button
                        onClick={exportDebate}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download as Markdown</span>
                      </button>
                      <button
                        onClick={copyDebateToClipboard}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
                      >
                        {copiedText === 'debate' ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy to Clipboard</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Debate History */}
          {debateHistory.length > 0 && (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
                Debate History
              </h3>
              
              <div className="space-y-6">
                {debateHistory.map((round, index) => (
                  <div key={index} className="border-b border-neutral-200 dark:border-neutral-700 pb-6 last:border-0 last:pb-0">
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-3">
                      Round {round.round}
                    </h4>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <h5 className="font-medium text-orange-900 dark:text-orange-100 mb-2">
                          {sideA.label}
                        </h5>
                        <div className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-wrap">
                          {round.positionA}
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                          {sideB.label}
                        </h5>
                        <div className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                          {round.positionB}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Current Round Results */}
          <ResponseComparison results={results} isDebateMode={true} />
        </div>
      )}
    </div>
  );
}