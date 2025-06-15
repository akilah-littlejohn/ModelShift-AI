import React, { useState, useEffect } from 'react';
import { Plus, Bot, Edit, Trash2, Copy, Eye, Settings, Zap } from 'lucide-react';
import { AgentEditor } from './AgentEditor';
import { AgentPreview } from './AgentPreview';
import { agentStorage } from '../../lib/agentStorage';
import type { Agent } from '../../types';
import toast from 'react-hot-toast';

export function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [previewAgent, setPreviewAgent] = useState<Agent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    const storedAgents = agentStorage.list();
    setAgents(storedAgents);
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowEditor(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setShowEditor(true);
  };

  const handleDeleteAgent = (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt agent?')) {
      agentStorage.delete(agentId);
      setAgents(agents.filter(agent => agent.id !== agentId));
      toast.success('Prompt agent deleted successfully');
    }
  };

  const handleDuplicateAgent = (agent: Agent) => {
    const duplicatedAgent: Agent = {
      ...agent,
      id: `${agent.id}-copy-${Date.now()}`,
      name: `${agent.name} (Copy)`,
      isCustom: true
    };
    
    agentStorage.save(duplicatedAgent);
    setAgents([...agents, duplicatedAgent]);
    toast.success('Prompt agent duplicated successfully');
  };

  const handleSaveAgent = (agent: Agent) => {
    agentStorage.save(agent);
    
    if (editingAgent) {
      setAgents(agents.map(a => a.id === agent.id ? agent : a));
      toast.success('Prompt agent updated successfully');
    } else {
      setAgents([...agents, agent]);
      toast.success('Prompt agent created successfully');
    }
    
    setShowEditor(false);
    setEditingAgent(null);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || agent.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [...new Set(agents.map(agent => agent.category))];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Prompt Agent Management
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Create, customize, and manage your prompt agents with specialized templates and behaviors
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search prompt agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateAgent}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Create Prompt Agent</span>
          </button>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <Bot className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
              {searchTerm || selectedCategory ? 'No Prompt Agents Found' : 'No Custom Prompt Agents Yet'}
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-4">
              {searchTerm || selectedCategory 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first custom prompt agent to get started'
              }
            </p>
            {!searchTerm && !selectedCategory && (
              <button
                onClick={handleCreateAgent}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Create Prompt Agent</span>
              </button>
            )}
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onEdit={() => handleEditAgent(agent)}
              onDelete={() => handleDeleteAgent(agent.id)}
              onDuplicate={() => handleDuplicateAgent(agent)}
              onPreview={() => setPreviewAgent(agent)}
            />
          ))
        )}
      </div>

      {/* Agent Editor Modal */}
      {showEditor && (
        <AgentEditor
          agent={editingAgent}
          onSave={handleSaveAgent}
          onClose={() => {
            setShowEditor(false);
            setEditingAgent(null);
          }}
        />
      )}

      {/* Agent Preview Modal */}
      {previewAgent && (
        <AgentPreview
          agent={previewAgent}
          onClose={() => setPreviewAgent(null)}
          onEdit={() => {
            setPreviewAgent(null);
            handleEditAgent(previewAgent);
          }}
        />
      )}
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreview: () => void;
}

function AgentCard({ agent, onEdit, onDelete, onDuplicate, onPreview }: AgentCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-lg flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">
              {agent.name}
            </h3>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300 rounded-full text-xs font-medium">
                {agent.category}
              </span>
              {agent.isCustom && (
                <span className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-xs font-medium">
                  Custom
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions Dropdown */}
        <div className="relative group">
          <button className="p-2 text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors">
            <Settings className="w-4 h-4" />
          </button>
          
          <div className="absolute right-0 top-8 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
            <div className="p-1">
              <button
                onClick={onPreview}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={onEdit}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={onDuplicate}
                className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                <Copy className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
              {agent.isCustom && (
                <button
                  onClick={onDelete}
                  className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-3">
        {agent.description}
      </p>

      {/* Examples */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
          Example Use Case
        </h4>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 italic">
          "{agent.examples[0]}"
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center space-x-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Zap className="w-3 h-3" />
          <span>{agent.promptTemplate ? 'Advanced' : 'Basic'} Template</span>
        </div>
        
        <button
          onClick={onPreview}
          className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium transition-colors"
        >
          View Details →
        </button>
      </div>
    </div>
  );
}