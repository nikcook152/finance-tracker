/**
 * Client-side encryption utilities for E2E encryption.
 * Uses Web Crypto API for secure key derivation (PBKDF2) and encryption (AES-GCM).
 */

// Constants for key derivation
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits for AES-GCM
const KEY_LENGTH = 256; // bits

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Convert Uint8Array to base64 string for storage
 */
export function bufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

/**
 * Convert base64 string back to Uint8Array
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derive an encryption key from a password using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  // Import password as raw key material
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key using PBKDF2
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded ciphertext and IV
 */
export async function encrypt(data: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedData = new TextEncoder().encode(data);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encodedData
  );

  return {
    ciphertext: bufferToBase64(new Uint8Array(ciphertext)),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypt data using AES-GCM
 * Takes base64-encoded ciphertext and IV
 */
export async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const ciphertextBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(iv);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBuffer },
    key,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decrypted);
}

/**
 * Storage key for the user's salt
 */
const SALT_STORAGE_KEY = 'finance_tracker_salt';

/**
 * Get or create salt for a user
 * Uses email as part of the storage key to handle different accounts
 */
export function getOrCreateSalt(userEmail: string): Uint8Array {
  const storageKey = `${SALT_STORAGE_KEY}_${userEmail}`;
  const storedSalt = localStorage.getItem(storageKey);
  
  if (storedSalt) {
    return base64ToBuffer(storedSalt);
  }
  
  // Generate new salt for new user
  const salt = generateSalt();
  localStorage.setItem(storageKey, bufferToBase64(salt));
  return salt;
}

/**
 * Clear salt for a user (on logout)
 */
export function clearSalt(userEmail: string): void {
  const storageKey = `${SALT_STORAGE_KEY}_${userEmail}`;
  localStorage.removeItem(storageKey);
}

/**
 * Encrypted transaction data structure
 */
export interface EncryptedTransactionData {
  title: string;
  amount: number;
  category: string;
}

/**
 * Encrypt transaction data
 */
export async function encryptTransaction(
  data: EncryptedTransactionData,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  return encrypt(JSON.stringify(data), key);
}

/**
 * Decrypt transaction data
 */
export async function decryptTransaction(
  ciphertext: string,
  iv: string,
  key: CryptoKey
): Promise<EncryptedTransactionData> {
  const decrypted = await decrypt(ciphertext, iv, key);
  return JSON.parse(decrypted) as EncryptedTransactionData;
}