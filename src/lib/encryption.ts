import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'modelshift-ai-demo-key-2024';

export const encryption = {
  encrypt(text: string): string {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  },

  decrypt(encryptedText: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  },

  isEncrypted(text: string): boolean {
    try {
      const decrypted = this.decrypt(text);
      return decrypted.length > 0;
    } catch {
      return false;
    }
  }
};

export const keyVault = {
  store(provider: string, keyData: Record<string, string>, keyName?: string): string {
    const keyId = keyName ? `${provider}_${keyName}` : provider;
    const keyDataJson = JSON.stringify(keyData);
    const encrypted = encryption.encrypt(keyDataJson);
    localStorage.setItem(`vault_${keyId}`, encrypted);
    
    // Also update the keys list for this provider
    this.updateProviderKeysList(provider, keyId);
    
    return encrypted;
  },

  retrieve(keyId: string): Record<string, string> | null {
    const encrypted = localStorage.getItem(`vault_${keyId}`);
    if (!encrypted) return null;
    
    try {
      const decrypted = encryption.decrypt(encrypted);
      
      // Handle backward compatibility - if it's not JSON, treat as single API key
      try {
        return JSON.parse(decrypted);
      } catch {
        // Legacy format - single API key string
        return { apiKey: decrypted };
      }
    } catch {
      return null;
    }
  },

  remove(keyId: string): void {
    localStorage.removeItem(`vault_${keyId}`);
    
    // Also remove from provider keys list
    const provider = keyId.split('_')[0];
    this.removeFromProviderKeysList(provider, keyId);
  },

  list(): string[] {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('vault_'));
    return keys.map(key => key.replace('vault_', ''));
  },

  listKeysForProvider(provider: string): Array<{id: string, name: string, keyData: Record<string, string>}> {
    const providerKeys = this.getProviderKeysList(provider);
    return providerKeys.map(keyId => {
      const keyData = this.retrieve(keyId);
      const name = keyId === provider ? 'Default' : keyId.replace(`${provider}_`, '');
      return {
        id: keyId,
        name,
        keyData: keyData || {}
      };
    }).filter(key => Object.keys(key.keyData).length > 0);
  },

  updateProviderKeysList(provider: string, keyId: string): void {
    const existingKeys = this.getProviderKeysList(provider);
    if (!existingKeys.includes(keyId)) {
      existingKeys.push(keyId);
      localStorage.setItem(`provider_keys_${provider}`, JSON.stringify(existingKeys));
    }
  },

  removeFromProviderKeysList(provider: string, keyId: string): void {
    const existingKeys = this.getProviderKeysList(provider);
    const updatedKeys = existingKeys.filter(id => id !== keyId);
    if (updatedKeys.length > 0) {
      localStorage.setItem(`provider_keys_${provider}`, JSON.stringify(updatedKeys));
    } else {
      localStorage.removeItem(`provider_keys_${provider}`);
    }
  },

  getProviderKeysList(provider: string): string[] {
    try {
      const stored = localStorage.getItem(`provider_keys_${provider}`);
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Check if there's a legacy single key for this provider
      const legacyKey = localStorage.getItem(`vault_${provider}`);
      if (legacyKey) {
        return [provider];
      }
      
      return [];
    } catch {
      return [];
    }
  },

  // Backward compatibility method
  retrieveDefault(provider: string): Record<string, string> | null {
    // First try to get the default key (without suffix)
    let keyData = this.retrieve(provider);
    if (keyData) return keyData;
    
    // If no default, get the first available key for this provider
    const providerKeys = this.listKeysForProvider(provider);
    if (providerKeys.length > 0) {
      return providerKeys[0].keyData;
    }
    
    return null;
  }
};