import React, { useState } from 'react';
import { X, Edit, Play, Copy, Check, Bot } from 'lucide-react';
import type { Agent } from '../../types';
import toast from 'react-hot-toast';

interface AgentPreviewProps {
  agent: Agent;
  onClose: () => void;
  onEdit: () => void;
}

export function AgentPreview({ agent, onClose, onEdit }: AgentPreviewProps) {
  const [testInput, setTestInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const generatePrompt = () => {
    if (!testInput.trim()) {
      toast.error('Please enter some test input');
      return;
    }

    const prompt = agent.promptTemplate.replace(/\{input\}/g, testInput);
    setGeneratedPrompt(prompt);
  };

  const copyPrompt = async () => {
    if (!generatedPrompt) {
      toast.error('Generate a prompt first');
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopiedPrompt(true);
      toast.success('Prompt copied to clipboard');
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (error) {
      toast.error('Failed to copy prompt');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {agent.name}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 rounded-full text-xs font-medium">
                    {agent.category}
                  </span>
                  {agent.isCustom && (
                    <span className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-xs font-medium">
                      Custom
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onEdit}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
              Description
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
              {agent.description}
            </p>
          </div>

          {/* Examples */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
              Example Use Cases
            </h3>
            <div className="space-y-2">
              {agent.examples.map((example, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
                  <div className="w-6 h-6 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-600 dark:text-secondary-400 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
                    "{example}"
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Prompt Template */}
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
              Prompt Template
            </h3>
            <div className="bg-neutral-900 rounded-lg p-4">
              <pre className="text-sm text-neutral-100 whitespace-pre-wrap overflow-x-auto">
                {agent.promptTemplate}
              </pre>
            </div>
          </div>

          {/* Interactive Testing */}
          <div className="bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
              Test This Prompt Agent
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Your Input
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter your request or question..."
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                />
                <button
                  onClick={generatePrompt}
                  disabled={!testInput.trim()}
                  className="mt-3 flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Play className="w-4 h-4" />
                  <span>Generate Prompt</span>
                </button>
              </div>

              {/* Output */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Generated Prompt
                  </label>
                  {generatedPrompt && (
                    <button
                      onClick={copyPrompt}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                    >
                      {copiedPrompt ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedPrompt ? 'Copied!' : 'Copy'}</span>
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg p-3 h-32 overflow-y-auto">
                  {generatedPrompt ? (
                    <pre className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {generatedPrompt}
                    </pre>
                  ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
                      Generated prompt will appear here after you click "Generate Prompt"
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}