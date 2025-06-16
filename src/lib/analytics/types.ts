export interface AnalyticsEvent {
  id: string;
  userId: string;
  eventType: 'prompt_execution' | 'provider_call' | 'agent_usage' | 'error';
  providerId: string;
  agentId?: string;
  promptLength: number;
  responseLength: number;
  success: boolean;
  errorType?: string;
  metrics: AnalyticsMetrics;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AnalyticsMetrics {
  latency: number; // milliseconds
  tokens: number;
  cost: number; // USD
  inputTokens?: number;
  outputTokens?: number;
}

export interface AnalyticsSummary {
  totalRequests: number;
  totalSpend: number;
  avgResponseTime: number;
  successRate: number;
  usageData: Array<{ date: string; requests: number; cost: number }>;
  providerData: Array<{ name: string; value: number; cost: number; color: string }>;
  agentData: Array<{ name: string; requests: number; success: number }>;
  timeRange: {
    start: string;
    end: string;
  };
}

export interface AnalyticsConfig {
  mode: 'local' | 'supabase' | 'hybrid';
  supabaseClient?: any;
  lastSyncTime?: string;
  enableRealTimeSync?: boolean;
}

export interface DailyAggregation {
  id: string;
  userId: string;
  date: string;
  totalRequests: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  providerBreakdown: Record<string, { requests: number; cost: number }>;
  agentBreakdown: Record<string, { requests: number; cost: number }>;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsInsight {
  type: 'cost_spike' | 'performance_degradation' | 'high_error_rate' | 'usage_pattern';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  recommendation?: string;
  data?: Record<string, any>;
  timestamp: string;
}