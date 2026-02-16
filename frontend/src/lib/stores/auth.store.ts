// src/lib/stores/auth.store.ts
import { writable } from 'svelte/store';
import { derived } from 'svelte/store';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

// Auth state - now uses cookies instead of localStorage for JWT
// The authToken store now represents whether user is authenticated (not the actual token)
const initialAuthState = typeof window !== 'undefined' ? localStorage.getItem('isAuthenticated') === 'true' : false;
export const isAuthenticatedState = writable<boolean>(initialAuthState);

// Create a writable store for the encryption key (stored in memory only, never persisted)
export const encryptionKey = writable<CryptoKey | null>(null);

// Store for the current user email (needed for salt management)
// This is kept in localStorage as it's not sensitive
const initialEmail = typeof window !== 'undefined' ? localStorage.getItem('userEmail') : null;
export const userEmail = writable<string | null>(initialEmail);

// Subscribe to auth state changes
isAuthenticatedState.subscribe((value) => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('isAuthenticated', 'true');
    } else {
      localStorage.removeItem('isAuthenticated');
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
  [isAuthenticatedState, encryptionKey],
  ([$isAuthenticatedState, $encryptionKey]) => $isAuthenticatedState && $encryptionKey !== null
);

// Auth API helper functions
export const authApi = {
  async checkAuthStatus(): Promise<{ authenticated: boolean; email?: string }> {
    if (!browser) return { authenticated: false };
    
    try {
      const response = await fetch('/api/users/me', {
        credentials: 'include', // Important: include cookies
      });
      
      if (response.ok) {
        const user = await response.json();
        return { authenticated: true, email: user.email };
      }
      return { authenticated: false };
    } catch {
      return { authenticated: false };
    }
  },

  async logout(): Promise<void> {
    if (!browser) return;
    
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Ignore errors on logout
    }
    
    // Clear local state
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('userEmail');
    isAuthenticatedState.set(false);
    encryptionKey.set(null);
    userEmail.set(null);
    
    goto('/login');
  }
};
