// Core Types
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'pro' | 'enterprise';
  created_at: string;
  updated_at: string;
  usage_limit: number;
  usage_count: number;
}

export interface KeyRequirement {
  name: string;
  label: string;
  type: 'text' | 'password';
  placeholder?: string;
  required: boolean;
}

export interface APIKey {
  id: string;
  user_id: string;
  provider: string;
  keyData: Record<string, string>; // Changed from encrypted_key to structured keyData
  name: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
}

export interface PromptExecution {
  id: string;
  user_id: string;
  prompt: string;
  agent_type: string;
  providers: string[];
  responses: ProviderResponse[];
  created_at: string;
  execution_time: number;
  tokens_used: number;
}

export interface ProviderResponse {
  provider: string;
  response: string;
  latency: number;
  tokens: number;
  success: boolean;
  error?: string;
}

// API Configuration Interface
export interface ApiConfiguration {
  baseUrl: string;
  endpointPath: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers: Record<string, string>; // Static headers
  authHeaderName?: string; // e.g., 'Authorization', 'x-api-key'
  authHeaderPrefix?: string; // e.g., 'Bearer ', empty string for direct key
  apiKeyInUrlParam?: boolean; // For providers like Gemini that use URL params
  urlParamName?: string; // Name of the URL parameter for API key (e.g., 'key')
  requestBodyStructure: Record<string, any>; // Base structure of request body
  promptJsonPath: string; // JSON path where prompt should be inserted
  modelJsonPath?: string; // JSON path where model should be inserted
  parametersJsonPath?: string; // JSON path where parameters should be merged
  projectIdJsonPath?: string; // JSON path for project ID (IBM specific)
  responseJsonPath: string; // JSON path to extract response text
  errorJsonPath?: string; // JSON path to extract error message
  defaultModel: string;
  defaultParameters: Record<string, any>;
}

// Provider Types
export interface Provider {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  color: string;
  keyRequirements: KeyRequirement[];
  capabilities: {
    streaming: boolean;
    maxTokens: number;
    pricing: {
      input: number;
      output: number;
    };
  };
  isAvailable: boolean;
  apiConfig: ApiConfiguration; // New: data-driven API configuration
}

// Agent Types
export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  promptTemplate: string;
  examples: string[];
  isCustom?: boolean; // Added to distinguish custom agents
  
  // NEW: Advanced prompt mode fields (optional for backward compatibility)
  isAdvancedMode?: boolean;
  advancedPrompt?: {
    rolePersona?: string;
    goalTask?: string;
    contextBackground?: string;
    constraintsRules?: string;
    styleFormat?: string;
  };
}

// Configuration Copy-Paste Types
export interface SerializedConfig {
  version: string; // For future compatibility
  providerId: string;
  keyData: Record<string, string>; // Sensitive: will contain actual keys or placeholders
  agentId?: string; // Optional, if tied to a specific agent
  promptTemplate?: string; // Optional, if a specific template is exported
  model?: string; // Optional, overrides default model for provider
  parameters?: Record<string, any>; // Optional, overrides default generation parameters
  metadata?: {
    exportedAt: string;
    exportedBy?: string;
    description?: string;
  };
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Debate Mode Types
export interface DebateSideConfig {
  selectedProviders: string[];
  selectedAgent: string;
  label: string;
}

// UI Types
export interface ComparisonResult {
  provider: string;
  response: string;
  loading: boolean;
  error?: string;
  metrics: {
    latency: number;
    tokens: number;
    cost: number;
  };
  sideId?: 'A' | 'B'; // For debate mode
  sideLabel?: string; // For debate mode
}

export interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}