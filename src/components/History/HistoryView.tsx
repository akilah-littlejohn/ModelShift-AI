import React, { useState, useEffect } from 'react';
import { Clock, Eye, Trash2, Search, Filter, Download, RefreshCw, AlertTriangle, Calendar, BarChart3 } from 'lucide-react';
import { AgentService } from '../../lib/agents';
import { providers } from '../../data/providers';
import { db } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { PromptExecution } from '../../types';
import toast from 'react-hot-toast';

export function HistoryView() {
  const { user } = useAuth();
  const [executions, setExecutions] = useState<PromptExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  const agents = AgentService.getAllAgents();

  // TEMPORARY: Create a mock user ID for development
  const mockUserId = 'dev-user-' + Math.random().toString(36).substring(2, 9);

  useEffect(() => {
    // Use real user ID or mock ID
    const userId = user?.id || mockUserId;
    if (userId) {
      loadExecutions(userId);
    }
  }, [user, timeRange]);

  const loadExecutions = async (userId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Check if Supabase is properly configured
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('demo') || supabaseKey.includes('demo')) {
        // For development without Supabase, return mock data
        console.log('Using mock execution history data');
        const mockData = generateMockExecutions(userId, 10);
        setExecutions(mockData);
        setIsLoading(false);
        return;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      try {
        const data = await db.prompts.getByUserId(userId, 100);
        
        // Filter by date range
        const filteredData = data.filter(execution => {
          const executionDate = new Date(execution.created_at);
          return executionDate >= startDate && executionDate <= endDate;
        });

        setExecutions(filteredData);
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Fall back to mock data for development
        const mockData = generateMockExecutions(userId, 10);
        setExecutions(mockData);
      }
    } catch (err) {
      console.error('Failed to load execution history:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('404') || err.message.includes('not found')) {
          setError('Database tables not found. Please run the Supabase migrations to set up the required tables.');
        } else if (err.message.includes('permission') || err.message.includes('RLS') || err.message.includes('policy')) {
          setError('Database permission error. Please check your Supabase Row Level Security policies.');
        } else if (err.message.includes('Invalid or missing')) {
          setError('Supabase configuration error. Please check your environment variables.');
        } else if (err.message.includes('network') || err.message.includes('fetch')) {
          setError('Network error. Please check your internet connection and Supabase URL.');
        } else {
          setError(`Database error: ${err.message}`);
        }
      } else {
        setError('An unknown error occurred while loading execution history.');
      }
      
      // For development, provide mock data even on error
      const mockData = generateMockExecutions(userId, 10);
      setExecutions(mockData);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock execution data for development
  const generateMockExecutions = (userId: string, count: number): PromptExecution[] => {
    const mockExecutions: PromptExecution[] = [];
    const providerIds = ['openai', 'gemini', 'claude', 'ibm'];
    const agentTypes = ['direct', 'business-writer', 'code-assistant', 'debate'];
    
    for (let i = 0; i < count; i++) {
      const providerId = providerIds[Math.floor(Math.random() * providerIds.length)];
      const agentType = agentTypes[Math.floor(Math.random() * agentTypes.length)];
      const success = Math.random() > 0.2; // 80% success rate
      const tokens = Math.floor(Math.random() * 1000) + 100;
      const latency = Math.floor(Math.random() * 2000) + 500;
      
      mockExecutions.push({
        id: `mock-${i}-${Date.now()}`,
        user_id: userId,
        prompt: `Mock prompt ${i + 1} for testing the history view. This is a sample prompt that would be sent to the AI provider.`,
        agent_type: agentType,
        providers: [providerId],
        responses: [{
          provider: providerId,
          response: success ? `This is a mock response ${i + 1} from the AI provider. It would contain the generated text based on the prompt.` : '',
          latency,
          tokens,
          success,
          error: success ? undefined : 'Mock error for testing error handling'
        }],
        execution_time: latency,
        tokens_used: tokens,
        created_at: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return mockExecutions;
  };

  const deleteExecution = async (executionId: string) => {
    if (!window.confirm('Are you sure you want to delete this execution?')) {
      return;
    }

    try {
      if (user?.id) {
        // Real delete for authenticated users
        await db.prompts.deleteById(user.id, executionId);
      }
      
      // Update local state regardless
      setExecutions(executions.filter(exec => exec.id !== executionId));
      toast.success('Execution deleted successfully');
    } catch (error) {
      console.error('Failed to delete execution:', error);
      toast.error('Failed to delete execution');
    }
  };

  const exportExecutions = () => {
    const dataToExport = filteredExecutions.map(execution => ({
      id: execution.id,
      prompt: execution.prompt,
      agent_type: execution.agent_type,
      providers: execution.providers,
      responses: execution.responses,
      execution_time: execution.execution_time,
      tokens_used: execution.tokens_used,
      created_at: execution.created_at
    }));

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modelshift-executions-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Execution history exported successfully');
  };

  const filteredExecutions = executions.filter(execution => {
    const matchesSearch = execution.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = !selectedAgent || execution.agent_type === selectedAgent;
    const matchesProvider = !selectedProvider || execution.providers.includes(selectedProvider);
    
    return matchesSearch && matchesAgent && matchesProvider;
  });

  const getAgentInfo = (agentId: string) => {
    if (agentId === 'direct') return { name: 'Direct Input', category: 'Direct' };
    return AgentService.getAgent(agentId);
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(provider => provider.id === providerId);
  };

  const calculateTotalCost = (execution: PromptExecution): number => {
    return execution.responses.reduce((total, response) => {
      const provider = getProviderInfo(response.provider);
      if (provider && response.tokens > 0) {
        return total + (response.tokens * provider.capabilities.pricing.output) / 1000;
      }
      return total;
    }, 0);
  };

  const getSuccessRate = (execution: PromptExecution): number => {
    const successfulResponses = execution.responses.filter(r => r.success).length;
    return execution.responses.length > 0 ? (successfulResponses / execution.responses.length) * 100 : 0;
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Execution History
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            View and analyze your previous AI prompt executions
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">Loading execution history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
            Execution History
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            View and analyze your previous AI prompt executions
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
                Error Loading Execution History
              </h3>
              <p className="text-red-700 dark:text-red-300 mb-4">
                {error}
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => loadExecutions(user?.id || mockUserId)}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Execution History
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          View and analyze your previous AI prompt executions
        </p>
      </div>

      {/* Summary Stats */}
      {executions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Executions</h3>
              <BarChart3 className="w-5 h-5 text-primary-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {filteredExecutions.length}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total Tokens</h3>
              <Clock className="w-5 h-5 text-secondary-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {filteredExecutions.reduce((sum, exec) => sum + exec.tokens_used, 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Avg Response Time</h3>
              <Clock className="w-5 h-5 text-accent-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {filteredExecutions.length > 0 
                ? Math.round(filteredExecutions.reduce((sum, exec) => sum + exec.execution_time, 0) / filteredExecutions.length)
                : 0}ms
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Success Rate</h3>
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-white">
              {filteredExecutions.length > 0 
                ? Math.round(filteredExecutions.reduce((sum, exec) => sum + getSuccessRate(exec), 0) / filteredExecutions.length)
                : 0}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Time Range */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Agent Filter */}
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          >
            <option value="">All Agents</option>
            <option value="direct">Direct Input</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>

          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          >
            <option value="">All Providers</option>
            {providers.map(provider => (
              <option key={provider.id} value={provider.id}>{provider.displayName}</option>
            ))}
          </select>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadExecutions(user?.id || mockUserId)}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportExecutions}
              disabled={filteredExecutions.length === 0}
              className="flex items-center space-x-2 px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredExecutions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              {executions.length === 0 ? 'No Executions Found' : 'No Executions Match Filters'}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {executions.length === 0 
                ? 'Start using the playground to see your execution history here'
                : 'Try adjusting your filters or search criteria'
              }
            </p>
          </div>
        ) : (
          filteredExecutions.map((execution) => {
            const agentInfo = getAgentInfo(execution.agent_type);
            const isExpanded = selectedExecution === execution.id;
            const totalCost = calculateTotalCost(execution);
            const successRate = getSuccessRate(execution);

            return (
              <div
                key={execution.id}
                className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
              >
                {/* Execution Header */}
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {agentInfo && (
                          <span className="px-3 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 rounded-full text-sm font-medium">
                            {agentInfo.name}
                          </span>
                        )}
                        <span className="text-sm text-neutral-500 dark:text-neutral-400">
                          {new Date(execution.created_at).toLocaleString()}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          successRate === 100 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : successRate > 50
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {successRate}% success
                        </span>
                      </div>
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2 line-clamp-2">
                        {execution.prompt}
                      </h3>
                      
                      {/* Providers Used */}
                      <div className="flex items-center space-x-2 mb-3">
                        {execution.providers.map(providerId => {
                          const providerInfo = getProviderInfo(providerId);
                          return providerInfo ? (
                            <div key={providerId} className="flex items-center space-x-1 px-2 py-1 bg-neutral-100 dark:bg-neutral-700 rounded-full text-xs">
                              <span>{providerInfo.icon}</span>
                              <span className="text-neutral-600 dark:text-neutral-400">{providerInfo.displayName}</span>
                            </div>
                          ) : null;
                        })}
                      </div>

                      {/* Metrics */}
                      <div className="flex items-center space-x-6 text-sm text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{execution.execution_time}ms</span>
                        </div>
                        <div>
                          {execution.tokens_used.toLocaleString()} tokens
                        </div>
                        <div>
                          ${totalCost.toFixed(4)} cost
                        </div>
                        <div>
                          {execution.responses.filter(r => r.success).length}/{execution.responses.length} successful
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedExecution(isExpanded ? null : execution.id)}
                        className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                        title={isExpanded ? 'Collapse' : 'View details'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteExecution(execution.id)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete execution"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-6 bg-neutral-50 dark:bg-neutral-900/50">
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-4">
                      Provider Responses
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {execution.responses.map((response, index) => {
                        const providerInfo = getProviderInfo(response.provider);
                        
                        return (
                          <div
                            key={index}
                            className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                {providerInfo && (
                                  <>
                                    <span className="text-lg">{providerInfo.icon}</span>
                                    <span className="font-medium text-neutral-900 dark:text-white">
                                      {providerInfo.displayName}
                                    </span>
                                  </>
                                )}
                              </div>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                response.success
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {response.success ? 'Success' : 'Failed'}
                              </div>
                            </div>
                            
                            {response.success ? (
                              <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-3 max-h-32 overflow-y-auto">
                                <div className="whitespace-pre-wrap break-words">
                                  {response.response.length > 200 
                                    ? `${response.response.substring(0, 200)}...` 
                                    : response.response
                                  }
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-red-600 dark:text-red-400 mb-3">
                                {response.error || 'Request failed'}
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                              <span>{response.latency}ms</span>
                              <span>{response.tokens.toLocaleString()} tokens</span>
                              {providerInfo && (
                                <span>${((response.tokens * providerInfo.capabilities.pricing.output) / 1000).toFixed(4)}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Full Prompt */}
                    <div className="mt-6">
                      <h4 className="font-medium text-neutral-900 dark:text-white mb-2">
                        Full Prompt
                      </h4>
                      <div className="bg-neutral-900 rounded-lg p-4 max-h-40 overflow-y-auto">
                        <pre className="text-sm text-neutral-100 whitespace-pre-wrap">
                          {execution.prompt}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}