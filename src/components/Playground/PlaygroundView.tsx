import React, { useState, useContext } from 'react';
import toast from 'react-hot-toast';
import { AuthContext } from '../../contexts/AuthContext';
import { ProviderSelector } from './ProviderSelector';
import { AgentSelector } from './AgentSelector';
import { MessageType } from './types';

export function PlaygroundView() {
  const { user, session } = useContext(AuthContext);
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
        useUserKey: true
      };

      const res = await fetch('/functions/v1/ai-proxy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Proxy error occurred');
      }

      setMessages(m => [...m, { role: 'assistant', text: json.response }]);
    } catch (err: any) {
      console.error('Proxy request failed:', err);
      toast.error(`Request failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() === '') return;
    setMessages(m => [...m, { role: 'user', text: input }]);
    executeProviderRequest(input);
    setInput('');
  };

  return (
    <div className="playground">
      <div className="flex space-x-4 mb-4">
        <ProviderSelector
          value={selectedProvider}
          onChange={setSelectedProvider}
        />
        <AgentSelector
          value={selectedAgent}
          onChange={setSelectedAgent}
        />
      </div>
      <div className="messages mb-4">
        {messages.map((m, idx) => (
          <div key={idx} className={`message ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your prompt here..."
          className="flex-grow border rounded-l px-4 py-2"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary-600 text-white px-4 py-2 rounded-r"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  );
}
