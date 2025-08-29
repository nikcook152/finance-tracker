// src/lib/stores/auth.store.ts
import { writable } from 'svelte/store';

// Get the token from localStorage if it exists
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

// Create a writable store
export const authToken = writable<string | null>(initialToken);

// Subscribe to changes in the store and update localStorage
authToken.subscribe((value) => {
  if (typeof window !== 'undefined') {
    if (value) {
      localStorage.setItem('authToken', value);
    } else {
      localStorage.removeItem('authToken');
    }
  }
});