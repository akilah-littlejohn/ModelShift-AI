import type { AnalyticsEvent, AnalyticsMetrics, AnalyticsSummary, AnalyticsConfig } from './types';

export class MigrationReadyAnalyticsService {
  private config: AnalyticsConfig;
  private pendingSyncQueue: AnalyticsEvent[] = [];
  private readonly STORAGE_KEY = 'modelshift-analytics-events';
  private readonly SYNC_QUEUE_KEY = 'modelshift-analytics-sync-queue';
  private readonly MAX_LOCAL_EVENTS = 10000; // Prevent unlimited growth

  constructor(config: AnalyticsConfig = { mode: 'local' }) {
    this.config = config;
    this.loadPendingSyncQueue();
  }

  /**
   * Configure the analytics service
   */
  configure(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
    
    // If switching to Supabase mode, attempt to sync pending events
    if (config.mode === 'supabase' && this.pendingSyncQueue.length > 0) {
      this.syncPendingEvents();
    }
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date().toISOString()
    };

    try {
      if (this.config.mode === 'supabase' && this.config.supabaseClient) {
        await this.saveToSupabase(fullEvent);
      } else {
        this.saveToLocalStorage(fullEvent);
        
        // If Supabase is configured but failed, add to sync queue
        if (this.config.mode === 'supabase') {
          this.addToSyncQueue(fullEvent);
        }
      }
    } catch (error) {
      console.warn('Failed to track analytics event:', error);
      // Always fallback to local storage
      this.saveToLocalStorage(fullEvent);
      
      if (this.config.mode === 'supabase') {
        this.addToSyncQueue(fullEvent);
      }
    }
  }

  /**
   * Get analytics summary for a time range
   */
  getAnalyticsSummary(
    userId: string,
    startDate: Date,
    endDate: Date
  ): AnalyticsSummary {
    const events = this.getEventsInRange(userId, startDate, endDate);
    
    return {
      totalRequests: events.length,
      totalSpend: this.calculateTotalCost(events),
      avgResponseTime: this.calculateAverageLatency(events),
      successRate: this.calculateSuccessRate(events),
      usageData: this.generateUsageData(events, startDate, endDate),
      providerData: this.generateProviderData(events),
      agentData: this.generateAgentData(events),
      timeRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    };
  }

  /**
   * Get events for a specific time range
   */
  private getEventsInRange(userId: string, startDate: Date, endDate: Date): AnalyticsEvent[] {
    const allEvents = this.getLocalEvents();
    
    return allEvents.filter(event => {
      const eventDate = new Date(event.timestamp);
      return event.userId === userId &&
             eventDate >= startDate &&
             eventDate <= endDate;
    });
  }

  /**
   * Generate daily usage data
   */
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

  /**
   * Generate provider usage data
   */
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

  /**
   * Generate agent usage data
   */
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

  /**
   * Calculate metrics
   */
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

  /**
   * Local storage operations
   */
  private saveToLocalStorage(event: AnalyticsEvent): void {
    const events = this.getLocalEvents();
    events.push(event);
    
    // Maintain size limit
    if (events.length > this.MAX_LOCAL_EVENTS) {
      events.splice(0, events.length - this.MAX_LOCAL_EVENTS);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(events));
  }

  private getLocalEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load analytics events from localStorage:', error);
      return [];
    }
  }

  /**
   * Supabase operations
   */
  private async saveToSupabase(event: AnalyticsEvent): Promise<void> {
    if (!this.config.supabaseClient) {
      throw new Error('Supabase client not configured');
    }

    const { error } = await this.config.supabaseClient
      .from('analytics_events')
      .insert([{
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
      }]);

    if (error) {
      throw error;
    }
  }

  /**
   * Sync queue operations
   */
  private addToSyncQueue(event: AnalyticsEvent): void {
    this.pendingSyncQueue.push(event);
    this.savePendingSyncQueue();
  }

  private loadPendingSyncQueue(): void {
    try {
      const stored = localStorage.getItem(this.SYNC_QUEUE_KEY);
      this.pendingSyncQueue = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load sync queue:', error);
      this.pendingSyncQueue = [];
    }
  }

  private savePendingSyncQueue(): void {
    localStorage.setItem(this.SYNC_QUEUE_KEY, JSON.stringify(this.pendingSyncQueue));
  }

  private async syncPendingEvents(): Promise<void> {
    if (!this.config.supabaseClient || this.pendingSyncQueue.length === 0) {
      return;
    }

    const eventsToSync = [...this.pendingSyncQueue];
    
    try {
      for (const event of eventsToSync) {
        await this.saveToSupabase(event);
      }
      
      // Clear successfully synced events
      this.pendingSyncQueue = [];
      this.savePendingSyncQueue();
      
      console.log(`Successfully synced ${eventsToSync.length} analytics events to Supabase`);
    } catch (error) {
      console.error('Failed to sync analytics events:', error);
    }
  }

  /**
   * Utility methods
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

  /**
   * Get sync queue status
   */
  getSyncQueueStatus(): { pending: number; lastSync?: string } {
    return {
      pending: this.pendingSyncQueue.length,
      lastSync: this.config.lastSyncTime
    };
  }

  /**
   * Clear all local data (for testing/reset)
   */
  clearLocalData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SYNC_QUEUE_KEY);
    this.pendingSyncQueue = [];
  }
}

// Singleton instance
export const analyticsService = new MigrationReadyAnalyticsService();