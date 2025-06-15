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

    // For custom agents, use their template directly
    if (agent.isCustom || agent.promptTemplate.includes('{input}')) {
      return agent.promptTemplate.replace(/\{input\}/g, input);
    }

    // Legacy built-in agent handling (won't be used since no built-in agents)
    switch (agentId) {
      case 'business-name':
        return PromptBuilder.chainOfThought(
          'Generate 5 creative, memorable, and brandable business names. Consider domain availability, trademark potential, and marketing appeal.',
          input
        );

      case 'saas-pitch':
        return PromptBuilder.chainOfThought(
          'Create a compelling SaaS pitch that includes: problem statement, solution overview, market opportunity, business model, competitive advantage, and call to action.',
          input
        );

      case 'support-summarizer':
        return PromptBuilder.classification(
          'Summarize the support ticket and classify it into categories: Technical Issue, Billing, Feature Request, Account Access, or General Inquiry. Provide priority level (High/Medium/Low) and suggested resolution steps.',
          input,
          ['Technical Issue', 'Billing', 'Feature Request', 'Account Access', 'General Inquiry']
        );

      default:
        return PromptBuilder.simpleInstruction(agent.promptTemplate, input);
    }
  }
}

// Export for backward compatibility
export const agents = AgentService.getAllAgents();