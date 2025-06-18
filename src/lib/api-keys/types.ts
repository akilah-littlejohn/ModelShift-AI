export interface UserApiKey {
  id: string;
  user_id: string;
  provider_id: string;
  encrypted_key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_used_at?: string;
}

export interface ApiKeyFormData {
  provider_id: string;
  key: string;
  name: string;
}

export interface ApiKeyListItem {
  id: string;
  provider_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
  masked_key: string;
}

export interface ApiKeyStats {
  total: number;
  active: number;
  byProvider: Record<string, number>;
}