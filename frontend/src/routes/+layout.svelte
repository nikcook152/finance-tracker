<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
</script>

<header>
  <nav>
    <a href="/">Home</a>
    {#if $authToken}
      <a href="/dashboard">Dashboard</a>
      <a href="/login" on:click={() => authToken.set(null)}>Logout</a>
    {:else}
      <a href="/login">Login</a>
      <a href="/register">Register</a>
    {/if}
  </nav>
</header>

<main>
  <slot />
</main>

<style>
  :global(body) {
    font-family: sans-serif;
    color: #333;
    background-color: #f9f9f9;
  }
  header {
    background-color: #fff;
    border-bottom: 1px solid #eee;
    padding: 1rem 2rem;
  }
  nav {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }
  nav a {
    text-decoration: none;
    color: #555;
    font-weight: bold;
  }
  main {
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }
</style>