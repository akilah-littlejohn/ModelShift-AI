import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { ProxyService } from '../../lib/api/ProxyService';
import { AgentService } from '../../lib/agents';
import { db } from '../../lib/supabase';
import type { MessageType } from './types';

export function PlaygroundView() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [selectedParameters, setSelectedParameters] = useState({ maxOutputTokens: 256 });
  const [selectedAgent, setSelectedAgent] = useState<{ id: string } | null>(null);
  const [connectionMode, setConnectionMode] = useState('server');

  // Load connection mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('modelshift-connection-mode');
    if (savedMode) {
      setConnectionMode(savedMode);
    }
  }, []);

  const executeProviderRequest = async (prompt: string) => {
    if (!user?.id) {
      toast.error('You must be logged in to use the playground.');
      return;
    }
    setIsLoading(true);

    try {
      // Start tracking execution time
      const startTime = Date.now();
      
      // Process the prompt through the agent if selected
      let finalPrompt = prompt;
      if (selectedAgent?.id) {
        try {
          finalPrompt = AgentService.buildPrompt(selectedAgent.id, prompt);
        } catch (error) {
          console.error('Error building prompt with agent:', error);
          // Fall back to original prompt
        }
      }

      // Use the ProxyService to handle the request based on connection mode
      const response = await ProxyService.callProvider({
        providerId: selectedProvider,
        prompt: finalPrompt,
        model: selectedModel,
        parameters: selectedParameters,
        agentId: selectedAgent?.id || null,
        userId: user.id,
        useUserKey: connectionMode === 'browser', // Use user key in browser mode
      });

      if (!response.success) {
        throw new Error(response.error || 'Request failed');
      }

      // Calculate execution time
      const executionTime = Date.now() - startTime;
      
      // Add response to messages
      setMessages((msgs) => [...msgs, { role: 'assistant', text: response.response || '' }]);
      
      // Record execution in database
      try {
        await db.prompts.create({
          user_id: user.id,
          prompt: finalPrompt,
          agent_type: selectedAgent?.id || 'direct',
          providers: [selectedProvider],
          responses: [{
            provider: selectedProvider,
            response: response.response || '',
            latency: response.metrics?.latency || executionTime,
            tokens: response.metrics?.tokens || Math.ceil((finalPrompt.length + (response.response?.length || 0)) / 4),
            success: true
          }],
          execution_time: executionTime,
          tokens_used: response.metrics?.tokens || Math.ceil((finalPrompt.length + (response.response?.length || 0)) / 4)
        });
      } catch (dbError) {
        console.error('Failed to record execution in database:', dbError);
        // Don't fail the request if recording fails
      }
      
    } catch (err: any) {
      console.error('Proxy request failed:', err);
      toast.error(`Request failed: ${err.message}`);
      
      // Record failed execution
      if (user?.id) {
        try {
          const executionTime = Date.now() - Date.now(); // 0 for failed requests
          await db.prompts.create({
            user_id: user.id,
            prompt: prompt,
            agent_type: selectedAgent?.id || 'direct',
            providers: [selectedProvider],
            responses: [{
              provider: selectedProvider,
              response: '',
              latency: 0,
              tokens: 0,
              success: false,
              error: err.message
            }],
            execution_time: executionTime,
            tokens_used: 0
          });
        } catch (dbError) {
          console.error('Failed to record failed execution:', dbError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', text: input }]);
    executeProviderRequest(input);
    setInput('');
  };

  return (
    <div className="playground p-4 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="w-full md:w-1/2">
          <h3 className="text-lg font-medium mb-2">Select Provider</h3>
          <ProviderSelector 
            selected={[selectedProvider]} 
            onChange={(providers) => setSelectedProvider(providers[0])} 
          />
        </div>
        <div className="w-full md:w-1/2">
          <h3 className="text-lg font-medium mb-2">Select Agent</h3>
          <AgentSelector 
            selected={selectedAgent?.id || ''} 
            onChange={(agentId) => setSelectedAgent(agentId ? { id: agentId } : null)} 
          />
        </div>
      </div>

      {/* Connection Mode Indicator */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 mb-6">
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
              setActiveTab('connection');
            }}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Change in Settings
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 mb-6 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <p>No messages yet. Start a conversation by sending a prompt.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div 
                key={i} 
                className={`p-3 rounded-lg ${
                  m.role === 'user' 
                    ? 'bg-primary-100 dark:bg-primary-900/30 ml-8' 
                    : 'bg-neutral-100 dark:bg-neutral-700 mr-8'
                }`}
              >
                <div className="text-sm font-medium mb-1">
                  {m.role === 'user' ? 'You' : 'AI Assistant'}
                </div>
                <div className="text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap">
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          className="flex-grow border border-neutral-300 dark:border-neutral-600 rounded-l-lg px-4 py-2 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
          placeholder="Type your prompt here..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary-600 text-white px-6 py-2 rounded-r-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );

  function setActiveTab(tab: string) {
    // This function is used to navigate to the settings page with the connection tab active
    window.location.href = '/settings';
  }
}