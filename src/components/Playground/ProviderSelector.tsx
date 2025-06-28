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
        configuredProviders: health.configuredProviders
      });
      console.log('Server health check result:', health);
    } catch (error) {
      console.error('Failed to check server health:', error);
      setProxyHealth({
        available: false,
        configuredProviders: []
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
    // In browser mode, always allow selection - we'll prompt for API keys later if needed
    if (connectionMode === 'browser') {
      return true;
    }
    
    // In server mode, check if the provider is configured on the server
    if (connectionMode === 'server') {
      if (proxyHealth) {
        return proxyHealth.available && proxyHealth.configuredProviders.includes(providerId);
      }
      // If health check hasn't completed, assume available for better UX
      return true;
    }
    
    // Fallback - check for user API keys
    if (userApiKeys && userApiKeys[providerId]) {
      return true;
    }
    
    // Legacy key vault check
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
  };

  // Combine built-in and custom providers
  const allProviders = [...providers, ...customProviders];

  return (
    <div className="space-y-4">
      {/* Server Health Status (only show in server mode) */}
      {connectionMode === 'server' && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${proxyHealth?.available ? 'bg-green-500' : 'bg-amber-500'}`}></div>
            <span className="text-neutral-600 dark:text-neutral-400">
              {isCheckingHealth ? 'Checking server...' : 
               proxyHealth?.available ? 'Server connected' : 'Server unavailable'}
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

      <div className="grid grid-cols-2 gap-3">
        {allProviders.map((provider) => {
          const isSelected = selected.includes(provider.id);
          const hasUserKey = userApiKeys && userApiKeys[provider.id];
          const hasLegacyKey = hasValidCredentials(provider.id);
          const hasCredentials = hasUserKey || hasLegacyKey;
          const isCustom = customProviders.some(p => p.id === provider.id);
          // In browser mode, always enable selection
          const isDisabled = false;
          
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

                {/* Credentials Status */}
                <div className="flex items-center space-x-2 mb-2">
                  {hasUserKey ? (
                    <div className="flex items-center space-x-1 text-xs text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Your API Key</span>
                    </div>
                  ) : hasLegacyKey ? (
                    <div className="flex items-center space-x-1 text-xs text-accent-600 dark:text-accent-400">
                      <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                      <span>Legacy Key</span>
                    </div>
                  ) : connectionMode === 'server' && proxyHealth?.configuredProviders.includes(provider.id) ? (
                    <div className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Server Key</span>
                    </div>
                  ) : connectionMode === 'browser' ? (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>Add API Key in Settings</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-xs text-orange-600 dark:text-orange-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>No API Key</span>
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