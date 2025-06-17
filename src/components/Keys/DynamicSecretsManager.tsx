import React, { useState } from 'react';
import { Key, Server, Upload, Check, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface DynamicSecretsManagerProps {
  onClose: () => void;
}

export function DynamicSecretsManager({ onClose }: DynamicSecretsManagerProps) {
  const [secrets, setSecrets] = useState<Record<string, string>>({
    OPENAI_API_KEY: '',
    ANTHROPIC_API_KEY: '',
    GEMINI_API_KEY: '',
    IBM_API_KEY: '',
    IBM_PROJECT_ID: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());

  const handleSecretChange = (key: string, value: string) => {
    setSecrets(prev => ({ ...prev, [key]: value }));
    // Reset status when user changes value
    setUploadStatus(prev => ({ ...prev, [key]: 'pending' }));
  };

  const toggleSecretVisibility = (key: string) => {
    const newVisible = new Set(visibleSecrets);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleSecrets(newVisible);
  };

  const uploadSecretsToSupabase = async () => {
    setIsUploading(true);
    const newStatus: Record<string, 'pending' | 'success' | 'error'> = {};

    try {
      // Filter out empty secrets
      const nonEmptySecrets = Object.entries(secrets).filter(([_, value]) => value.trim());

      if (nonEmptySecrets.length === 0) {
        toast.error('Please enter at least one API key');
        setIsUploading(false);
        return;
      }

      // Call the Edge Function to update secrets
      const { data, error } = await supabase.functions.invoke('manage-secrets', {
        body: {
          action: 'update',
          secrets: Object.fromEntries(nonEmptySecrets)
        }
      });

      if (error) {
        throw error;
      }

      // Mark all uploaded secrets as successful
      nonEmptySecrets.forEach(([key]) => {
        newStatus[key] = 'success';
      });

      setUploadStatus(newStatus);
      toast.success(`Successfully updated ${nonEmptySecrets.length} secret(s)`);

    } catch (error) {
      console.error('Failed to upload secrets:', error);
      
      // Mark all as error
      Object.keys(secrets).forEach(key => {
        if (secrets[key].trim()) {
          newStatus[key] = 'error';
        }
      });
      
      setUploadStatus(newStatus);
      toast.error('Failed to update secrets. This feature requires admin privileges.');
    } finally {
      setIsUploading(false);
    }
  };

  const testSecrets = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-secrets', {
        body: { providers: ['openai', 'anthropic', 'gemini', 'ibm'] }
      });

      if (error) throw error;

      const results = data.results;
      let successCount = 0;
      let totalCount = 0;

      Object.entries(results).forEach(([provider, result]: [string, any]) => {
        totalCount++;
        if (result.success) {
          successCount++;
        }
      });

      toast.success(`Secret test completed: ${successCount}/${totalCount} providers configured correctly`);
      
    } catch (error) {
      toast.error('Failed to test secrets');
    }
  };

  const secretConfigs = [
    {
      key: 'OPENAI_API_KEY',
      label: 'OpenAI API Key',
      placeholder: 'sk-...',
      description: 'Required for GPT-4 and other OpenAI models'
    },
    {
      key: 'ANTHROPIC_API_KEY',
      label: 'Anthropic API Key',
      placeholder: 'sk-ant-...',
      description: 'Required for Claude models'
    },
    {
      key: 'GEMINI_API_KEY',
      label: 'Google Gemini API Key',
      placeholder: 'AIza...',
      description: 'Required for Gemini models'
    },
    {
      key: 'IBM_API_KEY',
      label: 'IBM API Key',
      placeholder: 'Enter IBM API key',
      description: 'Required for IBM WatsonX models'
    },
    {
      key: 'IBM_PROJECT_ID',
      label: 'IBM Project ID',
      placeholder: 'Enter IBM Project ID',
      description: 'Required for IBM WatsonX models'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                <Server className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Dynamic Secrets Management
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Upload API keys directly to Supabase Edge Function secrets
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-1">
                  Admin Privileges Required
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  This feature requires admin access to your Supabase project. Only project owners and members with appropriate permissions can update Edge Function secrets.
                </p>
              </div>
            </div>
          </div>

          {/* Secrets Form */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              API Keys Configuration
            </h3>
            
            {secretConfigs.map((config) => (
              <div key={config.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {config.label}
                  </label>
                  <div className="flex items-center space-x-2">
                    {uploadStatus[config.key] === 'success' && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                    {uploadStatus[config.key] === 'error' && (
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  <input
                    type={visibleSecrets.has(config.key) ? 'text' : 'password'}
                    value={secrets[config.key]}
                    onChange={(e) => handleSecretChange(config.key, e.target.value)}
                    placeholder={config.placeholder}
                    className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility(config.key)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                  >
                    {visibleSecrets.has(config.key) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {config.description}
                </p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <button
              onClick={testSecrets}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>Test Current Secrets</span>
            </button>

            <button
              onClick={uploadSecretsToSupabase}
              disabled={isUploading || Object.values(secrets).every(v => !v.trim())}
              className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Update Secrets</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <h4 className="font-medium text-neutral-900 dark:text-white mb-2">
            How it works:
          </h4>
          <ol className="text-sm text-neutral-600 dark:text-neutral-400 space-y-1 list-decimal list-inside">
            <li>Enter your API keys above (only non-empty fields will be updated)</li>
            <li>Click "Update Secrets" to upload them to Supabase Edge Function secrets</li>
            <li>The secrets will be available to all Edge Functions immediately</li>
            <li>Users can now use the AI playground without configuring local API keys</li>
          </ol>
        </div>
      </div>
    </div>
  );
}