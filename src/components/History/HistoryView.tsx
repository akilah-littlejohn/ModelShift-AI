import React, { useState } from 'react';
import { Clock, Eye, Trash2, Search, Filter, Download } from 'lucide-react';
import { AgentService } from '../../lib/agents';
import { providers } from '../../data/providers';

const mockHistory = [
  {
    id: '1',
    prompt: 'Generate business names for an AI-powered fitness app',
    agent_type: 'business-name',
    providers: ['openai', 'claude'],
    responses: [
      { provider: 'openai', response: 'FitAI, SmartFit Pro, AI Trainer...', success: true, latency: 1200, tokens: 150 },
      { provider: 'claude', response: 'IntelliGym, AI Fitness Coach, Neural Fit...', success: true, latency: 980, tokens: 145 }
    ],
    created_at: '2024-01-07T10:30:00Z',
    execution_time: 1200,
    tokens_used: 295
  },
  {
    id: '2',
    prompt: 'Create a pitch for project management SaaS',
    agent_type: 'saas-pitch',
    providers: ['gemini', 'ibm'],
    responses: [
      { provider: 'gemini', response: 'Introducing TaskFlow: The intelligent project...', success: true, latency: 1450, tokens: 380 },
      { provider: 'ibm', response: 'Revolutionary project management platform...', success: false, latency: 2100, tokens: 0 }
    ],
    created_at: '2024-01-07T09:15:00Z',
    execution_time: 2100,
    tokens_used: 380
  },
  {
    id: '3',
    prompt: 'User cannot access dashboard after login',
    agent_type: 'support-summarizer',
    providers: ['openai'],
    responses: [
      { provider: 'openai', response: 'Technical Issue - High Priority\nSummary: Dashboard access...', success: true, latency: 890, tokens: 95 }
    ],
    created_at: '2024-01-06T16:45:00Z',
    execution_time: 890,
    tokens_used: 95
  }
];

export function HistoryView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);

  const agents = AgentService.getAllAgents();

  const filteredHistory = mockHistory.filter(execution => {
    const matchesSearch = execution.prompt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = !selectedAgent || execution.agent_type === selectedAgent;
    const matchesProvider = !selectedProvider || execution.providers.includes(selectedProvider);
    
    return matchesSearch && matchesAgent && matchesProvider;
  });

  const getAgentInfo = (agentId: string) => {
    return AgentService.getAgent(agentId);
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(provider => provider.id === providerId);
  };

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

      {/* Filters */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          {/* Export Button */}
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No Executions Found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              {searchTerm || selectedAgent || selectedProvider 
                ? 'Try adjusting your filters'
                : 'Start using the playground to see your execution history here'
              }
            </p>
          </div>
        ) : (
          filteredHistory.map((execution) => {
            const agentInfo = getAgentInfo(execution.agent_type);
            const isExpanded = selectedExecution === execution.id;

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
                      </div>
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
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
                          {execution.tokens_used} tokens
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
                      Responses
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
                                  ? 'bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                              }`}>
                                {response.success ? 'Success' : 'Failed'}
                              </div>
                            </div>
                            
                            {response.success ? (
                              <div className="text-sm text-neutral-700 dark:text-neutral-300 mb-3 line-clamp-3">
                                {response.response}
                              </div>
                            ) : (
                              <div className="text-sm text-red-600 dark:text-red-400 mb-3">
                                Request failed
                              </div>
                            )}

                            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                              <span>{response.latency}ms</span>
                              <span>{response.tokens} tokens</span>
                            </div>
                          </div>
                        );
                      })}
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