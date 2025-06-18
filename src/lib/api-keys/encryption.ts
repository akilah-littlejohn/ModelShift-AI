import CryptoJS from 'crypto-js';

// Get encryption key from environment or use a default for development
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'modelshift-ai-secure-key-2024';

/**
 * Server-side encryption utilities for API keys
 */
export const serverEncryption = {
  /**
   * Encrypt a value using AES encryption
   */
  encrypt(value: string): string {
    return CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
  },

  /**
   * Decrypt an encrypted value
   */
  decrypt(encryptedValue: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  },

  /**
   * Create a masked version of a key for display
   */
  maskKey(key: string): string {
    if (!key || key.length < 8) return '••••••••';
    
    // Show first 4 and last 4 characters
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
  }
};