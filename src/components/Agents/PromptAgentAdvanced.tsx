import React, { useState } from 'react';
import { Zap, RefreshCw, Check, X, Lightbulb } from 'lucide-react';
import { ProxyService } from '../../lib/api/ProxyService';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface PromptAgentAdvancedProps {
  onApplyImprovedPrompt: (improvedPrompt: string) => void;
}

export function PromptAgentAdvanced({ onApplyImprovedPrompt }: PromptAgentAdvancedProps) {
  const { user } = useAuth();
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [explanation, setExplanation] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [hasResult, setHasResult] = useState(false);

  // Get providers where the user has API keys
  const availableProviders = providers.filter(provider => {
    const keyData = keyVault.retrieveDefault(provider.id);
    return keyData && Object.keys(keyData).length > 0;
  });

  const handleImprove = async () => {
    if (!originalPrompt.trim()) {
      toast.error('Please enter a prompt to improve');
      return;
    }

    if (!selectedProvider) {
      toast.error('Please select an AI provider');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to use this feature');
      return;
    }

    setIsImproving(true);
    setImprovedPrompt('');
    setExplanation('');
    setHasResult(false);

    try {
      const improvementPrompt = `You are a prompt engineering expert. Please improve the following prompt for clarity, context, and effectiveness:

Original prompt:
"""
${originalPrompt}
"""

Please provide your response in the following format:
1. First, the improved prompt (without any introduction or explanation)
2. Then, after a line with three hyphens (---), explain what you changed and why.

Example:
Improved prompt text here...

---
Explanation of changes...`;

      const response = await ProxyService.callProvider({
        providerId: selectedProvider,
        prompt: improvementPrompt,
        userId: user.id,
        useUserKey: true // Use the user's own API key
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to improve prompt');
      }

      // Parse the response to separate the improved prompt from the explanation
      const parts = response.response?.split('---') || [];
      
      if (parts.length >= 2) {
        const improved = parts[0].trim();
        const explain = parts.slice(1).join('---').trim();
        
        setImprovedPrompt(improved);
        setExplanation(explain);
      } else {
        // If the response doesn't follow the format, use it as is
        setImprovedPrompt(response.response || '');
        setExplanation('No explanation provided.');
      }

      setHasResult(true);
      toast.success('Prompt improved successfully!');
    } catch (error) {
      console.error('Error improving prompt:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to improve prompt');
    } finally {
      setIsImproving(false);
    }
  };

  const handleApply = () => {
    if (improvedPrompt) {
      onApplyImprovedPrompt(improvedPrompt);
      toast.success('Improved prompt applied!');
    }
  };

  const handleTryAgain = () => {
    setHasResult(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-2">
        <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Improve My Prompt
        </h3>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How It Works
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Enter your prompt below and select an AI provider to get suggestions for improving it. 
              The AI will analyze your prompt and suggest improvements for clarity, context, and effectiveness.
            </p>
          </div>
        </div>
      </div>

      {!hasResult ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Your Prompt
            </label>
            <textarea
              value={originalPrompt}
              onChange={(e) => setOriginalPrompt(e.target.value)}
              placeholder="Enter your prompt here to get improvement suggestions..."
              rows={5}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Select AI Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableProviders.length === 0 ? (
                <div className="col-span-full p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    No API keys found. Please add API keys in the API Keys section to use this feature.
                  </p>
                </div>
              ) : (
                availableProviders.map((provider) => (
                  <div
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedProvider === provider.id
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{provider.icon}</span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">
                        {provider.displayName}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleImprove}
              disabled={isImproving || !originalPrompt.trim() || !selectedProvider || availableProviders.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isImproving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Improving...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Improve Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Improved Prompt
            </label>
            <textarea
              value={improvedPrompt}
              onChange={(e) => setImprovedPrompt(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Explanation
            </label>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                {explanation}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={handleTryAgain}
              className="flex items-center space-x-2 px-4 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <button
              onClick={handleApply}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Apply Improved Prompt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}