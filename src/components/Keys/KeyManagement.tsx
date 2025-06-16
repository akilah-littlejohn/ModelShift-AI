import React, { useState, useEffect } from 'react';
import { Plus, Key, Eye, EyeOff, Trash2, Shield, AlertTriangle, Code, Upload, Download } from 'lucide-react';
import { providers } from '../../data/providers';
import { keyVault } from '../../lib/encryption';
import { ConfigurationGenerator } from './ConfigurationGenerator';
import { ConfigurationExporter } from './ConfigurationExporter';
import { ConfigurationImporter } from './ConfigurationImporter';
import type { APIKey } from '../../types';
import toast from 'react-hot-toast';

export function KeyManagement() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = () => {
    const storedKeys = keyVault.list();
    const keyData: APIKey[] = storedKeys.map(provider => ({
      id: provider,
      user_id: '1',
      provider,
      keyData: keyVault.retrieve(provider) || {},
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`,
      is_active: true,
      created_at: new Date().toISOString()
    }));
    setKeys(keyData);
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

  const deleteKey = (provider: string) => {
    keyVault.remove(provider);
    setKeys(keys.filter(key => key.provider !== provider));
    toast.success('API key deleted successfully');
  };

  const getDisplayKey = (keyData: Record<string, string>, isVisible: boolean): string => {
    const primaryKey = keyData.apiKey || Object.values(keyData)[0] || '';
    return isVisible ? primaryKey : '••••••••••••••••••••••••••••••••';
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          API Key Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Securely manage your AI provider API keys with BYOK architecture
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
              All API keys are encrypted and stored locally in your browser. We never see or store your keys on our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">
          Your API Keys
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Import Config</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add API Key</span>
          </button>
        </div>
      </div>

      {/* Keys List */}
      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Key className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              No API Keys Added
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              Add your first API key to start using the AI playground
            </p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add API Key</span>
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import Configuration</span>
              </button>
            </div>
          </div>
        ) : (
          keys.map((key) => {
            const provider = providers.find(p => p.id === key.provider);
            if (!provider) return null;

            const isVisible = visibleKeys.has(key.id);
            const displayKey = getDisplayKey(key.keyData, isVisible);

            return (
              <div
                key={key.id}
                className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                      <span className="text-2xl">{provider.icon}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                          {key.name}
                        </h3>
                        <span className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-xs font-medium">
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
                        {provider.displayName}
                      </p>
                      
                      {/* Key Display */}
                      <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-3 space-y-2">
                        {/* Primary Key (usually API Key) */}
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                              Primary Key
                            </div>
                            <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                              {displayKey.slice(0, 50)}{displayKey.length > 50 ? '...' : ''}
                            </code>
                          </div>
                          <button
                            onClick={() => toggleKeyVisibility(key.id)}
                            className="p-1 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors ml-2"
                            title={isVisible ? 'Hide key' : 'Show key'}
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Additional Fields */}
                        {Object.entries(key.keyData).filter(([fieldName]) => fieldName !== 'apiKey').map(([fieldName, fieldValue]) => (
                          <div key={fieldName} className="border-t border-neutral-200 dark:border-neutral-600 pt-2">
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1 capitalize">
                              {fieldName.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                            <code className="text-sm font-mono text-neutral-700 dark:text-neutral-300">
                              {isVisible ? fieldValue : '••••••••••••••••••••'}
                            </code>
                          </div>
                        ))}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center space-x-4 mt-3 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>Added {new Date(key.created_at).toLocaleDateString()}</span>
                        {key.last_used && (
                          <span>Last used {new Date(key.last_used).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowExportModal(key.provider)}
                      className="p-2 text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-900/20 rounded-lg transition-colors"
                      title="Export configuration"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowConfigModal(key.provider)}
                      className="p-2 text-primary-500 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                      title="Generate configuration"
                    >
                      <Code className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteKey(key.provider)}
                      className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Key Modal */}
      {showAddModal && (
        <AddKeyModal
          onClose={() => setShowAddModal(false)}
          onAdd={() => {
            loadKeys();
            setShowAddModal(false);
          }}
        />
      )}

      {/* Configuration Generator Modal */}
      {showConfigModal && (
        <ConfigurationGenerator
          provider={showConfigModal}
          onClose={() => setShowConfigModal(null)}
        />
      )}

      {/* Configuration Exporter Modal */}
      {showExportModal && (
        <ConfigurationExporter
          provider={showExportModal}
          onClose={() => setShowExportModal(null)}
        />
      )}

      {/* Configuration Importer Modal */}
      {showImportModal && (
        <ConfigurationImporter
          onClose={() => setShowImportModal(false)}
          onImport={() => {
            loadKeys();
            setShowImportModal(false);
          }}
        />
      )}
    </div>
  );
}

interface AddKeyModalProps {
  onClose: () => void;
  onAdd: () => void;
}

function AddKeyModal({ onClose, onAdd }: AddKeyModalProps) {
  const [selectedProvider, setSelectedProvider] = useState('');
  const [keyFieldValues, setKeyFieldValues] = useState<Record<string, string>>({});

  const selectedProviderData = providers.find(p => p.id === selectedProvider);

  const handleFieldChange = (fieldName: string, value: string) => {
    setKeyFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    if (!selectedProviderData) {
      toast.error('Invalid provider selected');
      return;
    }

    // Validate all required fields are filled
    const missingFields = selectedProviderData.keyRequirements
      .filter(req => req.required && !keyFieldValues[req.name]?.trim())
      .map(req => req.label);

    if (missingFields.length > 0) {
      toast.error(`Please fill in: ${missingFields.join(', ')}`);
      return;
    }

    // Store the structured key data
    keyVault.store(selectedProvider, keyFieldValues);
    
    toast.success('API key added successfully');
    onAdd();
  };

  // Reset form when provider changes
  React.useEffect(() => {
    setKeyFieldValues({});
  }, [selectedProvider]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
            Add API Key
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
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

            {/* Dynamic Key Fields */}
            {selectedProviderData && (
              <div className="space-y-4">
                <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                  <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                    Required Credentials
                  </h4>
                  {selectedProviderData.keyRequirements.map((requirement) => (
                    <div key={requirement.name} className="mb-4">
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        {requirement.label}
                        {requirement.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={requirement.type}
                        value={keyFieldValues[requirement.name] || ''}
                        onChange={(e) => handleFieldChange(requirement.name, e.target.value)}
                        placeholder={requirement.placeholder}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        required={requirement.required}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Your credentials will be encrypted and stored locally in your browser. They will never be sent to our servers.
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
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                Add Key
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}