<script lang="ts">
  import { goto } from '$app/navigation';
  import { isAuthenticatedState, encryptionKey, userEmail } from '$lib/stores/auth.store';
  import { deriveKey, getOrCreateSalt } from '$lib/crypto';

  let email = '';
  let password = '';
  let error = '';

  async function handleLogin() {
    error = '';
    
    try {
      // First, derive the encryption key from password
      const salt = getOrCreateSalt(email);
      const key = await deriveKey(password, salt);
      
      // Login with the server - cookies are set automatically
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: include cookies
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth state and encryption key
        // JWT is now stored in HttpOnly cookie - not accessible to JS
        isAuthenticatedState.set(true);
        encryptionKey.set(key);
        userEmail.set(email);
        goto('/dashboard');
      } else {
        error = data.message || 'Invalid credentials';
      }
    } catch (e) {
      error = 'An error occurred during login';
      console.error(e);
    }
  }
</script>

<main>
  <h1>Login</h1>
  <form on:submit|preventDefault={handleLogin}>
    <label for="email">Email</label>
    <input type="email" id="email" bind:value={email} required />

    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} required />

    <button type="submit">Login</button>
    {#if error}
      <p style="color: red;">{error}</p>
    {/if}
  </form>
</main>