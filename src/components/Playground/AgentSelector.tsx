import React from 'react';
import { Check, Plus, X } from 'lucide-react';
import { AgentService } from '../../lib/agents';
import * as Icons from 'lucide-react';

interface AgentSelectorProps {
  selected: string;
  onChange: (agentId: string) => void;
}

export function AgentSelector({ selected, onChange }: AgentSelectorProps) {
  const agents = AgentService.getAllAgents();

  if (agents.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg">
        <div className="w-16 h-16 bg-gradient-to-br from-secondary-500 to-accent-500 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Plus className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">
          No Agents Available
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          Create your first AI agent to get started with the playground
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          Go to Agent Management to create custom agents
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Clear Selection Option */}
      <div
        onClick={() => onChange('')}
        className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
          selected === ''
            ? 'border-neutral-400 bg-neutral-50 dark:bg-neutral-700'
            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
        }`}
      >
        <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected === ''
            ? 'border-neutral-500 bg-neutral-500'
            : 'border-neutral-300 dark:border-neutral-600'
        }`}>
          {selected === '' && <Check className="w-3 h-3 text-white" />}
        </div>

        <div className="pr-8">
          <div className="flex items-center space-x-3 mb-2">
            <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
            <div>
              <h4 className="font-semibold text-neutral-900 dark:text-white">
                No Agent (Direct Prompt)
              </h4>
              <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full">
                Direct Input
              </span>
            </div>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
            Use your input directly without any agent processing
          </p>
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            Example: "Write a short story about a robot"
          </p>
        </div>
      </div>

      {/* Agent Options */}
      {agents.map((agent) => {
        const isSelected = selected === agent.id;
        const IconComponent = Icons[agent.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
        
        return (
          <div
            key={agent.id}
            onClick={() => onChange(agent.id)}
            className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/20'
                : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
            }`}
          >
            {/* Selection Indicator */}
            <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? 'border-secondary-500 bg-secondary-500'
                : 'border-neutral-300 dark:border-neutral-600'
            }`}>
              {isSelected && <Check className="w-3 h-3 text-white" />}
            </div>

            <div className="pr-8">
              <div className="flex items-center space-x-3 mb-2">
                {IconComponent && <IconComponent className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />}
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-neutral-900 dark:text-white">
                      {agent.name}
                    </h4>
                    {agent.isCustom && (
                      <span className="px-2 py-1 bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 rounded-full text-xs font-medium">
                        Custom
                      </span>
                    )}
                  </div>
                  <span className="text-xs px-2 py-1 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-full">
                    {agent.category}
                  </span>
                </div>
              </div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                {agent.description}
              </p>
              {agent.examples && agent.examples.length > 0 && (
                <p className="text-xs text-neutral-500 dark:text-neutral-500">
                  Example: {agent.examples[0]}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}