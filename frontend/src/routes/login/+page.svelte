<script lang="ts">
  import { goto } from '$app/navigation';
  import { authToken } from '$lib/stores/auth.store';
  import { env } from '$env/dynamic/public';

  let email = '';
  let password = '';
  let error = '';

  async function handleLogin() {
    error = '';
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken.set(data.accessToken);
      goto('/dashboard');
    } else {
      error = data.message || 'Invalid credentials';
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