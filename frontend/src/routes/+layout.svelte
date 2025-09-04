<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
</script>

<header>
  <nav>
    <a href="/" class="logo">FinanceTracker</a>
    <div class="nav-links">
      {#if $authToken}
        <a href="/dashboard">Dashboard</a>
        <a href="/analytics">Analytics</a>
        <a href="/login" on:click={() => authToken.set(null)}>Logout</a>
      {:else}
        <a href="/login">Login</a>
        <a href="/register">Register</a>
      {/if}
    </div>
  </nav>
</header>

<main>
  <slot />
</main>

<style>
  :root {
    --primary-color: #3498db;
    --text-color: #333;
    --bg-color: #f4f7f6;
    --surface-color: #ffffff;
    --border-color: #e0e0e0;
    --danger-color: #e74c3c;
    --success-color: #2ecc71;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    color: var(--text-color);
    background-color: var(--bg-color);
  }

  header {
    background-color: var(--surface-color);
    border-bottom: 1px solid var(--border-color);
    padding: 0 1rem;
  }

  nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 1200px;
    margin: 0 auto;
    height: 60px;
  }

  .logo {
    font-weight: bold;
    font-size: 1.2rem;
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
  }

  nav a {
    text-decoration: none;
    color: var(--text-color);
    font-weight: 500;
    transition: color 0.2s;
  }
  nav a:hover {
    color: var(--primary-color);
  }

  main {
    padding: 1.5rem;
    max-width: 800px;
    margin: 1rem auto;
  }

  /* General styles for form elements */
  :global(input), :global(select), :global(button) {
    font-size: 1rem;
    padding: 0.75rem;
    border-radius: 6px;
    border: 1px solid var(--border-color);
  }
  :global(button) {
    cursor: pointer;
    background-color: var(--primary-color);
    color: white;
    font-weight: bold;
    border: none;
    transition: background-color 0.2s;
  }
  :global(button:hover) {
    background-color: #2980b9;
  }
</style>