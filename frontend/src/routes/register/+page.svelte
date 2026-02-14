<script lang="ts">
  import { goto } from '$app/navigation';
  import { authToken, encryptionKey, userEmail } from '$lib/stores/auth.store';
  import { deriveKey, getOrCreateSalt, bufferToBase64 } from '$lib/crypto';

  let email = '';
  let password = '';
  let error = '';

  async function handleRegister() {
    error = '';
    
    try {
      // First, derive the encryption key from password
      const salt = getOrCreateSalt(email);
      const key = await deriveKey(password, salt);
      
      // Register with the server
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        // Store auth token and encryption key
        authToken.set(data.accessToken);
        encryptionKey.set(key);
        userEmail.set(email);
        goto('/dashboard');
      } else {
        error = data.message || 'Registration failed';
      }
    } catch (e) {
      error = 'An error occurred during registration';
      console.error(e);
    }
  }
</script>

<main>
  <h1>Register</h1>
  <form on:submit|preventDefault={handleRegister}>
    <label for="email">Email</label>
    <input type="email" id="email" bind:value={email} required />

    <label for="password">Password</label>
    <input type="password" id="password" bind:value={password} required />

    <button type="submit">Register</button>
    {#if error}
      <p style="color: red;">{error}</p>
    {/if}
  </form>
</main>