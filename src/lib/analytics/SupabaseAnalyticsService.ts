import { MigrationReadyAnalyticsService } from './AnalyticsService';
import { supabase, db } from '../supabase';
import type { AnalyticsEvent, AnalyticsSummary, AnalyticsConfig } from './types';

export class SupabaseAnalyticsService extends MigrationReadyAnalyticsService {
  constructor() {
    super({
      mode: 'supabase',
      supabaseClient: supabase,
      enableRealTimeSync: true
    });
  }

  /**
   * Override to use Supabase for analytics summary
   */
  async getAnalyticsSummaryFromSupabase(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AnalyticsSummary> {
    try {
      // Try to get data from Supabase first
      const events = await db.analytics.getEvents(
        userId,
        startDate.toISOString(),
        endDate.toISOString()
      );

      if (events.length > 0) {
        return this.processSupabaseEvents(events, startDate, endDate);
      }
    } catch (error) {
      console.warn('Failed to get analytics from Supabase, falling back to local:', error);
    }

    // Fallback to local storage
    return this.getAnalyticsSummary(userId, startDate, endDate);
  }

  /**
   * Process Supabase events into analytics summary
   */
  private processSupabaseEvents(
    events: any[],
    startDate: Date,
    endDate: Date
  ): AnalyticsSummary {
    const processedEvents: AnalyticsEvent[] = events.map(event => ({
      id: event.id,
      userId: event.user_id,
      eventType: event.event_type,
      providerId: event.provider_id,
      agentId: event.agent_id,
      promptLength: event.prompt_length,
      responseLength: event.response_length,
      success: event.success,
      errorType: event.error_type,
      metrics: event.metrics,
      metadata: event.metadata,
      timestamp: event.timestamp
    }));

    return {
      totalRequests: processedEvents.length,
      totalSpend: this.calculateTotalCost(processedEvents),
      avgResponseTime: this.calculateAverageLatency(processedEvents),
      successRate: this.calculateSuccessRate(processedEvents),
      usageData: this.generateUsageData(processedEvents, startDate, endDate),
      providerData: this.generateProviderData(processedEvents),
      agentData: this.generateAgentData(processedEvents),
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  }

  /**
   * Override trackEvent to save to Supabase
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    try {
      // Save to Supabase
      await db.analytics.createEvent({
        id: fullEvent.id,
        user_id: fullEvent.userId,
        event_type: fullEvent.eventType,
        provider_id: fullEvent.providerId,
        agent_id: fullEvent.agentId,
        prompt_length: fullEvent.promptLength,
        response_length: fullEvent.responseLength,
        success: fullEvent.success,
        error_type: fullEvent.errorType,
        metrics: fullEvent.metrics,
        metadata: fullEvent.metadata,
        timestamp: fullEvent.timestamp
      });

      // Also save to local storage as backup
      this.saveToLocalStorage(fullEvent);
    } catch (error) {
      console.warn('Failed to save analytics to Supabase, saving locally:', error);
      
      // Fallback to local storage
      this.saveToLocalStorage(fullEvent);
      this.addToSyncQueue(fullEvent);
    }
  }

  /**
   * Get analytics insights using Edge Function
   */
  async getAnalyticsInsights(
    userId: string,
    startDate: Date,
    endDate: Date,
    providers?: string[],
    agents?: string[]
  ): Promise<any> {
    try {
      const { data, error } = await supabase.functions.invoke('analytics-dashboard', {
        body: {
          userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          providers,
          agents
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get analytics insights:', error);
      throw error;
    }
  }

  /**
   * Sync local events to Supabase
   */
  async syncToSupabase(): Promise<{ synced: number; failed: number }> {
    const localEvents = this.getLocalEvents();
    let synced = 0;
    let failed = 0;

    for (const event of localEvents) {
      try {
        await db.analytics.createEvent({
          id: event.id,
          user_id: event.userId,
          event_type: event.eventType,
          provider_id: event.providerId,
          agent_id: event.agentId,
          prompt_length: event.promptLength,
          response_length: event.responseLength,
          success: event.success,
          error_type: event.errorType,
          metrics: event.metrics,
          metadata: event.metadata,
          timestamp: event.timestamp
        });
        synced++;
      } catch (error) {
        console.error('Failed to sync event:', event.id, error);
        failed++;
      }
    }

    // Clear successfully synced events
    if (synced > 0) {
      this.clearLocalData();
    }

    return { synced, failed };
  }

  /**
   * Check if Supabase is available
   */
  async isSupabaseAvailable(): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('id')
        .limit(1);
      
      return !error;
    } catch (error) {
      return false;
    }
  }

  // Private methods from parent class that need to be accessible
  private calculateTotalCost(events: AnalyticsEvent[]): number {
    return Number(events.reduce((sum, event) => sum + (event.metrics.cost || 0), 0).toFixed(4));
  }

  private calculateAverageLatency(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;
    const totalLatency = events.reduce((sum, event) => sum + (event.metrics.latency || 0), 0);
    return Math.round(totalLatency / events.length);
  }

  private calculateSuccessRate(events: AnalyticsEvent[]): number {
    if (events.length === 0) return 0;
    const successCount = events.filter(event => event.success).length;
    return Number(((successCount / events.length) * 100).toFixed(1));
  }

  private generateUsageData(
    events: AnalyticsEvent[],
    startDate: Date,
    endDate: Date
  ): Array<{ date: string; requests: number; cost: number }> {
    const dailyData = new Map<string, { requests: number; cost: number }>();
    
    // Initialize all days in range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData.set(dateKey, { requests: 0, cost: 0 });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Aggregate events by day
    events.forEach(event => {
      const dateKey = event.timestamp.split('T')[0];
      const existing = dailyData.get(dateKey) || { requests: 0, cost: 0 };
      
      dailyData.set(dateKey, {
        requests: existing.requests + 1,
        cost: existing.cost + (event.metrics.cost || 0)
      });
    });
    
    return Array.from(dailyData.entries())
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString(),
        requests: data.requests,
        cost: Number(data.cost.toFixed(4))
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  private generateProviderData(events: AnalyticsEvent[]): Array<{
    name: string;
    value: number;
    cost: number;
    color: string;
  }> {
    const providerStats = new Map<string, { count: number; cost: number }>();
    
    events.forEach(event => {
      const existing = providerStats.get(event.providerId) || { count: 0, cost: 0 };
      providerStats.set(event.providerId, {
        count: existing.count + 1,
        cost: existing.cost + (event.metrics.cost || 0)
      });
    });
    
    const totalRequests = events.length;
    const providerColors: Record<string, string> = {
      openai: '#10A37F',
      gemini: '#4285F4',
      claude: '#D97706',
      ibm: '#054ADA'
    };
    
    return Array.from(providerStats.entries()).map(([providerId, stats]) => ({
      name: this.getProviderDisplayName(providerId),
      value: totalRequests > 0 ? Math.round((stats.count / totalRequests) * 100) : 0,
      cost: Number(stats.cost.toFixed(4)),
      color: providerColors[providerId] || '#6b7280'
    }));
  }

  private generateAgentData(events: AnalyticsEvent[]): Array<{
    name: string;
    requests: number;
    success: number;
  }> {
    const agentStats = new Map<string, { requests: number; successes: number }>();
    
    events.forEach(event => {
      const agentName = event.agentId || 'Direct Input';
      const existing = agentStats.get(agentName) || { requests: 0, successes: 0 };
      
      agentStats.set(agentName, {
        requests: existing.requests + 1,
        successes: existing.successes + (event.success ? 1 : 0)
      });
    });
    
    return Array.from(agentStats.entries())
      .map(([name, stats]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        requests: stats.requests,
        success: Math.round((stats.successes / Math.max(stats.requests, 1)) * 100)
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }

  private getProviderDisplayName(providerId: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      gemini: 'Google Gemini',
      claude: 'Anthropic Claude',
      ibm: 'IBM WatsonX'
    };
    return names[providerId] || providerId;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToLocalStorage(event: AnalyticsEvent): void {
    // Implementation from parent class
    const events = this.getLocalEvents();
    events.push(event);
    
    // Maintain size limit
    if (events.length > 10000) {
      events.splice(0, events.length - 10000);
    }
    
    localStorage.setItem('modelshift-analytics-events', JSON.stringify(events));
  }

  private getLocalEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem('modelshift-analytics-events');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load analytics events from localStorage:', error);
      return [];
    }
  }

  private addToSyncQueue(event: AnalyticsEvent): void {
    // Implementation from parent class
    const queue = this.getPendingSyncQueue();
    queue.push(event);
    localStorage.setItem('modelshift-analytics-sync-queue', JSON.stringify(queue));
  }

  private getPendingSyncQueue(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem('modelshift-analytics-sync-queue');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      return [];
    }
  }
}

// Create enhanced analytics service instance
export const supabaseAnalyticsService = new SupabaseAnalyticsService();