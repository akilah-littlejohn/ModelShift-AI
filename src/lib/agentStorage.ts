import type { Agent } from '../types';

const STORAGE_KEY = 'modelshift-ai-custom-agents';

export const agentStorage = {
  save(agent: Agent): void {
    const agents = this.list();
    const existingIndex = agents.findIndex(a => a.id === agent.id);
    
    if (existingIndex >= 0) {
      agents[existingIndex] = agent;
    } else {
      agents.push(agent);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
  },

  list(): Agent[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading agents from storage:', error);
      return [];
    }
  },

  get(id: string): Agent | null {
    const agents = this.list();
    return agents.find(agent => agent.id === id) || null;
  },

  delete(id: string): void {
    const agents = this.list();
    const filtered = agents.filter(agent => agent.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  },

  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  export(): string {
    const agents = this.list();
    return JSON.stringify(agents, null, 2);
  },

  import(agentsJson: string): void {
    try {
      const importedAgents: Agent[] = JSON.parse(agentsJson);
      const existingAgents = this.list();
      
      // Merge imported agents with existing ones, avoiding duplicates
      const mergedAgents = [...existingAgents];
      
      importedAgents.forEach(importedAgent => {
        const existingIndex = mergedAgents.findIndex(a => a.id === importedAgent.id);
        if (existingIndex >= 0) {
          // Update existing agent
          mergedAgents[existingIndex] = { ...importedAgent, isCustom: true };
        } else {
          // Add new agent
          mergedAgents.push({ ...importedAgent, isCustom: true });
        }
      });
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedAgents));
    } catch (error) {
      throw new Error('Invalid agent data format');
    }
  }
};