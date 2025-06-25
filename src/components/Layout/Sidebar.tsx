import React from 'react';
import { 
  Brain, 
  Key, 
  History, 
  Settings, 
  Bot,
  FileText,
  UserCog,
  Swords
} from 'lucide-react';
import { AgentService } from '../../lib/agents';
import * as Icons from 'lucide-react';
import { Link } from 'react-router-dom';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navigation = [
  { id: 'playground', name: 'AI Playground', icon: Brain },
  { id: 'debate', name: 'AI Debate Arena', icon: Swords },
  { id: 'agents', name: 'Prompt Agent Management', icon: Bot },
  { id: 'keys', name: 'API Keys', icon: Key },
  { id: 'history', name: 'History', icon: History },
  { id: 'sdk-docs', name: 'SDK Docs', icon: FileText },
  { id: 'settings', name: 'Settings', icon: UserCog },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const agents = AgentService.getAllAgents().slice(0, 6); // Show first 6 agents

  return (
    <div className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-6">
          {/* Main Navigation */}
          <div>
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
              Platform
            </h3>
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <li key={item.id}>
                    <Link
                      to={`/${item.id === 'playground' ? '' : item.id}`}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      }`}
                      onClick={() => onViewChange(item.id)}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Quick Access Agents */}
          {agents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                  Quick Access
                </h3>
                <Link
                  to="/agents"
                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
                  onClick={() => onViewChange('agents')}
                >
                  View All
                </Link>
              </div>
              <ul className="space-y-1">
                {agents.map((agent) => {
                  const isActive = activeView === agent.id;
                  const IconComponent = Icons[agent.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;
                  
                  return (
                    <li key={agent.id}>
                      <button
                        onClick={() => onViewChange(agent.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-secondary-100 dark:bg-secondary-900/30 text-secondary-700 dark:text-secondary-300'
                            : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        {IconComponent ? (
                          <IconComponent className="w-5 h-5" />
                        ) : (
                          <Bot className="w-5 h-5" />
                        )}
                        <span className="truncate">{agent.name}</span>
                        {agent.isCustom && (
                          <span className="w-2 h-2 bg-accent-500 rounded-full flex-shrink-0"></span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>
      </div>
      
      {/* Built with Bolt badge */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <a 
          href="https://bolt.new" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors text-sm text-neutral-600 dark:text-neutral-400"
        >
          <span>Built with Bolt</span>
        </a>
      </div>
    </div>
  );
}