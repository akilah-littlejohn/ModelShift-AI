import React, { useState } from 'react';
import { Upload, AlertTriangle, CheckCircle, XCircle, FileText, Eye } from 'lucide-react';
import { ConfigurationSerializer } from '../../lib/ConfigurationSerializer';
import { ModelShiftAIClientFactory } from '../../lib/modelshift-ai-sdk';
import { keyVault } from '../../lib/encryption';
import type { SerializedConfig, ConfigValidationResult } from '../../types';
import toast from 'react-hot-toast';

interface ConfigurationImporterProps {
  onClose: () => void;
  onImport?: (config: SerializedConfig) => void;
}

export function ConfigurationImporter({ onClose, onImport }: ConfigurationImporterProps) {
  const [configJson, setConfigJson] = useState('');
  const [parsedConfig, setParsedConfig] = useState<SerializedConfig | null>(null);
  const [validation, setValidation] = useState<ConfigValidationResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleConfigChange = (value: string) => {
    setConfigJson(value);
    setParsedConfig(null);
    setValidation(null);
    setTestResult(null);

    if (value.trim()) {
      try {
        const config = ConfigurationSerializer.deserialize(value);
        setParsedConfig(config);
        
        const validationResult = ConfigurationSerializer.validate(config);
        setValidation(validationResult);
      } catch (error) {
        setValidation({
          isValid: false,
          errors: [error instanceof Error ? error.message : 'Invalid configuration'],
          warnings: []
        });
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleConfigChange(content);
    };
    reader.readAsText(file);
  };

  const testConnection = async () => {
    if (!parsedConfig || !validation?.isValid) {
      toast.error('Please provide a valid configuration first');
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      // Create a client from the configuration
      const client = ModelShiftAIClientFactory.createFromSerializedConfig(parsedConfig);
      
      // Test with a simple prompt
      const testPrompt = parsedConfig.promptTemplate 
        ? parsedConfig.promptTemplate.replace(/\{input\}/g, 'Hello')
        : 'Hello, this is a test message. Please respond briefly.';

      const response = await client.generate(testPrompt);
      
      if (response && response.trim()) {
        setTestResult({
          success: true,
          message: `Connection successful! Response: "${response.slice(0, 100)}${response.length > 100 ? '...' : ''}"`
        });
        toast.success('Configuration test successful!');
      } else {
        setTestResult({
          success: false,
          message: 'Connection successful but received empty response'
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setTestResult({
        success: false,
        message: `Connection failed: ${errorMessage}`
      });
      toast.error('Configuration test failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const importConfiguration = () => {
    if (!parsedConfig || !validation?.isValid) {
      toast.error('Please provide a valid configuration first');
      return;
    }

    try {
      // Store the API keys if they're not placeholders
      const hasRealKeys = !Object.values(parsedConfig.keyData).some(value => 
        value.startsWith('YOUR_') && value.includes('_API_KEY')
      );

      if (hasRealKeys) {
        keyVault.store(parsedConfig.providerId, parsedConfig.keyData);
        toast.success('API keys imported and stored securely');
      }

      // Call the onImport callback if provided
      if (onImport) {
        onImport(parsedConfig);
      }

      toast.success('Configuration imported successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to import configuration');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-accent-500 to-primary-500 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Import Configuration
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Import a ModelShift AI configuration from JSON
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
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Upload Configuration File
            </label>
            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg p-6 text-center">
              <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Choose a JSON configuration file or paste the configuration below
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
                id="config-file"
              />
              <label
                htmlFor="config-file"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 cursor-pointer transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Choose File</span>
              </label>
            </div>
          </div>

          {/* Manual Input */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Configuration JSON
            </label>
            <textarea
              value={configJson}
              onChange={(e) => handleConfigChange(e.target.value)}
              placeholder="Paste your ModelShift AI configuration JSON here..."
              rows={12}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none font-mono text-sm"
            />
          </div>

          {/* Validation Results */}
          {validation && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Validation Results
              </h3>
              
              {/* Errors */}
              {validation.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                        Validation Errors
                      </h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {validation.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {validation.warnings.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
                        Warnings
                      </h4>
                      <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                        {validation.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Success */}
              {validation.isValid && validation.errors.length === 0 && (
                <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-accent-800 dark:text-accent-200 mb-2">
                        Configuration Valid
                      </h4>
                      <p className="text-sm text-accent-700 dark:text-accent-300">
                        The configuration is valid and ready to import.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configuration Preview */}
          {parsedConfig && validation?.isValid && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Configuration Preview
              </h3>
              <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Provider:</span>
                    <span className="ml-2 text-neutral-900 dark:text-white">{parsedConfig.providerId}</span>
                  </div>
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Model:</span>
                    <span className="ml-2 text-neutral-900 dark:text-white">{parsedConfig.model || 'Default'}</span>
                  </div>
                  {parsedConfig.agentId && (
                    <div>
                      <span className="font-medium text-neutral-600 dark:text-neutral-400">Agent:</span>
                      <span className="ml-2 text-neutral-900 dark:text-white">{parsedConfig.agentId}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400">Version:</span>
                    <span className="ml-2 text-neutral-900 dark:text-white">{parsedConfig.version}</span>
                  </div>
                </div>
                
                {parsedConfig.metadata?.description && (
                  <div>
                    <span className="font-medium text-neutral-600 dark:text-neutral-400 text-sm">Description:</span>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mt-1">
                      {parsedConfig.metadata.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Test Connection */}
          {parsedConfig && validation?.isValid && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Test Connection
                </h3>
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection}
                  className="flex items-center space-x-2 px-3 py-2 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isTestingConnection ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      <span>Test Configuration</span>
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`rounded-lg p-4 ${
                  testResult.success
                    ? 'bg-accent-50 dark:bg-accent-900/20 border border-accent-200 dark:border-accent-800'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="flex items-start space-x-3">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium mb-1 ${
                        testResult.success
                          ? 'text-accent-800 dark:text-accent-200'
                          : 'text-red-800 dark:text-red-200'
                      }`}>
                        {testResult.success ? 'Test Successful' : 'Test Failed'}
                      </h4>
                      <p className={`text-sm ${
                        testResult.success
                          ? 'text-accent-700 dark:text-accent-300'
                          : 'text-red-700 dark:text-red-300'
                      }`}>
                        {testResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={importConfiguration}
              disabled={!validation?.isValid}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Upload className="w-4 h-4" />
              <span>Import Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}