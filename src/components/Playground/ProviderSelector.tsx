import React from 'react';
import { Check, AlertCircle, CheckCircle, Key } from 'lucide-react';
import { providers } from '../../data/providers';

interface ProviderSelectorProps {
  selectedProviders: string[];
  onProvidersChange: (providers: string[]) => void;
  multiSelect?: boolean;
  healthStatus?: {
    configuredProviders: string[];
    errors: string[];
  } | null;
}

export function ProviderSelector({ 
  selectedProviders, 
  onProvidersChange, 
  multiSelect = false,
  healthStatus 
}: ProviderSelectorProps) {
  const handleProviderToggle = (providerId: string) => {
    if (multiSelect) {
      if (selectedProviders.includes(providerId)) {
        onProvidersChange(selectedProviders.filter(id => id !== providerId));
      } else {
        onProvidersChange([...selectedProviders, providerId]);
      }
    } else {
      onProvidersChange([providerId]);
    }
  };

  const isProviderConfigured = (providerId: string): boolean => {
    return healthStatus?.configuredProviders.includes(providerId) || false;
  };

  const getProviderStatus = (providerId: string): 'configured' | 'user-key-required' | 'unknown' => {
    if (isProviderConfigured(providerId)) {
      return 'configured';
    }
    return 'user-key-required';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'configured':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'user-key-required':
        return <Key className="w-4 h-4 text-amber-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'configured':
        return 'Server key configured';
      case 'user-key-required':
        return 'User API key required';
      default:
        return 'Status unknown';
    }
  };

  return (
    <div className="space-y-3">
      {providers.map((provider) => {
        const isSelected = selectedProviders.includes(provider.id);
        const status = getProviderStatus(provider.id);
        
        return (
          <div
            key={provider.id}
            onClick={() => handleProviderToggle(provider.id)}
            className={`relative flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
              isSelected
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${provider.gradient} flex items-center justify-center`}>
                <span className="text-white text-sm font-bold">
                  {provider.name.charAt(0)}
                </span>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {provider.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusIcon(status)}
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {getStatusText(status)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {status === 'user-key-required' && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded">
                  API Key Needed
                </div>
              )}
              
              {isSelected && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        );
      })}
      
      {healthStatus && healthStatus.errors.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Configuration Notes
              </p>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                {healthStatus.errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Add your API keys in Settings → API Keys to use these providers
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}