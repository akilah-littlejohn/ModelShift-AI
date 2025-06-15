import React, { useState } from 'react';
import { Download, Copy, Check, Code, Eye, EyeOff, AlertTriangle, FileText } from 'lucide-react';
import { ConfigurationSerializer } from '../../lib/ConfigurationSerializer';
import { AgentService } from '../../lib/agents';
import { providers } from '../../data/providers';
import type { SerializedConfig } from '../../types';
import toast from 'react-hot-toast';

interface ConfigurationExporterProps {
  provider: string;
  onClose: () => void;
}

export function ConfigurationExporter({ provider, onClose }: ConfigurationExporterProps) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [includeKeys, setIncludeKeys] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [customParameters, setCustomParameters] = useState('');
  const [description, setDescription] = useState('');
  const [generatedConfig, setGeneratedConfig] = useState<SerializedConfig | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('typescript');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  const providerData = providers.find(p => p.id === provider);
  const agents = AgentService.getAllAgents();

  const generateConfiguration = () => {
    try {
      let parsedParameters: Record<string, any> | undefined;
      if (customParameters.trim()) {
        try {
          parsedParameters = JSON.parse(customParameters);
        } catch (error) {
          toast.error('Invalid JSON in custom parameters');
          return;
        }
      }

      const configJson = ConfigurationSerializer.serialize(provider, {
        agentId: selectedAgent || undefined,
        includeKeys,
        customModel: customModel || undefined,
        customParameters: parsedParameters,
        description: description || undefined
      });

      const config = ConfigurationSerializer.deserialize(configJson);
      setGeneratedConfig(config);
      toast.success('Configuration generated successfully!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate configuration');
    }
  };

  const copyToClipboard = async (text: string, section: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadConfiguration = () => {
    if (!generatedConfig) return;

    const configToExport = showSensitiveData ? generatedConfig : ConfigurationSerializer.sanitize(generatedConfig);
    const configJson = JSON.stringify(configToExport, null, 2);
    const filename = `${provider}-config-${Date.now()}.json`;
    
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Configuration downloaded as ${filename}`);
  };

  const downloadCodeSnippet = () => {
    if (!generatedConfig) return;

    const snippets = ConfigurationSerializer.generateCodeSnippets(generatedConfig);
    const code = snippets[selectedLanguage] || '';
    const extension = selectedLanguage === 'python' ? 'py' : selectedLanguage === 'curl' ? 'sh' : 'js';
    const filename = `${provider}-${selectedLanguage}-example.${extension}`;
    
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Code snippet downloaded as ${filename}`);
  };

  const languageOptions = [
    { value: 'typescript', label: 'TypeScript/Node.js' },
    { value: 'python', label: 'Python' },
    { value: 'nextjs', label: 'Next.js API Route' },
    { value: 'express', label: 'Express.js' },
    { value: 'django', label: 'Django' },
    { value: 'curl', label: 'cURL' }
  ];

  if (!providerData) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <span className="text-2xl">{providerData.icon}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Export Configuration
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Generate portable configuration for {providerData.displayName}
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
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Configuration Options */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Configuration Options
              </h3>

              {/* Agent Selection */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  AI Agent (Optional)
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  <option value="">No Agent (Direct Prompt)</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.isCustom ? '(Custom)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Model */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Custom Model (Optional)
                </label>
                <input
                  type="text"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder={`Default: ${providerData.defaultModel || 'Provider default'}`}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Custom Parameters */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Custom Parameters (JSON)
                </label>
                <textarea
                  value={customParameters}
                  onChange={(e) => setCustomParameters(e.target.value)}
                  placeholder={`Default: ${JSON.stringify(providerData.defaultParameters || {}, null, 2)}`}
                  rows={4}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none font-mono text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this configuration"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                />
              </div>

              {/* Security Options */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Security Options
                    </h4>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={includeKeys}
                        onChange={(e) => setIncludeKeys(e.target.checked)}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-sm text-amber-700 dark:text-amber-300">
                        Include actual API keys (⚠️ Use with caution)
                      </span>
                    </label>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {includeKeys 
                        ? 'Real API keys will be included. Only share with trusted environments.'
                        : 'Placeholders will be used instead of real keys for security.'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateConfiguration}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-200"
              >
                <FileText className="w-5 h-5" />
                <span>Generate Configuration</span>
              </button>
            </div>

            {/* Generated Configuration */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Generated Configuration
                </h3>
                {generatedConfig && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowSensitiveData(!showSensitiveData)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
                    >
                      {showSensitiveData ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showSensitiveData ? 'Hide' : 'Show'} Keys</span>
                    </button>
                  </div>
                )}
              </div>

              {generatedConfig ? (
                <div className="space-y-4">
                  {/* JSON Configuration */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        JSON Configuration
                      </label>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(
                            JSON.stringify(showSensitiveData ? generatedConfig : ConfigurationSerializer.sanitize(generatedConfig), null, 2),
                            'json'
                          )}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                        >
                          {copiedSection === 'json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={downloadConfiguration}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-secondary-500 text-white rounded hover:bg-secondary-600 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-neutral-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-neutral-100">
                        {JSON.stringify(showSensitiveData ? generatedConfig : ConfigurationSerializer.sanitize(generatedConfig), null, 2)}
                      </pre>
                    </div>
                  </div>

                  {/* Code Examples */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Code Example
                      </label>
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedLanguage}
                          onChange={(e) => setSelectedLanguage(e.target.value)}
                          className="px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                        >
                          {languageOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const snippets = ConfigurationSerializer.generateCodeSnippets(generatedConfig);
                            copyToClipboard(snippets[selectedLanguage] || '', 'code');
                          }}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
                        >
                          {copiedSection === 'code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                        <button
                          onClick={downloadCodeSnippet}
                          className="flex items-center space-x-1 px-2 py-1 text-xs bg-secondary-500 text-white rounded hover:bg-secondary-600 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                    <div className="bg-neutral-900 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-sm text-neutral-100">
                        {ConfigurationSerializer.generateCodeSnippets(generatedConfig)[selectedLanguage] || 'Code example not available'}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
                  <Code className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                  <p className="text-neutral-500 dark:text-neutral-400">
                    Configure options and click "Generate Configuration" to see the result
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}