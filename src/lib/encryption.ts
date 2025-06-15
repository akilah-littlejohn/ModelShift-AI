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
  store(provider: string, keyData: Record<string, string>): string {
    const keyDataJson = JSON.stringify(keyData);
    const encrypted = encryption.encrypt(keyDataJson);
    localStorage.setItem(`vault_${provider}`, encrypted);
    return encrypted;
  },

  retrieve(provider: string): Record<string, string> | null {
    const encrypted = localStorage.getItem(`vault_${provider}`);
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

  remove(provider: string): void {
    localStorage.removeItem(`vault_${provider}`);
  },

  list(): string[] {
    const keys = Object.keys(localStorage).filter(key => key.startsWith('vault_'));
    return keys.map(key => key.replace('vault_', ''));
  }
};