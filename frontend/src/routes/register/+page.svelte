<script lang="ts">
  import { goto } from '$app/navigation';
  import { authToken } from '$lib/stores/auth.store';
  import { env } from '$env/dynamic/public';

  let email = '';
  let password = '';
  let error = '';

  async function handleRegister() {
    error = '';
    const response = await fetch(`${env.PUBLIC_API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (response.ok) {
      authToken.set(data.accessToken);
      goto('/dashboard');
    } else {
      error = data.message || 'Registration failed';
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