<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    // If there's no token when the page loads, redirect to login
    if (!$authToken) {
      goto('/login');
    }
  });

  function handleLogout() {
    authToken.set(null);
    goto('/login');
  }
</script>

{#if $authToken}
  <main>
    <h1>Dashboard</h1>
    <p>Welcome! You are logged in.</p>
    <button on:click={handleLogout}>Logout</button>
    </main>
{:else}
  <p>Redirecting to login...</p>
{/if}