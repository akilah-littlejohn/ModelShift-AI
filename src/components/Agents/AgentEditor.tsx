import React, { useState, useEffect } from 'react';
import { Save, X, Bot, Lightbulb, Code, TestTube, Zap } from 'lucide-react';
import type { Agent } from '../../types';
import { v4 as uuidv4 } from 'uuid';
import { PromptAgentAdvanced } from './PromptAgentAdvanced';

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

  // NEW: Advanced mode state
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [advancedPrompt, setAdvancedPrompt] = useState({
    rolePersona: '',
    goalTask: '',
    contextBackground: '',
    constraintsRules: '',
    styleFormat: ''
  });

  // NEW: Improve My Prompt feature
  const [showImprovePrompt, setShowImprovePrompt] = useState(false);

  useEffect(() => {
    if (agent) {
      setFormData(agent);
      setIsAdvancedMode(agent.isAdvancedMode || false);
      setAdvancedPrompt(agent.advancedPrompt || {
        rolePersona: '',
        goalTask: '',
        contextBackground: '',
        constraintsRules: '',
        styleFormat: ''
      });
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
    if (formData.examples && formData.examples.length > 1) {
      const newExamples = formData.examples.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        examples: newExamples
      }));
    }
  };

  // NEW: Generate combined prompt from advanced fields
  const generateCombinedPrompt = () => {
    if (!isAdvancedMode) {
      return formData.promptTemplate || '';
    }

    const sections = [];
    
    if (advancedPrompt.rolePersona?.trim()) {
      sections.push(`[Role/Persona]\n${advancedPrompt.rolePersona.trim()}`);
    }
    
    if (advancedPrompt.goalTask?.trim()) {
      sections.push(`[Goal/Task]\n${advancedPrompt.goalTask.trim()}`);
    }
    
    if (advancedPrompt.contextBackground?.trim()) {
      sections.push(`[Context/Background]\n${advancedPrompt.contextBackground.trim()}`);
    }
    
    if (advancedPrompt.constraintsRules?.trim()) {
      sections.push(`[Constraints/Rules]\n${advancedPrompt.constraintsRules.trim()}`);
    }
    
    if (advancedPrompt.styleFormat?.trim()) {
      sections.push(`[Style/Format Requirements]\n${advancedPrompt.styleFormat.trim()}`);
    }

    // Always add the input placeholder
    sections.push(`[User Input]\n{input}`);
    
    return sections.join('\n\n');
  };

  const testPrompt = () => {
    if (!testInput.trim()) {
      setGeneratedPrompt('Please enter test input');
      return;
    }

    let promptToTest = '';
    if (isAdvancedMode) {
      promptToTest = generateCombinedPrompt();
    } else {
      promptToTest = formData.promptTemplate || '';
    }

    if (!promptToTest) {
      setGeneratedPrompt('Please create a prompt template first');
      return;
    }

    // Simple template replacement for testing
    const prompt = promptToTest.replace(/\{input\}/g, testInput);
    setGeneratedPrompt(prompt);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim() || !formData.description?.trim()) {
      return;
    }

    // Generate the final prompt template
    const finalPromptTemplate = isAdvancedMode 
      ? generateCombinedPrompt()
      : formData.promptTemplate?.trim() || '';

    if (!finalPromptTemplate) {
      return;
    }

    const agentData: Agent = {
      id: agent?.id || `custom-${uuidv4()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      category: formData.category || 'Custom',
      promptTemplate: finalPromptTemplate,
      examples: (formData.examples || []).filter(ex => ex.trim()),
      icon: formData.icon || 'Bot',
      isCustom: true,
      // NEW: Save advanced mode data
      isAdvancedMode,
      advancedPrompt: isAdvancedMode ? advancedPrompt : undefined
    };

    onSave(agentData);
  };

  // NEW: Handle applying improved prompt
  const handleApplyImprovedPrompt = (improvedPrompt: string) => {
    if (isAdvancedMode) {
      // For advanced mode, we'll just put the improved prompt in the role/persona field
      // This is a simple approach - a more sophisticated implementation could parse the improved prompt
      setAdvancedPrompt(prev => ({
        ...prev,
        rolePersona: improvedPrompt
      }));
    } else {
      // For simple mode, replace the prompt template
      setFormData(prev => ({
        ...prev,
        promptTemplate: improvedPrompt
      }));
    }
    
    // Hide the improve prompt section
    setShowImprovePrompt(false);
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
                  {agent ? 'Edit Prompt Agent' : 'Create New Prompt Agent'}
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Design a custom prompt agent with specialized templates and behaviors
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
                  Prompt Agent Name *
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
                placeholder="Describe what this prompt agent does and how it helps users..."
                rows={3}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                required
              />
            </div>

            {/* NEW: Advanced Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Advanced Prompt Mode</span>
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Use structured prompt engineering with professional templates
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(!isAdvancedMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isAdvancedMode 
                    ? 'bg-blue-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isAdvancedMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* NEW: Improve My Prompt Toggle */}
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div>
                <h4 className="font-medium text-green-900 dark:text-green-100 mb-1 flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Improve My Prompt</span>
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Use AI to improve your prompt with suggestions from an AI assistant
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImprovePrompt(!showImprovePrompt)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showImprovePrompt 
                    ? 'bg-green-600' 
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showImprovePrompt ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* NEW: Improve My Prompt Section */}
            {showImprovePrompt && (
              <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-900/10">
                <PromptAgentAdvanced onApplyImprovedPrompt={handleApplyImprovedPrompt} />
              </div>
            )}

            {/* Prompt Template Section - Conditional based on mode */}
            {!isAdvancedMode ? (
              // EXISTING Simple Mode (keep exactly as is)
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
            ) : (
              // NEW Advanced Mode
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                    Advanced Prompt Builder
                  </h3>
                  <div className="flex items-center space-x-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <Lightbulb className="w-3 h-3" />
                    <span>Professional prompt engineering structure</span>
                  </div>
                </div>

                {/* Role/Persona */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Role/Persona *
                  </label>
                  <textarea
                    value={advancedPrompt.rolePersona}
                    onChange={(e) => setAdvancedPrompt(prev => ({ ...prev, rolePersona: e.target.value }))}
                    placeholder="You are an Advanced AI Agent Manager for the ModelShift AI platform. You are an expert in AI model orchestration, agent behavior configuration, and intelligent routing between different AI models..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                    required
                  />
                </div>

                {/* Goal/Task */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Goal/Task *
                  </label>
                  <textarea
                    value={advancedPrompt.goalTask}
                    onChange={(e) => setAdvancedPrompt(prev => ({ ...prev, goalTask: e.target.value }))}
                    placeholder="Your primary objective is to intelligently manage and coordinate multiple AI agents within the ModelShift ecosystem. This includes: analyzing incoming requests, managing smooth transitions between different AI agents..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                    required
                  />
                </div>

                {/* Context/Background */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Context/Background
                  </label>
                  <textarea
                    value={advancedPrompt.contextBackground}
                    onChange={(e) => setAdvancedPrompt(prev => ({ ...prev, contextBackground: e.target.value }))}
                    placeholder="ModelShift AI is a platform that provides access to multiple AI models including Creative Writer, Technical Expert, Marketing Specialist..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                {/* Constraints/Rules */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Constraints/Rules
                  </label>
                  <textarea
                    value={advancedPrompt.constraintsRules}
                    onChange={(e) => setAdvancedPrompt(prev => ({ ...prev, constraintsRules: e.target.value }))}
                    placeholder="Always maintain conversation context when switching between AI models. Clearly indicate when a model switch occurs. Ensure response consistency..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                {/* Style/Format Requirements */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Style/Format Requirements
                  </label>
                  <textarea
                    value={advancedPrompt.styleFormat}
                    onChange={(e) => setAdvancedPrompt(prev => ({ ...prev, styleFormat: e.target.value }))}
                    placeholder="Use clear, professional communication with technical accuracy. Provide structured responses with clear section headers when appropriate..."
                    rows={3}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                {/* Generated Prompt Preview */}
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-lg p-4">
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-2">
                    Generated Prompt Template Preview
                  </h4>
                  <div className="bg-neutral-900 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-neutral-100 whitespace-pre-wrap">
                      {generateCombinedPrompt() || 'Generated template will appear here...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

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
                <h3 className="font-medium text-neutral-900 dark:text-white">Test Your Template</h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Test Input
                  </label>
                  <textarea
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Enter sample input to test your template..."
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
              disabled={
                !formData.name?.trim() || 
                !formData.description?.trim() || 
                (isAdvancedMode 
                  ? !advancedPrompt.rolePersona?.trim() || !advancedPrompt.goalTask?.trim()
                  : !formData.promptTemplate?.trim()
                )
              }
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save className="w-4 h-4" />
              <span>{agent ? 'Update Prompt Agent' : 'Create Prompt Agent'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}