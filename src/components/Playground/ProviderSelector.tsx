import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, RefreshCw } from 'lucide-react';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';
import { ProxyService } from '../../lib/api/ProxyService';
import { useAuth } from '../../contexts/AuthContext';
import type { Provider } from '../../types';

interface ProviderSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  userApiKeys?: Record<string, boolean>;
  singleSelect?: boolean; // New prop for single selection mode
}

export function ProviderSelector({ selected, onChange, userApiKeys, singleSelect = false }: ProviderSelectorProps) {
  const { user } = useAuth();
  const [customProviders, setCustomProviders] = useState<Provider[]>([]);
  const [proxyHealth, setProxyHealth] = useState<{
    available: boolean;
    configuredProviders: string[];
    errors: string[];
  } | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [connectionMode, setConnectionMode] = useState(() => 
    localStorage.getItem('modelshift-connection-mode') || 'server'
  );

  useEffect(() => {
    loadCustomProviders();
    checkServerHealth();

    // Listen for connection mode changes
    const handleStorageChange = () => {
      const newMode = localStorage.getItem('modelshift-connection-mode') || 'server';
      if (newMode !== connectionMode) {
        setConnectionMode(newMode);
        checkServerHealth();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Re-check server health when connection mode changes
  useEffect(() => {
    checkServerHealth();
  }, [connectionMode]);

  const loadCustomProviders = () => {
    try {
      const stored = localStorage.getItem('modelshift-custom-providers');
      if (stored) {
        const customProvs = JSON.parse(stored);
        setCustomProviders(customProvs);
      }
    } catch (error) {
      console.error('Failed to load custom providers:', error);
    }
  };

  const checkServerHealth = async () => {
    // Only check health in server mode
    if (connectionMode !== 'server') {
      setProxyHealth(null);
      return;
    }

    setIsCheckingHealth(true);
    try {
      const health = await ProxyService.checkProxyHealth();
      setProxyHealth({
        available: health.available,
        configuredProviders: health.configuredProviders,
        errors: health.errors
      });
      console.log('Server health check result:', health);
    } catch (error) {
      console.error('Failed to check server health:', error);
      setProxyHealth({
        available: false,
        configuredProviders: [],
        errors: ['Health check failed']
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const toggleProvider = (providerId: string) => {
    if (singleSelect) {
      // Single selection mode
      if (selected.includes(providerId)) {
        // If already selected, deselect it
        onChange([]);
      } else {
        // If not selected, make it the only selected item
        onChange([providerId]);
      }
    } else {
      // Multi-selection mode (original behavior)
      if (selected.includes(providerId)) {
        onChange(selected.filter(id => id !== providerId));
      } else {
        onChange([...selected, providerId]);
      }
    }
  };

  const hasValidCredentials = (providerId: string): boolean => {
    // In browser mode, check if the user has a key for this provider
    if (connectionMode === 'browser') {
      const keyData = keyVault.retrieveDefault(providerId);
      if (!keyData) {
        return false;
      }

      const allProviders = [...providers, ...customProviders];
      const provider = allProviders.find(p => p.id === providerId);
      if (!provider) return false;

      // Check if all required fields are present
      return provider.keyRequirements
        .filter(req => req.required)
        .every(req => keyData[req.name] && keyData[req.name].trim().length > 0);
    }
    
    // In server mode, we don't need to check for credentials
    // The server will handle this and use the user's stored API keys
    return true;
  };

  // Combine built-in and custom providers
  const allProviders = [...providers, ...customProviders];

  // Get status message for server health
  const getServerStatusMessage = () => {
    if (isCheckingHealth) return 'Checking server...';
    if (!proxyHealth) return 'Server status unknown';
    
    if (proxyHealth.available) {
      if (proxyHealth.errors.length > 0) {
        return 'Server connected (with warnings)';
      }
      return 'Server connected';
    }
    
    return 'Server unavailable';
  };

  const getServerStatusColor = () => {
    if (isCheckingHealth) return 'bg-blue-500';
    if (!proxyHealth) return 'bg-gray-500';
    
    if (proxyHealth.available) {
      if (proxyHealth.errors.length > 0) {
        return 'bg-yellow-500';
      }
      return 'bg-green-500';
    }
    
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Server Health Status (only show in server mode) */}
      {connectionMode === 'server' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${getServerStatusColor()}`}></div>
            <span className="text-neutral-600 dark:text-neutral-400">
              {getServerStatusMessage()}
            </span>
          </div>
          <button 
            onClick={checkServerHealth}
            disabled={isCheckingHealth}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center space-x-1"
          >
            {isCheckingHealth ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Show errors/warnings if any */}
      {connectionMode === 'server' && proxyHealth?.errors && proxyHealth.errors.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              {proxyHealth.errors.map((error, index) => (
                <div key={index} className="mb-1 last:mb-0">
                  {error}
                </div>
              ))}
              {proxyHealth.errors.some(error => error.includes('Edge Function not found')) && (
                <div className="mt-2 text-xs">
                  <a 
                    href="/docs/EDGE_FUNCTION_DEPLOYMENT.md" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary-600 dark:text-primary-400 hover:underline"
                  >
                    View Edge Function Deployment Instructions
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {allProviders.map((provider) => {
          const isSelected = selected.includes(provider.id);
          const hasCredentials = hasValidCredentials(provider.id);
          const isCustom = customProviders.some(p => p.id === provider.id);
          const isDisabled = false; // In BYOK, we don't disable providers
          
          return (
            <div
              key={provider.id}
              onClick={() => !isDisabled && toggleProvider(provider.id)}
              className={`relative p-4 border-2 rounded-lg transition-all duration-200 ${
                isDisabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
              } ${
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
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        {provider.displayName}
                      </h4>
                      {isCustom && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Max: {provider.capabilities.maxTokens} tokens
                    </p>
                  </div>
                </div>

                {/* API Key Status */}
                <div className="flex items-center space-x-2 mb-2">
                  {hasCredentials ? (
                    <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>API Key Available</span>
                    </div>
                  ) : connectionMode === 'browser' ? (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Add API Key in Settings</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>API Key Required</span>
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
    </div>
  );
}