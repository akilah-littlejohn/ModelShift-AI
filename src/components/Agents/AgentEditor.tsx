import React, { useState, useEffect } from 'react';
import { Save, X, Bot, Lightbulb, Code, TestTube } from 'lucide-react';
import type { Agent } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface AgentEditorProps {
  agent: Agent | null;
  onSave: (agent: Agent) => void;
  onClose: () => void;
}

export function AgentEditor({ agent, onSave, onClose }: AgentEditorProps) {
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: '',
    description: '',
    category: 'Custom',
    promptTemplate: '',
    examples: [''],
    icon: 'Bot',
    isCustom: true
  });

  const [testInput, setTestInput] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    }
  }, [agent]);

  const handleInputChange = (field: keyof Agent, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...(formData.examples || [''])];
    newExamples[index] = value;
    setFormData(prev => ({
      ...prev,
      examples: newExamples
    }));
  };

  const addExample = () => {
    setFormData(prev => ({
      ...prev,
      examples: [...(prev.examples || []), '']
    }));
  };

  const removeExample = (index: number) => {
    const newExamples = (formData.examples || []).filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      examples: newExamples.length > 0 ? newExamples : ['']
    }));
  };

  const testPrompt = () => {
    if (!testInput.trim() || !formData.promptTemplate) {
      setGeneratedPrompt('Please enter test input and a prompt template');
      return;
    }

    // Simple template replacement for testing
    const prompt = formData.promptTemplate.replace(/\{input\}/g, testInput);
    setGeneratedPrompt(prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim() || !formData.description?.trim() || !formData.promptTemplate?.trim()) {
      return;
    }

    const agentData: Agent = {
      id: agent?.id || `custom-${uuidv4()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || 'Custom',
      promptTemplate: formData.promptTemplate.trim(),
      examples: (formData.examples || []).filter(ex => ex.trim()),
      icon: formData.icon || 'Bot',
      isCustom: true
    };

    onSave(agentData);
  };

  const categories = [
    'Business',
    'Content',
    'Development',
    'Marketing',
    'Support',
    'Education',
    'Creative',
    'Analysis',
    'Custom'
  ];

  const icons = [
    'Bot', 'Brain', 'Zap', 'Star', 'Lightbulb', 'Target', 'Rocket', 'Sparkles',
    'Building2', 'Presentation', 'MessageSquare', 'Code', 'Palette', 'BarChart3'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-700 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                  {agent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Design a custom AI agent with specialized prompts and behaviors
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Email Marketing Assistant"
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Category
                </label>
                <select
                  value={formData.category || 'Custom'}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe what this agent does and how it helps users..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                required
              />
            </div>

            {/* Prompt Template */}
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Prompt Template *
                </label>
                <div className="flex items-center space-x-1 text-xs text-neutral-500 dark:text-neutral-400">
                  <Lightbulb className="w-3 h-3" />
                  <span>Use {'{input}'} as placeholder for user input</span>
                </div>
              </div>
              <textarea
                value={formData.promptTemplate || ''}
                onChange={(e) => handleInputChange('promptTemplate', e.target.value)}
                placeholder="You are an expert email marketing specialist. Your task is to create compelling email campaigns.

User Request: {input}

Please provide:
1. Subject line suggestions
2. Email body content
3. Call-to-action recommendations
4. Best practices for this campaign"
                rows={8}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none font-mono text-sm"
                required
              />
            </div>

            {/* Examples */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Example Use Cases
              </label>
              <div className="space-y-2">
                {(formData.examples || ['']).map((example, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={example}
                      onChange={(e) => handleExampleChange(index, e.target.value)}
                      placeholder={`Example ${index + 1}: e.g., Create a welcome email for new subscribers`}
                      className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
                    />
                    {(formData.examples || []).length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExample(index)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addExample}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                >
                  + Add another example
                </button>
              </div>
            </div>

            {/* Prompt Testing */}
            <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <TestTube className="w-4 h-4 text-secondary-600 dark:text-secondary-400" />
                <h3 className="font-medium text-neutral-900 dark:text-white">Test Your Prompt</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Test Input
                  </label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter sample input to test your prompt..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                  />
                  <button
                    type="button"
                    onClick={testPrompt}
                    className="mt-2 px-3 py-1 bg-secondary-500 text-white rounded text-sm hover:bg-secondary-600 transition-colors"
                  >
                    Generate Preview
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Generated Prompt
                  </label>
                  <div className="bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg p-3 h-24 overflow-y-auto">
                    <pre className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                      {generatedPrompt || 'Generated prompt will appear here...'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name?.trim() || !formData.description?.trim() || !formData.promptTemplate?.trim()}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{agent ? 'Update Agent' : 'Create Agent'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}