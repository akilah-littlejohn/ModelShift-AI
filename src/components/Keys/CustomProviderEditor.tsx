import React, { useState } from 'react';
import { Plus, X, Save, TestTube, AlertTriangle, Code, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { keyVault } from '../../lib/encryption';
import { ModelShiftAIClientFactory } from '../../lib/modelshift-ai-sdk';
import type { Provider, KeyRequirement, ApiConfiguration } from '../../types';
import toast from 'react-hot-toast';

interface CustomProviderEditorProps {
  onClose: () => void;
  onSave: (provider: Provider) => void;
}

export function CustomProviderEditor({ onClose, onSave }: CustomProviderEditorProps) {
  const [step, setStep] = useState<'basic' | 'api' | 'test'>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; response?: string } | null>(null);
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Basic provider info
  const [basicInfo, setBasicInfo] = useState({
    id: '',
    name: '',
    displayName: '',
    icon: '🤖',
    color: '#3b82f6',
    description: ''
  });

  // API configuration
  const [apiConfig, setApiConfig] = useState<ApiConfiguration>({
    baseUrl: '',
    endpointPath: '',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    requestBodyStructure: {},
    promptJsonPath: '',
    responseJsonPath: '',
    defaultModel: '',
    defaultParameters: {}
  });

  // Key requirements
  const [keyRequirements, setKeyRequirements] = useState<KeyRequirement[]>([
    { name: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Enter your API key', required: true }
  ]);

  // Test data
  const [testApiKeys, setTestApiKeys] = useState<Record<string, string>>({});
  const [testPrompt, setTestPrompt] = useState('Hello, how are you?');

  const addKeyRequirement = () => {
    setKeyRequirements([
      ...keyRequirements,
      { name: '', label: '', type: 'text', placeholder: '', required: false }
    ]);
  };

  const updateKeyRequirement = (index: number, field: keyof KeyRequirement, value: any) => {
    const updated = [...keyRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setKeyRequirements(updated);
  };

  const removeKeyRequirement = (index: number) => {
    if (keyRequirements.length > 1) {
      setKeyRequirements(keyRequirements.filter((_, i) => i !== index));
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const testConfiguration = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      // Validate required fields
      const missingKeys = keyRequirements
        .filter(req => req.required && !testApiKeys[req.name]?.trim())
        .map(req => req.label);

      if (missingKeys.length > 0) {
        throw new Error(`Missing required keys: ${missingKeys.join(', ')}`);
      }

      if (!apiConfig.baseUrl || !apiConfig.endpointPath || !apiConfig.promptJsonPath || !apiConfig.responseJsonPath) {
        throw new Error('Please fill in all required API configuration fields');
      }

      // Create a temporary provider for testing
      const tempProvider: Provider = {
        id: basicInfo.id || 'test-provider',
        name: basicInfo.name || 'test',
        displayName: basicInfo.displayName || 'Test Provider',
        icon: basicInfo.icon,
        color: basicInfo.color,
        keyRequirements,
        capabilities: {
          streaming: false,
          maxTokens: 4096,
          pricing: { input: 0.01, output: 0.02 }
        },
        isAvailable: true,
        apiConfig
      };

      // Create a client and test the API call
      const client = ModelShiftAIClientFactory.createFromApiConfig(
        apiConfig,
        testApiKeys,
        apiConfig.defaultModel,
        apiConfig.defaultParameters
      );

      const response = await client.generate(testPrompt);

      setTestResult({
        success: true,
        message: 'Configuration test successful!',
        response: response.slice(0, 200) + (response.length > 200 ? '...' : '')
      });

      toast.success('Provider configuration works!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({
        success: false,
        message: errorMessage
      });
      toast.error('Configuration test failed');
    } finally {
      setIsLoading(false);
    }
  };

  const saveProvider = () => {
    try {
      // Validate all fields
      if (!basicInfo.id || !basicInfo.displayName || !basicInfo.name) {
        toast.error('Please fill in all basic information fields');
        return;
      }

      if (!apiConfig.baseUrl || !apiConfig.endpointPath || !apiConfig.promptJsonPath || !apiConfig.responseJsonPath) {
        toast.error('Please fill in all required API configuration fields');
        return;
      }

      // Create the provider
      const provider: Provider = {
        id: basicInfo.id,
        name: basicInfo.name,
        displayName: basicInfo.displayName,
        icon: basicInfo.icon,
        color: basicInfo.color,
        keyRequirements: keyRequirements.filter(req => req.name && req.label),
        capabilities: {
          streaming: false,
          maxTokens: 4096,
          pricing: { input: 0.01, output: 0.02 }
        },
        isAvailable: true,
        apiConfig
      };

      // Save API keys if provided
      if (Object.keys(testApiKeys).length > 0) {
        keyVault.store(provider.id, testApiKeys);
      }

      onSave(provider);
      toast.success('Custom provider saved successfully!');
    } catch (error) {
      toast.error('Failed to save provider configuration');
    }
  };

  const renderBasicStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Basic Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Provider ID *
            </label>
            <input
              type="text"
              value={basicInfo.id}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
              placeholder="e.g., huggingface, custom-llm"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Unique identifier (lowercase, no spaces)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Internal Name *
            </label>
            <input
              type="text"
              value={basicInfo.name}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., huggingface"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={basicInfo.displayName}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, displayName: e.target.value }))}
              placeholder="e.g., Hugging Face"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={basicInfo.icon}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, icon: e.target.value }))}
              placeholder="🤗"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              maxLength={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Color
            </label>
            <input
              type="color"
              value={basicInfo.color}
              onChange={(e) => setBasicInfo(prev => ({ ...prev, color: e.target.value }))}
              className="w-full h-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Description
          </label>
          <textarea
            value={basicInfo.description}
            onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of this provider..."
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
          />
        </div>
      </div>

      {/* Key Requirements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-neutral-900 dark:text-white">
            API Key Requirements
          </h4>
          <button
            onClick={addKeyRequirement}
            className="flex items-center space-x-1 px-2 py-1 text-sm bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Field</span>
          </button>
        </div>

        <div className="space-y-3">
          {keyRequirements.map((req, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg">
              <div>
                <input
                  type="text"
                  value={req.name}
                  onChange={(e) => updateKeyRequirement(index, 'name', e.target.value)}
                  placeholder="Field name"
                  className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={req.label}
                  onChange={(e) => updateKeyRequirement(index, 'label', e.target.value)}
                  placeholder="Display label"
                  className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>
              <div>
                <select
                  value={req.type}
                  onChange={(e) => updateKeyRequirement(index, 'type', e.target.value as 'text' | 'password')}
                  className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="text">Text</option>
                  <option value="password">Password</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  value={req.placeholder || ''}
                  onChange={(e) => updateKeyRequirement(index, 'placeholder', e.target.value)}
                  placeholder="Placeholder text"
                  className="w-full px-2 py-1 text-sm border border-neutral-300 dark:border-neutral-600 rounded focus:ring-1 focus:ring-primary-500 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <label className="flex items-center space-x-1">
                  <input
                    type="checkbox"
                    checked={req.required}
                    onChange={(e) => updateKeyRequirement(index, 'required', e.target.checked)}
                    className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400">Required</span>
                </label>
                {keyRequirements.length > 1 && (
                  <button
                    onClick={() => removeKeyRequirement(index)}
                    className="p-1 text-red-500 hover:text-red-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderApiStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          API Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Base URL *
            </label>
            <input
              type="url"
              value={apiConfig.baseUrl}
              onChange={(e) => setApiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
              placeholder="https://api.example.com"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Endpoint Path *
            </label>
            <input
              type="text"
              value={apiConfig.endpointPath}
              onChange={(e) => setApiConfig(prev => ({ ...prev, endpointPath: e.target.value }))}
              placeholder="/v1/chat/completions"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              HTTP Method
            </label>
            <select
              value={apiConfig.method}
              onChange={(e) => setApiConfig(prev => ({ ...prev, method: e.target.value as any }))}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              <option value="POST">POST</option>
              <option value="GET">GET</option>
              <option value="PUT">PUT</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Auth Header Name
            </label>
            <input
              type="text"
              value={apiConfig.authHeaderName || ''}
              onChange={(e) => setApiConfig(prev => ({ ...prev, authHeaderName: e.target.value }))}
              placeholder="Authorization"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Auth Header Prefix
            </label>
            <input
              type="text"
              value={apiConfig.authHeaderPrefix || ''}
              onChange={(e) => setApiConfig(prev => ({ ...prev, authHeaderPrefix: e.target.value }))}
              placeholder="Bearer "
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Default Model
            </label>
            <input
              type="text"
              value={apiConfig.defaultModel}
              onChange={(e) => setApiConfig(prev => ({ ...prev, defaultModel: e.target.value }))}
              placeholder="gpt-3.5-turbo"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Request Body Structure (JSON) *
          </label>
          <textarea
            value={typeof apiConfig.requestBodyStructure === 'object' 
              ? JSON.stringify(apiConfig.requestBodyStructure, null, 2) 
              : '{}'}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setApiConfig(prev => ({ ...prev, requestBodyStructure: parsed }));
              } catch (error) {
                // Don't update on invalid JSON, but allow editing to continue
                console.error('Invalid JSON:', error);
              }
            }}
            placeholder='{"model": "gpt-3.5-turbo", "messages": []}'
            rows={6}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none font-mono text-sm"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Prompt JSON Path *
            </label>
            <input
              type="text"
              value={apiConfig.promptJsonPath}
              onChange={(e) => setApiConfig(prev => ({ ...prev, promptJsonPath: e.target.value }))}
              placeholder="messages[0].content"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Where to insert the user's prompt in the request body
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Response JSON Path *
            </label>
            <input
              type="text"
              value={apiConfig.responseJsonPath}
              onChange={(e) => setApiConfig(prev => ({ ...prev, responseJsonPath: e.target.value }))}
              placeholder="choices[0].message.content"
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              required
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Where to extract the response text from the API response
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTestStep = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
          Test Configuration
        </h3>

        {/* API Keys for Testing */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-neutral-900 dark:text-white">
              API Keys for Testing
            </h4>
            <button
              onClick={() => setShowApiKeys(!showApiKeys)}
              className="flex items-center space-x-1 px-2 py-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              {showApiKeys ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              <span>{showApiKeys ? 'Hide' : 'Show'} Keys</span>
            </button>
          </div>

          <div className="space-y-3">
            {keyRequirements.map((req) => (
              <div key={req.name}>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  {req.label} {req.required && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showApiKeys ? 'text' : 'password'}
                    value={testApiKeys[req.name] || ''}
                    onChange={(e) => setTestApiKeys(prev => ({ ...prev, [req.name]: e.target.value }))}
                    placeholder={req.placeholder}
                    className="w-full px-3 py-2 pr-10 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    required={req.required}
                  />
                  {testApiKeys[req.name] && (
                    <button
                      onClick={() => copyToClipboard(testApiKeys[req.name], req.name)}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {copiedField === req.name ? (
                        <Check className="w-4 h-4 text-accent-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Prompt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Test Prompt
          </label>
          <textarea
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter a test prompt to verify the configuration..."
            rows={3}
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
          />
        </div>

        {/* Test Button */}
        <button
          onClick={testConfiguration}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Testing...</span>
            </>
          ) : (
            <>
              <TestTube className="w-4 h-4" />
              <span>Test Configuration</span>
            </>
          )}
        </button>

        {/* Test Results */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-lg border ${
            testResult.success
              ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-start space-x-3">
              {testResult.success ? (
                <TestTube className="w-5 h-5 text-accent-600 dark:text-accent-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-medium mb-1 ${
                  testResult.success
                    ? 'text-accent-800 dark:text-accent-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {testResult.success ? 'Test Successful' : 'Test Failed'}
                </h4>
                <p className={`text-sm mb-2 ${
                  testResult.success
                    ? 'text-accent-700 dark:text-accent-300'
                    : 'text-red-700 dark:text-red-300'
                }`}>
                  {testResult.message}
                </p>
                {testResult.response && (
                  <div className="mt-3">
                    <h5 className="text-sm font-medium text-accent-800 dark:text-accent-200 mb-1">
                      Sample Response:
                    </h5>
                    <div className="bg-white dark:bg-neutral-800 border border-accent-200 dark:border-accent-700 rounded p-2">
                      <code className="text-sm text-neutral-700 dark:text-neutral-300">
                        {testResult.response}
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Custom Provider Configuration
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Create a custom AI provider for testing (browser-only, not saved to database)
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Warning Banner */}
          <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  Testing Only
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  This configuration is stored locally in your browser for testing purposes only. 
                  It will not be saved to the database or shared with other users.
                </p>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="mt-4 flex items-center space-x-4">
            {[
              { id: 'basic', label: 'Basic Info' },
              { id: 'api', label: 'API Config' },
              { id: 'test', label: 'Test & Save' }
            ].map((stepInfo, index) => (
              <div key={stepInfo.id} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepInfo.id
                    ? 'bg-primary-500 text-white'
                    : index < ['basic', 'api', 'test'].indexOf(step)
                    ? 'bg-accent-500 text-white'
                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm ${
                  step === stepInfo.id
                    ? 'text-primary-600 dark:text-primary-400 font-medium'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}>
                  {stepInfo.label}
                </span>
                {index < 2 && (
                  <div className={`w-8 h-0.5 mx-4 ${
                    index < ['basic', 'api', 'test'].indexOf(step)
                      ? 'bg-accent-500'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'basic' && renderBasicStep()}
          {step === 'api' && renderApiStep()}
          {step === 'test' && renderTestStep()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex justify-between">
            <div>
              {step !== 'basic' && (
                <button
                  onClick={() => {
                    if (step === 'api') setStep('basic');
                    if (step === 'test') setStep('api');
                  }}
                  className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              >
                Cancel
              </button>
              
              {step === 'test' ? (
                <button
                  onClick={saveProvider}
                  disabled={!testResult?.success}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Provider</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (step === 'basic') setStep('api');
                    if (step === 'api') setStep('test');
                  }}
                  disabled={
                    (step === 'basic' && (!basicInfo.id || !basicInfo.displayName || !basicInfo.name)) ||
                    (step === 'api' && (!apiConfig.baseUrl || !apiConfig.endpointPath || !apiConfig.promptJsonPath || !apiConfig.responseJsonPath))
                  }
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}