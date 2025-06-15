import React from 'react';
import { Clock, Zap, DollarSign, AlertCircle, Copy, Check } from 'lucide-react';
import { providers } from '../../data/providers';
import type { ComparisonResult } from '../../types';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ResponseComparisonProps {
  results: ComparisonResult[];
}

export function ResponseComparison({ results }: ResponseComparisonProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      toast.success('Response copied to clipboard');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
          Response Comparison
        </h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Side-by-side comparison of AI responses
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {results.map((result, index) => {
          const provider = providers.find(p => p.id === result.provider);
          if (!provider) return null;

          return (
            <div
              key={result.provider}
              className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
            >
              {/* Provider Header */}
              <div className="bg-gradient-to-r from-neutral-50 to-neutral-100 dark:from-neutral-700 dark:to-neutral-800 px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <h3 className="font-semibold text-neutral-900 dark:text-white">
                        {provider.displayName}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-neutral-500 dark:text-neutral-400">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{result.metrics.latency}ms</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>{result.metrics.tokens} tokens</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <DollarSign className="w-3 h-3" />
                          <span>${result.metrics.cost.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Copy Button */}
                  {result.response && !result.loading && (
                    <button
                      onClick={() => copyToClipboard(result.response, index)}
                      className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-accent-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Response Content */}
              <div className="p-6">
                {result.loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-neutral-500 dark:text-neutral-400">
                        Generating response...
                      </p>
                    </div>
                  </div>
                ) : result.error ? (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                        Error
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {result.error}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-neutral dark:prose-invert max-w-none">
                    <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                      {result.response}
                    </div>
                  </div>
                )}
              </div>

              {/* Quality Indicators */}
              {result.response && !result.loading && !result.error && (
                <div className="px-6 pb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                        <span className="text-neutral-500 dark:text-neutral-400">
                          Response generated
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-neutral-400 dark:text-neutral-500">
                      {result.response.length} characters
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}