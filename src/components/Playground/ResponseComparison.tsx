import React from 'react';
import { Clock, Zap, DollarSign, AlertCircle, Copy, Check, Swords } from 'lucide-react';
import { providers } from '../../data/providers';
import type { ComparisonResult } from '../../types';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface ResponseComparisonProps {
  results: ComparisonResult[];
  isDebateMode?: boolean;
}

export function ResponseComparison({ results, isDebateMode = false }: ResponseComparisonProps) {
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

  if (isDebateMode) {
    // Group results by side for debate mode
    const sideAResults = results.filter(r => r.sideId === 'A');
    const sideBResults = results.filter(r => r.sideId === 'B');

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <Swords className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
              Debate Results
            </h2>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            Side-by-side comparison of AI responses in debate format
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Side A Results */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                A
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {sideAResults[0]?.sideLabel || 'Side A'}
              </h3>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {sideAResults.length} provider{sideAResults.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {sideAResults.map((result, index) => (
              <DebateResponseCard
                key={`A-${index}`}
                result={result}
                index={index}
                onCopy={copyToClipboard}
                copied={copiedIndex === index}
                sideColor="orange"
              />
            ))}
          </div>

          {/* Side B Results */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                B
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                {sideBResults[0]?.sideLabel || 'Side B'}
              </h3>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {sideBResults.length} provider{sideBResults.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {sideBResults.map((result, index) => (
              <DebateResponseCard
                key={`B-${index}`}
                result={result}
                index={sideAResults.length + index}
                onCopy={copyToClipboard}
                copied={copiedIndex === (sideAResults.length + index)}
                sideColor="blue"
              />
            ))}
          </div>
        </div>

        {/* Debate Summary */}
        <div className="bg-gradient-to-r from-orange-50 via-neutral-50 to-blue-50 dark:from-orange-900/20 dark:via-neutral-900/50 dark:to-blue-900/20 rounded-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 text-center">
            Debate Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {sideAResults.filter(r => r.response && !r.loading && !r.error).length}/{sideAResults.length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Side A Success</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-neutral-600 dark:text-neutral-400">
                VS
              </div>
              <div className="text-sm text-neutral-500 dark:text-neutral-500">Comparison</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {sideBResults.filter(r => r.response && !r.loading && !r.error).length}/{sideBResults.length}
              </div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Side B Success</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard mode display
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

interface DebateResponseCardProps {
  result: ComparisonResult;
  index: number;
  onCopy: (text: string, index: number) => void;
  copied: boolean;
  sideColor: 'orange' | 'blue';
}

function DebateResponseCard({ result, index, onCopy, copied, sideColor }: DebateResponseCardProps) {
  const provider = providers.find(p => p.id === result.provider);
  if (!provider) return null;

  const colorClasses = {
    orange: {
      border: 'border-orange-200 dark:border-orange-800',
      bg: 'bg-orange-50 dark:bg-orange-900/10',
      header: 'from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20'
    },
    blue: {
      border: 'border-blue-200 dark:border-blue-800',
      bg: 'bg-blue-50 dark:bg-blue-900/10',
      header: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20'
    }
  };

  const colors = colorClasses[sideColor];

  return (
    <div className={`bg-white dark:bg-neutral-800 rounded-xl border-2 ${colors.border} overflow-hidden`}>
      {/* Provider Header */}
      <div className={`bg-gradient-to-r ${colors.header} px-4 py-3 border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{provider.icon}</span>
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white text-sm">
                {provider.displayName}
              </h4>
              <div className="flex items-center space-x-3 text-xs text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center space-x-1">
                  <Clock className="w-3 h-3" />
                  <span>{result.metrics.latency}ms</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>{result.metrics.tokens}</span>
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
              onClick={() => onCopy(result.response, index)}
              className="p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
              title="Copy response"
            >
              {copied ? (
                <Check className="w-3 h-3 text-accent-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Response Content */}
      <div className="p-4">
        {result.loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                Generating...
              </p>
            </div>
          </div>
        ) : result.error ? (
          <div className="flex items-start space-x-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-medium text-red-800 dark:text-red-200 text-sm mb-1">
                Error
              </h5>
              <p className="text-xs text-red-700 dark:text-red-300">
                {result.error}
              </p>
            </div>
          </div>
        ) : (
          <div className="prose prose-neutral dark:prose-invert max-w-none prose-sm">
            <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap text-sm">
              {result.response}
            </div>
          </div>
        )}
      </div>

      {/* Quality Indicators */}
      {result.response && !result.loading && !result.error && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
              <span className="text-neutral-500 dark:text-neutral-400">
                Complete
              </span>
            </div>
            
            <div className="text-neutral-400 dark:text-neutral-500">
              {result.response.length} chars
            </div>
          </div>
        </div>
      )}
    </div>
  );
}