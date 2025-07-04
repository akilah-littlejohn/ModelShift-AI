import { supabase } from '../supabase';
import { serverEncryption } from './encryption';
import type { UserApiKey, ApiKeyFormData, ApiKeyListItem } from './types';

/**
 * Simple UUID validation
 */
const isUuid = (value: string): boolean => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(value);

/**
 * Database operations for user API keys
 */
export const apiKeysDb = {
  /**
   * Create a new API key
   */
  async create(userId: string, data: ApiKeyFormData): Promise<UserApiKey> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        throw new Error('Invalid user ID format');
      }
      
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
      
      if (error) throw error;
      
      return apiKey;
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  },

  /**
   * Get all API keys for a user
   */
  async getAll(userId: string): Promise<ApiKeyListItem[]> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        return []; // Return empty array instead of throwing
      }
      
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
        masked_key: serverEncryption.maskKey(key.encrypted_key)
      }));
    } catch (error) {
      console.error('Failed to get user API keys:', error);
      throw error;
    }
  },

  /**
   * Get a specific API key
   */
  async get(userId: string, keyId: string): Promise<UserApiKey | null> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        return null;
      }
      
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
   * Update an API key
   */
  async update(userId: string, keyId: string, updates: Partial<ApiKeyFormData>): Promise<UserApiKey> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        throw new Error('Invalid user ID format');
      }
      
      const updateData: any = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      
      if (updates.key !== undefined) {
        updateData.encrypted_key = serverEncryption.encrypt(updates.key);
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
  async toggleStatus(userId: string, keyId: string, isActive: boolean): Promise<void> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        throw new Error('Invalid user ID format');
      }
      
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
  async delete(userId: string, keyId: string): Promise<void> {
    try {
      // Validate UUID format to prevent database errors
      if (!isUuid(userId)) {
        console.warn(`Invalid userId format (not UUID): ${userId}`);
        throw new Error('Invalid user ID format');
      }
      
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
   * Get the active API key for a provider
   */
  async getActiveForProvider(userId: string, providerId: string): Promise<UserApiKey | null> {
    // Skip database query for non-UUID user IDs
    if (!isUuid(userId)) {
      console.warn(`Skipping database query for invalid userId format: ${userId}`);
      return null;
    }
    
    try {
      const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      // Check if we have any results
      if (!data || data.length === 0) {
        return null; // No active key found
      }
      
      return data[0];
    } catch (error) {
      console.error(`Failed to get active API key for ${providerId}:`, error);
      return null;
    }
  },

  /**
   * Update the last_used_at timestamp
   */
  async updateLastUsed(userId: string, keyId: string): Promise<void> {
    // Skip database query for non-UUID user IDs
    if (!isUuid(userId)) {
      console.warn(`Skipping last_used_at update for invalid userId format: ${userId}`);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('user_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyId)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update last_used_at:', error);
      // Don't throw - this is a non-critical operation
    }
  }
};