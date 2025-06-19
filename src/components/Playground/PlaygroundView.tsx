import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import type { MessageType } from './types';

export function PlaygroundView() {
  const { user, session } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('gemini');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [selectedParameters, setSelectedParameters] = useState({ maxOutputTokens: 256 });
  const [selectedAgent, setSelectedAgent] = useState<{ id: string } | null>(null);

  const executeProviderRequest = async (prompt: string) => {
    if (!user?.id || !session?.access_token) {
      toast.error('You must be logged in to use the playground.');
      return;
    }
    setIsLoading(true);

    try {
      const body = {
        providerId: selectedProvider,
        prompt,
        model: selectedModel,
        parameters: selectedParameters,
        agentId: selectedAgent?.id || null,
        userId: user.id,
        useUserKey: true,
      };

      // Use the correct endpoint URL for your Supabase Edge Function
      // This should match the actual deployed function path in your Bolt project
      const proxyUrl = import.meta.env.VITE_SUPABASE_URL 
        ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`
        : '/api/ai-proxy'; // Fallback for local development

      console.log('Making proxy request to:', proxyUrl);

      const res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      // Clone the response to inspect the raw text if needed
      const resClone = res.clone();
      
      if (!res.ok) {
        // Get the raw text to see what's actually being returned
        const errorText = await resClone.text();
        console.error('Proxy error response:', {
          status: res.status,
          statusText: res.statusText,
          body: errorText
        });
        
        // Try to parse as JSON if possible
        let errorJson;
        try {
          errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || `Proxy error: ${res.status}`);
        } catch (parseError) {
          // If not JSON, use the raw text or status
          throw new Error(errorText || `Proxy error: ${res.status}`);
        }
      }

      // Safely parse JSON
      let json;
      try {
        json = await res.json();
      } catch (parseError) {
        const rawText = await resClone.text();
        console.error('Failed to parse JSON response:', rawText);
        throw new Error('Invalid response format from server');
      }

      setMessages((msgs) => [...msgs, { role: 'assistant', text: json.response }]);
    } catch (err: any) {
      console.error('Proxy request failed:', err);
      toast.error(`Request failed: ${err.message}`);
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
}