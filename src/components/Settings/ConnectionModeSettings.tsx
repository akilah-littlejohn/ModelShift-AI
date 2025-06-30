import React, { useState, useEffect } from 'react';
import { Server, Globe, Zap, AlertTriangle, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react';
import { ProxyService } from '../../lib/api/ProxyService';
import toast from 'react-hot-toast';

export function ConnectionModeSettings() {
  const [connectionMode, setConnectionMode] = useState(() => {
    return localStorage.getItem('modelshift-connection-mode') || 'browser';
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
      
      // Show toast based on health status
      if (health.available) {
        toast.success('Server connection is available');
      } else if (health.authenticated && health.errors.length > 0) {
        // Check if we automatically switched to browser mode
        const currentMode = localStorage.getItem('modelshift-connection-mode');
        if (currentMode === 'browser' && connectionMode !== 'browser') {
          setConnectionMode('browser');
          toast.success('Automatically switched to Direct Browser Mode');
        } else {
          toast.error(`Connection issue: ${health.errors[0]}`);
        }
      } else if (!health.authenticated) {
        toast.error('Please sign in again to continue');
      }
    } catch (error) {
      console.error('Failed to check proxy health:', error);
      toast.error('Failed to check connection status');
      setProxyHealth({
        available: false,
        authenticated: false,
        configuredProviders: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
      
      // Set connection mode to browser automatically when health check fails
      localStorage.setItem('modelshift-connection-mode', 'browser');
      setConnectionMode('browser');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: string) => {
    setConnectionMode(mode);
    localStorage.setItem('modelshift-connection-mode', mode);
    toast.success(`Connection mode set to ${mode === 'server' ? 'Server Proxy' : 'Direct Browser'}`);
    
    // If switching to server mode, check health
    if (mode === 'server') {
      checkProxyHealth();
    }
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
              <strong>Server Proxy Mode:</strong> API requests are routed through secure servers, keeping your API keys secure. This is the recommended mode for production.
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
                <RefreshCw className="w-4 h-4 animate-spin" />
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
              {proxyHealth.available ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-neutral-900 dark:text-white">
                Server Proxy: {proxyHealth.available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {proxyHealth.authenticated ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
              <span className="font-medium text-neutral-900 dark:text-white">
                Authentication: {proxyHealth.authenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </div>

            {proxyHealth.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                      Connection Issues:
                    </h3>
                    <ul className="text-sm text-red-600 dark:text-red-400 space-y-1 pl-5 list-disc">
                      {proxyHealth.errors.map((error, index) => {
                        // Enhanced: More user-friendly error messages
                        let userFriendlyError = error;
                        if (error.includes('Supabase configuration incomplete')) {
                          userFriendlyError = 'Supabase not configured - please set up your .env.local file with real Supabase credentials';
                        } else if (error.includes('Edge Function not deployed')) {
                          userFriendlyError = 'Server component not available - automatically switched to Direct Browser Mode';
                        } else if (error.includes('API key')) {
                          userFriendlyError = 'API key configuration issue on server';
                        } else if (error.includes('auth')) {
                          userFriendlyError = 'Authentication issue - please sign in again';
                        }
                        return <li key={index}>{userFriendlyError}</li>;
                      })}
                    </ul>
                  </div>
                </div>
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
              API requests are routed through secure servers. Your API keys remain on the server.
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
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-green-600 dark:text-green-400">
                Always available
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

      {/* Setup Instructions */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-green-900 dark:text-green-100 mb-1">
              Getting Started
            </h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-2">
              To use ModelShift AI, you have two options:
            </p>
            <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc pl-5">
              <li><strong>Quick Start:</strong> Use Direct Browser Mode and add your API keys in Settings → API Keys</li>
              <li><strong>Production Setup:</strong> Configure your .env.local file with Supabase credentials and deploy the Edge Function</li>
            </ul>
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
              <li>Check that your .env.local file contains real Supabase credentials (not placeholder values)</li>
              <li>Ensure the ai-proxy Edge Function is deployed to your Supabase project</li>
              <li>Verify your authentication is working properly</li>
              <li>Try switching to Direct Browser Mode and adding your API keys</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Additional Help Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              Need Help?
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              For detailed setup instructions:
            </p>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc pl-5">
              <li>Check the SUPABASE_SETUP_GUIDE.md in the docs folder</li>
              <li>Follow the EDGE_FUNCTION_DEPLOYMENT.md guide for server setup</li>
              <li>Use Direct Browser Mode as a quick alternative</li>
              <li>Check the browser console for detailed error messages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}