import React, { useState, useEffect } from 'react';
import { Server, Globe, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { ProxyService } from '../../lib/api/ProxyService';
import toast from 'react-hot-toast';

export function ConnectionModeSettings() {
  const [connectionMode, setConnectionMode] = useState(() => {
    return localStorage.getItem('modelshift-connection-mode') || 'server';
  });
  const [proxyHealth, setProxyHealth] = useState<{
    available: boolean;
    authenticated: boolean;
    configuredProviders: string[];
    errors: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check proxy health on component mount
  useEffect(() => {
    checkProxyHealth();
  }, []);

  const checkProxyHealth = async () => {
    setIsLoading(true);
    try {
      const health = await ProxyService.checkProxyHealth();
      setProxyHealth(health);
    } catch (error) {
      console.error('Failed to check proxy health:', error);
      toast.error('Failed to check server connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setConnectionMode(mode);
    localStorage.setItem('modelshift-connection-mode', mode);
    toast.success(`Connection mode set to ${mode === 'server' ? 'Server Proxy' : 'Direct Browser'}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Connection Mode Settings
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Choose how ModelShift AI connects to AI providers
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <Server className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Connection Modes Explained
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Server Proxy Mode:</strong> API requests are routed through Supabase Edge Functions, keeping your API keys secure on the server. This is the recommended mode for production.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              <strong>Direct Browser Mode:</strong> API requests are made directly from your browser to the AI providers. This requires you to add your API keys in the API Keys section and may be subject to CORS limitations.
            </p>
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
            Server Connection Status
          </h2>
          <button
            onClick={checkProxyHealth}
            disabled={isLoading}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Checking...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Check Status</span>
              </>
            )}
          </button>
        </div>

        {proxyHealth ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${proxyHealth.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-neutral-900 dark:text-white">
                Server Proxy: {proxyHealth.available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${proxyHealth.authenticated ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-neutral-900 dark:text-white">
                Authentication: {proxyHealth.authenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>

            {proxyHealth.configuredProviders.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Configured Providers:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {proxyHealth.configuredProviders.map(provider => (
                    <span key={provider} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                      {provider}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {proxyHealth.errors.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Server Issues:
                </h3>
                <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 pl-5 list-disc">
                  {proxyHealth.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="text-neutral-500 dark:text-neutral-400 text-center py-4">
            Click "Check Status" to verify server connection
          </div>
        )}
      </div>

      {/* Connection Mode Selection */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">
          Select Connection Mode
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Server Proxy Mode */}
          <div 
            onClick={() => handleModeChange('server')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              connectionMode === 'server' 
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Server className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white">Server Proxy Mode</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Recommended for production</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              API requests are routed through secure Supabase Edge Functions. Your API keys remain on the server.
            </p>
            <div className="flex items-center space-x-2 text-xs">
              <div className={`w-2 h-2 rounded-full ${proxyHealth?.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={proxyHealth?.available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                {proxyHealth?.available ? 'Server available' : 'Server unavailable'}
              </span>
            </div>
          </div>

          {/* Direct Browser Mode */}
          <div 
            onClick={() => handleModeChange('browser')}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              connectionMode === 'browser' 
                ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/20' 
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-full flex items-center justify-center">
                <Globe className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 dark:text-white">Direct Browser Mode</h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">For development & testing</p>
              </div>
            </div>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              API requests are made directly from your browser. Requires API keys to be configured in the API Keys section.
            </p>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-amber-600 dark:text-amber-400">
                May be subject to CORS limitations
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-900/50 rounded-lg">
          <h3 className="font-medium text-neutral-900 dark:text-white mb-2">Current Mode</h3>
          <div className="flex items-center space-x-2">
            {connectionMode === 'server' ? (
              <>
                <Server className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                <span className="text-primary-600 dark:text-primary-400 font-medium">Server Proxy Mode</span>
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                <span className="text-secondary-600 dark:text-secondary-400 font-medium">Direct Browser Mode</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Troubleshooting Section */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
              Troubleshooting
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              If you're experiencing issues with Server Proxy Mode:
            </p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc pl-5">
              <li>Ensure your Supabase Edge Functions are deployed</li>
              <li>Check that API keys are configured in Supabase secrets</li>
              <li>Verify your authentication is working properly</li>
              <li>Try switching to Direct Browser Mode and adding your API keys</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}