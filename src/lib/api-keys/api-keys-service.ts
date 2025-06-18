import { supabase } from '../supabase';
import { serverEncryption } from './encryption';
import type { UserApiKey, ApiKeyFormData, ApiKeyListItem, ApiKeyStats } from './types';

/**
 * Service for managing user API keys
 */
export const apiKeysService = {
  /**
   * Create a new API key for a user
   */
  async createApiKey(userId: string, data: ApiKeyFormData): Promise<UserApiKey> {
    try {
      // Encrypt the API key
      const encrypted_key = serverEncryption.encrypt(data.key);
      
      // Insert into database
      const { data: apiKey, error } = await supabase
        .from('user_api_keys')
        .insert([{
          user_id: userId,
          provider_id: data.provider_id,
          encrypted_key,
          name: data.name || 'Default',
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        // Check for unique constraint violation
        if (error.code === '23505') {
          throw new Error(`You already have a key named "${data.name}" for this provider`);
        }
        throw error;
      }
      
      return apiKey;
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  },

  /**
   * Get all API keys for a user
   */
  async getUserApiKeys(userId: string): Promise<ApiKeyListItem[]> {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .order('provider_id')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Mask the keys for display
      return (data || []).map(key => ({
        id: key.id,
        provider_id: key.provider_id,
        name: key.name,
        is_active: key.is_active,
        created_at: key.created_at,
        last_used_at: key.last_used_at,
        masked_key: '••••••••••••••••••••••••••••••'
      }));
    } catch (error) {
      console.error('Failed to get user API keys:', error);
      throw error;
    }
  },

  /**
   * Get API key statistics for a user
   */
  async getApiKeyStats(userId: string): Promise<ApiKeyStats> {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const stats: ApiKeyStats = {
        total: data?.length || 0,
        active: data?.filter(key => key.is_active).length || 0,
        byProvider: {}
      };
      
      // Count keys by provider
      data?.forEach(key => {
        if (!stats.byProvider[key.provider_id]) {
          stats.byProvider[key.provider_id] = 0;
        }
        stats.byProvider[key.provider_id]++;
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get API key stats:', error);
      throw error;
    }
  },

  /**
   * Get a specific API key by ID
   */
  async getApiKey(userId: string, keyId: string): Promise<UserApiKey | null> {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Key not found
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get API key:', error);
      throw error;
    }
  },

  /**
   * Update an existing API key
   */
  async updateApiKey(userId: string, keyId: string, updates: Partial<ApiKeyFormData>): Promise<UserApiKey> {
    try {
      const updateData: any = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      
      if (updates.key !== undefined) {
        updateData.encrypted_key = serverEncryption.encrypt(updates.key);
      }
      
      if (Object.keys(updateData).length === 0) {
        throw new Error('No updates provided');
      }
      
      const { data, error } = await supabase
        .from('user_api_keys')
        .update(updateData)
        .eq('id', keyId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Failed to update API key:', error);
      throw error;
    }
  },

  /**
   * Toggle the active status of an API key
   */
  async toggleApiKeyStatus(userId: string, keyId: string, isActive: boolean): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ is_active: isActive })
        .eq('id', keyId)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to toggle API key status:', error);
      throw error;
    }
  },

  /**
   * Delete an API key
   */
  async deleteApiKey(userId: string, keyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete API key:', error);
      throw error;
    }
  },

  /**
   * Get the active API key for a specific provider
   */
  async getActiveApiKey(userId: string, providerId: string): Promise<UserApiKey | null> {
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No active key found
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error(`Failed to get active API key for ${providerId}:`, error);
      return null;
    }
  },

  /**
   * Update the last_used_at timestamp for an API key
   */
  async updateLastUsed(keyId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update last_used_at:', error);
      // Don't throw - this is a non-critical operation
    }
  },

  /**
   * Check if a user has any API keys configured
   */
  async hasApiKeys(userId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('user_api_keys')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      if (error) throw error;
      
      return count !== null && count > 0;
    } catch (error) {
      console.error('Failed to check if user has API keys:', error);
      return false;
    }
  }
};