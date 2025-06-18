import { supabase, adminSupabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

interface AnalyticsEvent {
  id?: string;
  user_id: string;
  event_type: string;
  provider_id: string;
  agent_id?: string;
  prompt_length: number;
  response_length: number;
  success: boolean;
  error_type?: string;
  metrics: {
    latency: number;
    tokens: number;
    cost: number;
    [key: string]: any;
  };
  metadata?: Record<string, any>;
  timestamp?: string;
}

interface AnalyticsConfig {
  useAdminClient: boolean;
  fallbackToLocalStorage: boolean;
  debug: boolean;
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private localStorageKey = 'modelshift-analytics-events';
  private pendingEventsKey = 'modelshift-analytics-pending-events';

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      useAdminClient: true,
      fallbackToLocalStorage: true,
      debug: false,
      ...config
    };
  }

  /**
   * Track an analytics event
   */
  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: AnalyticsEvent = {
      ...event,
      id: `evt_${uuidv4()}`,
      timestamp: new Date().toISOString()
    };

    if (this.config.debug) {
      console.log('📊 Tracking analytics event:', fullEvent);
    }

    try {
      // Determine which client to use
      const client = this.config.useAdminClient && adminSupabase ? adminSupabase : supabase;
      
      if (!client) {
        throw new Error('No Supabase client available');
      }

      const { error } = await client
        .from('analytics_events')
        .insert([fullEvent]);

      if (error) {
        throw error;
      }

      if (this.config.debug) {
        console.log('✅ Analytics event tracked successfully');
      }
    } catch (error) {
      console.warn('⚠️ Failed to track analytics event:', error);
      
      if (this.config.fallbackToLocalStorage) {
        this.saveToLocalStorage(fullEvent);
        this.addToPendingEvents(fullEvent);
      }
    }
  }

  /**
   * Save event to local storage
   */
  private saveToLocalStorage(event: AnalyticsEvent): void {
    try {
      const events = this.getLocalEvents();
      events.push(event);
      
      // Limit the number of stored events to prevent excessive storage use
      const maxEvents = 1000;
      const trimmedEvents = events.slice(-maxEvents);
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(trimmedEvents));
      
      if (this.config.debug) {
        console.log('📦 Saved event to local storage, total events:', trimmedEvents.length);
      }
    } catch (error) {
      console.error('❌ Failed to save event to local storage:', error);
    }
  }

  /**
   * Get events from local storage
   */
  private getLocalEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get events from local storage:', error);
      return [];
    }
  }

  /**
   * Add event to pending events queue for later sync
   */
  private addToPendingEvents(event: AnalyticsEvent): void {
    try {
      const pendingEvents = this.getPendingEvents();
      pendingEvents.push(event);
      localStorage.setItem(this.pendingEventsKey, JSON.stringify(pendingEvents));
      
      if (this.config.debug) {
        console.log('⏳ Added event to pending queue, total pending:', pendingEvents.length);
      }
    } catch (error) {
      console.error('❌ Failed to add event to pending queue:', error);
    }
  }

  /**
   * Get pending events from local storage
   */
  private getPendingEvents(): AnalyticsEvent[] {
    try {
      const stored = localStorage.getItem(this.pendingEventsKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Failed to get pending events from local storage:', error);
      return [];
    }
  }

  /**
   * Sync pending events to Supabase
   */
  async syncPendingEvents(): Promise<{ synced: number, failed: number }> {
    const pendingEvents = this.getPendingEvents();
    
    if (pendingEvents.length === 0) {
      return { synced: 0, failed: 0 };
    }
    
    if (this.config.debug) {
      console.log(`🔄 Attempting to sync ${pendingEvents.length} pending events`);
    }
    
    let synced = 0;
    let failed = 0;
    
    // Determine which client to use
    const client = this.config.useAdminClient && adminSupabase ? adminSupabase : supabase;
    
    if (!client) {
      console.warn('⚠️ No Supabase client available for syncing');
      return { synced: 0, failed: pendingEvents.length };
    }
    
    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    const batches = [];
    
    for (let i = 0; i < pendingEvents.length; i += batchSize) {
      batches.push(pendingEvents.slice(i, i + batchSize));
    }
    
    for (const batch of batches) {
      try {
        const { error } = await client
          .from('analytics_events')
          .insert(batch);
        
        if (error) {
          console.warn('⚠️ Failed to sync batch:', error);
          failed += batch.length;
        } else {
          synced += batch.length;
        }
      } catch (error) {
        console.error('❌ Error syncing batch:', error);
        failed += batch.length;
      }
    }
    
    if (synced > 0) {
      // Remove synced events from pending queue
      const remainingEvents = pendingEvents.slice(synced);
      localStorage.setItem(this.pendingEventsKey, JSON.stringify(remainingEvents));
      
      if (this.config.debug) {
        console.log(`✅ Synced ${synced} events, ${remainingEvents.length} remaining`);
      }
    }
    
    return { synced, failed };
  }

  /**
   * Get pending events count
   */
  getPendingEventsCount(): number {
    return this.getPendingEvents().length;
  }

  /**
   * Clear all analytics data from local storage
   */
  clearLocalData(): void {
    localStorage.removeItem(this.localStorageKey);
    localStorage.removeItem(this.pendingEventsKey);
    
    if (this.config.debug) {
      console.log('🧹 Cleared all local analytics data');
    }
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService({
  useAdminClient: true,
  fallbackToLocalStorage: true,
  debug: import.meta.env.DEV
});