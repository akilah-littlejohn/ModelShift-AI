// This file is kept as a minimal stub to prevent import errors
// It provides no-op implementations of analytics functions

export class MigrationReadyAnalyticsService {
  configure() {}
  
  async trackEvent() {
    // No-op implementation
  }
  
  getAnalyticsSummary() {
    return {
      totalRequests: 0,
      totalSpend: 0,
      avgResponseTime: 0,
      successRate: 0,
      usageData: [],
      providerData: [],
      agentData: [],
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString()
      }
    };
  }
  
  getSyncQueueStatus() {
    return { pending: 0 };
  }
}

// Singleton instance
export const analyticsService = new MigrationReadyAnalyticsService();