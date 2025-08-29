<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { authToken } from '$lib/stores/auth.store';

  export let currentGoal: number = 0;

  let newGoalAmount: number;
  let isLoading = false;
  let message = '';

  const dispatch = createEventDispatcher();

  // When the component loads, set the input value to the current goal
  onMount(() => {
    newGoalAmount = currentGoal;
  });

  async function handleUpdateGoal() {
    isLoading = true;
    message = '';
    const token = $authToken;

    const response = await fetch(`/api/users/savings-goal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ amount: Number(newGoalAmount) })
    });

    if (response.ok) {
      message = 'Goal updated successfully!';
      // Notify the parent (dashboard) that the goal has changed
      dispatch('goalUpdated');
    } else {
      message = 'Failed to update goal.';
    }
    isLoading = false;
    setTimeout(() => message = '', 3000); // Clear message after 3 seconds
  }
</script>

<div class="manager">
  <label for="savings-goal">Set Your Monthly Savings Goal</label>
  <div class="input-group">
    <span>€</span>
    <input id="savings-goal" type="number" step="50" min="0" bind:value={newGoalAmount} />
    <button on:click={handleUpdateGoal} disabled={isLoading}>
      {isLoading ? 'Saving...' : 'Save'}
    </button>
  </div>
  {#if message}
    <p class="message">{message}</p>
  {/if}
</div>

<style>
  .manager { margin-top: 1.5rem; }
  .input-group { display: flex; margin-top: 0.5rem; }
  .input-group span { padding: 0.75rem; background-color: #eee; border: 1px solid var(--border-color); border-right: none; border-radius: 6px 0 0 6px; }
  .input-group input { border-radius: 0; flex-grow: 1; }
  .input-group button { border-radius: 0 6px 6px 0; }
  .message { font-size: 0.9rem; margin-top: 0.5rem; color: var(--primary-color); }
</style>