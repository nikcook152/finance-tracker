// src/lib/stores/auth.store.ts
import { writable } from 'svelte/store';
import { derived } from 'svelte/store';

// Get the token from localStorage if it exists
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// Create a writable store for the JWT token
export const authToken = writable<string | null>(initialToken);

// Create a writable store for the encryption key (stored in memory only, never persisted)
export const encryptionKey = writable<CryptoKey | null>(null);

// Store for the current user email (needed for salt management)
const initialEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
export const userEmail = writable<string | null>(initialEmail);

// Subscribe to changes in the token store and update localStorage
authToken.subscribe((value) => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('authToken', value);
    } else {
      localStorage.removeItem('authToken');
    }
  }
});

// Subscribe to email changes
userEmail.subscribe((value) => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('userEmail', value);
    } else {
      localStorage.removeItem('userEmail');
    }
  }
});

// Derived store to check if user is authenticated with encryption key available
export const isAuthenticated = derived(
  [authToken, encryptionKey],
  ([$authToken, $encryptionKey]) => $authToken !== null && $encryptionKey !== null
);