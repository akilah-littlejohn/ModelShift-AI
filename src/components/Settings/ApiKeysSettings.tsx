import React, { useState, useEffect } from 'react';
import { Key, Plus, Eye, EyeOff, Trash2, Check, X, Edit, RefreshCw, AlertTriangle, Info, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { apiKeysService } from '../../lib/api-keys/api-keys-service';
import { providers } from '../../data/providers';
import type { ApiKeyListItem } from '../../lib/api-keys/types';
import toast from 'react-hot-toast';

export function ApiKeysSettings() {
  const { user } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (user) {
      loadApiKeys();
    }
  }, [user, refreshTrigger]);

  const loadApiKeys = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const keys = await apiKeysService.getUserApiKeys(user.id);
      setApiKeys(keys);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      toast.error('Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = () => {
    setShowAddModal(true);
  };

  const handleEditKey = (keyId: string) => {
    setShowEditModal(keyId);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to delete this API key?')) {
      return;
    }
    
    try {
      await apiKeysService.deleteApiKey(user.id, keyId);
      toast.success('API key deleted successfully');
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  const handleToggleKeyStatus = async (keyId: string, currentStatus: boolean) => {
    if (!user) return;
    
    try {
      await apiKeysService.toggleApiKeyStatus(user.id, keyId, !currentStatus);
      toast.success(`API key ${currentStatus ? 'disabled' : 'enabled'} successfully`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Failed to toggle API key status:', error);
      toast.error('Failed to update API key status');
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const getProviderInfo = (providerId: string) => {
    return providers.find(p => p.id === providerId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          API Key Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Securely manage your personal API keys for AI providers
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-primary-900 dark:text-primary-100 mb-1">
              Secure Key Storage
            </h3>
            <p className="text-sm text-primary-700 dark:text-primary-300">
              Your API keys are encrypted before storage and are only accessible by you. The server never stores your raw API keys.
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Your API Keys
        </h2>
        <button
          onClick={handleAddKey}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add API Key</span>
        </button>
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
            <p className="text-neutral-500 dark:text-neutral-400">Loading API keys...</p>
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
          <Key className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
            No API Keys Added
          </h3>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            Add your API keys to use your own credentials with AI providers
          </p>
          <button
            onClick={handleAddKey}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add API Key</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => {
            const provider = getProviderInfo(key.provider_id);
            const isVisible = visibleKeys.has(key.id);
            
            return (
              <div 
                key={key.id} 
                className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{provider?.icon || '🔑'}</span>
                      <div>
                        <h4 className="font-medium text-neutral-900 dark:text-white">
                          {provider?.displayName || key.provider_id}
                        </h4>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            {key.name}
                          </span>
                          {key.is_active ? (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full text-xs font-medium">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Key Display */}
                    <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                          {key.masked_key}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(key.id)}
                          className="p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                          title={isVisible ? 'Hide key' : 'Show key'}
                        >
                          {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    
                    {/* Metadata */}
                    <div className="flex items-center space-x-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                      {key.last_used_at && (
                        <span>Last used: {new Date(key.last_used_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleKeyStatus(key.id, key.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        key.is_active
                          ? 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                      title={key.is_active ? 'Disable key' : 'Enable key'}
                    >
                      {key.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleEditKey(key.id)}
                      className="p-2 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit key"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Key Modal */}
      {showAddModal && (
        <AddApiKeyModal
          onClose={() => setShowAddModal(false)}
          onAdd={() => {
            setShowAddModal(false);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}

      {/* Edit Key Modal */}
      {showEditModal && (
        <EditApiKeyModal
          keyId={showEditModal}
          onClose={() => setShowEditModal(null)}
          onUpdate={() => {
            setShowEditModal(null);
            setRefreshTrigger(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}

interface AddApiKeyModalProps {
  onClose: () => void;
  onAdd: () => void;
}

function AddApiKeyModal({ onClose, onAdd }: AddApiKeyModalProps) {
  const { user } = useAuth();
  const [providerId, setProviderId] = useState('');
  const [keyValue, setKeyValue] = useState('');
  const [keyName, setKeyName] = useState('Default');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!providerId || !keyValue) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await apiKeysService.createApiKey(user.id, {
        provider_id: providerId,
        key: keyValue,
        name: keyName || 'Default'
      });
      
      toast.success('API key added successfully');
      onAdd();
    } catch (error) {
      console.error('Failed to add API key:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProvider = providers.find(p => p.id === providerId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Add API Key
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Provider
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                required
              >
                <option value="">Select a provider</option>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
            </div>

            {/* Key Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Default"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              />
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Optional name to identify this key (e.g., "Production", "Development")
              </p>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder={selectedProvider ? selectedProvider.keyRequirements[0].placeholder : 'Enter your API key'}
                  className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {selectedProvider && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {selectedProvider.keyRequirements[0].label} for {selectedProvider.displayName}
                </p>
              )}
            </div>

            {/* Provider-specific additional fields */}
            {providerId === 'ibm' && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  IBM Project ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your IBM Project ID"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  required={providerId === 'ibm'}
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Required for IBM WatsonX
                </p>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your API key will be encrypted before storage and is only accessible by you. We never store your raw API key.
                </p>
              </div>
            </div>

            {/* Provider Info */}
            {selectedProvider && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
                      How to get a {selectedProvider.displayName} API key:
                    </p>
                    <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 list-disc list-inside">
                      {providerId === 'openai' && (
                        <>
                          <li>Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI API Keys</a></li>
                          <li>Create a new API key</li>
                          <li>Copy the key (it starts with "sk-")</li>
                        </>
                      )}
                      {providerId === 'gemini' && (
                        <>
                          <li>Go to <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a></li>
                          <li>Create a new API key</li>
                          <li>Copy the key (it starts with "AIza")</li>
                        </>
                      )}
                      {providerId === 'claude' && (
                        <>
                          <li>Go to <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a></li>
                          <li>Create a new API key</li>
                          <li>Copy the key (it starts with "sk-ant")</li>
                        </>
                      )}
                      {providerId === 'ibm' && (
                        <>
                          <li>Go to <a href="https://cloud.ibm.com/iam/apikeys" target="_blank" rel="noopener noreferrer" className="underline">IBM Cloud API Keys</a></li>
                          <li>Create a new API key</li>
                          <li>Also get your Project ID from WatsonX dashboard</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !providerId || !keyValue}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </div>
                ) : (
                  'Add API Key'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

interface EditApiKeyModalProps {
  keyId: string;
  onClose: () => void;
  onUpdate: () => void;
}

function EditApiKeyModal({ keyId, onClose, onUpdate }: EditApiKeyModalProps) {
  const { user } = useAuth();
  const [keyData, setKeyData] = useState<ApiKeyListItem | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [keyName, setKeyName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (user && keyId) {
      loadKeyData();
    }
  }, [user, keyId]);

  const loadKeyData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get all keys and find the one we're editing
      const keys = await apiKeysService.getUserApiKeys(user.id);
      const key = keys.find(k => k.id === keyId);
      
      if (key) {
        setKeyData(key);
        setKeyName(key.name);
      } else {
        toast.error('API key not found');
        onClose();
      }
    } catch (error) {
      console.error('Failed to load API key data:', error);
      toast.error('Failed to load API key data');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !keyData) return;
    
    setIsSubmitting(true);
    
    try {
      const updates: any = { name: keyName };
      
      if (keyValue) {
        updates.key = keyValue;
      }
      
      await apiKeysService.updateApiKey(user.id, keyId, updates);
      
      toast.success('API key updated successfully');
      onUpdate();
    } catch (error) {
      console.error('Failed to update API key:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update API key');
    } finally {
      setIsSubmitting(false);
    }
  };

  const provider = keyData ? providers.find(p => p.id === keyData.provider_id) : null;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md p-6">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!keyData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Edit API Key
            </h3>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Info */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Provider
              </label>
              <div className="flex items-center space-x-2 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-700">
                <span className="text-xl">{provider?.icon || '🔑'}</span>
                <span className="text-neutral-900 dark:text-white">
                  {provider?.displayName || keyData.provider_id}
                </span>
              </div>
            </div>

            {/* Key Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="Default"
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                required
              />
            </div>

            {/* New API Key Input (Optional) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                New API Key (Optional)
              </label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="Leave blank to keep current key"
                  className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Only fill this if you want to update the API key
              </p>
            </div>

            {/* Current Status */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Status
              </label>
              <div className="flex items-center space-x-2">
                {keyData.is_active ? (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded-full text-sm">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your API key will be encrypted before storage and is only accessible by you. We never store your raw API key.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || (!keyValue && keyName === keyData.name)}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update API Key'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}