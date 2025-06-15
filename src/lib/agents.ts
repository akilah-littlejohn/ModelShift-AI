import { PromptBuilder } from './modelshift-ai-sdk';
import { agentStorage } from './agentStorage';
import type { Agent } from '../types';

// No built-in agents - empty array
const builtInAgents: Agent[] = [];

export class AgentService {
  static getAllAgents(): Agent[] {
    const customAgents = agentStorage.list();
    return [...builtInAgents, ...customAgents];
  }

  static getAgent(id: string): Agent | undefined {
    // First check built-in agents (empty now)
    const builtIn = builtInAgents.find(agent => agent.id === id);
    if (builtIn) return builtIn;
    
    // Then check custom agents
    return agentStorage.get(id);
  }

  static getBuiltInAgents(): Agent[] {
    return builtInAgents;
  }

  static getCustomAgents(): Agent[] {
    return agentStorage.list();
  }

  static buildPrompt(agentId: string, input: string): string {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Prompt agent '${agentId}' not found`);
    }

    // FIXED: Always use the agent's promptTemplate and replace {input} placeholder
    if (agent.promptTemplate && agent.promptTemplate.includes('{input}')) {
      return agent.promptTemplate.replace(/\{input\}/g, input);
    }

    // FIXED: If no {input} placeholder found, append input to the template
    if (agent.promptTemplate) {
      return `${agent.promptTemplate}\n\nInput: ${input}`;
    }

    // Fallback: if no template exists, use input directly
    return input;
  }
}

// Export for backward compatibility
export const agents = AgentService.getAllAgents();