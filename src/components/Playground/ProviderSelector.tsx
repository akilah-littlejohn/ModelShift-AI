import React from 'react';
import { Check, AlertCircle } from 'lucide-react';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';

interface ProviderSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ProviderSelector({ selected, onChange }: ProviderSelectorProps) {
  const toggleProvider = (providerId: string) => {
    if (selected.includes(providerId)) {
      onChange(selected.filter(id => id !== providerId));
    } else {
      onChange([...selected, providerId]);
    }
  };

  const hasValidCredentials = (providerId: string): boolean => {
    const keyData = keyVault.retrieve(providerId);
    if (!keyData) return false;

    const provider = providers.find(p => p.id === providerId);
    if (!provider) return false;

    // Check if all required fields are present
    return provider.keyRequirements
      .filter(req => req.required)
      .every(req => keyData[req.name] && keyData[req.name].trim().length > 0);
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {providers.map((provider) => {
        const isSelected = selected.includes(provider.id);
        const hasCredentials = hasValidCredentials(provider.id);
        
        return (
          <div
            key={provider.id}
            onClick={() => toggleProvider(provider.id)}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            {/* Selection Indicator */}
            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'border-primary-500 bg-primary-500'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>

            {/* Provider Info */}
            <div className="pr-8">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-2xl">{provider.icon}</span>
                <div>
                  <h4 className="font-semibold text-neutral-900 dark:text-white">
                    {provider.displayName}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Max: {provider.capabilities.maxTokens} tokens
                  </p>
                </div>
              </div>

              {/* Credentials Status */}
              <div className="flex items-center space-x-2 mb-2">
                {hasCredentials ? (
                  <div className="flex items-center space-x-1 text-xs text-accent-600 dark:text-accent-400">
                    <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                    <span>Credentials Ready</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                    <AlertCircle className="w-3 h-3" />
                    <span>Credentials Missing</span>
                  </div>
                )}
              </div>

              {/* Required Fields Info */}
              {provider.keyRequirements.length > 1 && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  Requires: {provider.keyRequirements.map(req => req.label).join(', ')}
                </div>
              )}

              {/* Pricing */}
              <div className="text-xs text-neutral-500 dark:text-neutral-400">
                ${provider.capabilities.pricing.input}/1K input tokens
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}