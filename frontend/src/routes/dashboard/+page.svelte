<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { env } from '$env/dynamic/public';
  import { formatCurrency, formatDate } from '$lib/formatters'; // Import our formatters

  type Transaction = { id: string; title: string; amount: number; date: string; category: string; type: 'INCOME' | 'EXPENSE'; };

  let transactions: Transaction[] = [];
  let isLoading = true;
  let apiError = '';

  // State for the "Add Transaction" form
  let newTransaction = { title: '', amount: null, date: new Date().toISOString().split('T')[0], category: '', type: 'EXPENSE' as 'INCOME' | 'EXPENSE' };

  // --- State for the Edit Modal ---
  let isEditing = false;
  let transactionToEdit: Transaction | null = null;

  onMount(async () => { /* ... fetch logic is unchanged ... */ });
  async function handleAddTransaction() { /* ... unchanged ... */ }

  // --- ADD THE FOLLOWING FUNCTIONS ---

  function openEditModal(transaction: Transaction) {
    // Create a copy of the transaction to edit, and format date for the input
    transactionToEdit = { ...transaction, date: transaction.date.split('T')[0] };
    isEditing = true;
  }

  async function handleUpdateTransaction() {
    if (!transactionToEdit) return;
    const token = $authToken;

    try {
      const response = await fetch(`/api/transactions/${transactionToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...transactionToEdit, amount: Number(transactionToEdit.amount) })
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        // Find and update the transaction in our local list
        transactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        isEditing = false; // Close the modal
        transactionToEdit = null;
      } else {
        apiError = 'Failed to update transaction.';
      }
    } catch (error) {
      apiError = 'Server connection error.';
    }
  }

  async function handleDelete(transactionId: string) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    const token = $authToken;

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Reactively remove the transaction from our list
        transactions = transactions.filter(t => t.id !== transactionId);
      } else {
        apiError = 'Failed to delete transaction.';
      }
    } catch (error) {
      apiError = 'Server connection error.';
    }
  }
</script>

{#if isEditing && transactionToEdit}
  <div class="modal-backdrop" on:click={() => isEditing = false}>
    <div class="modal" on:click|stopPropagation>
      <h2>Edit Transaction</h2>
      <form on:submit|preventDefault={handleUpdateTransaction}>
        <input type="text" bind:value={transactionToEdit.title} required />
        <input type="number" step="0.01" bind:value={transactionToEdit.amount} required />
        <input type="date" bind:value={transactionToEdit.date} required />
        <input type="text" bind:value={transactionToEdit.category} required />
        <select bind:value={transactionToEdit.type} required>
          <option value="EXPENSE">Expense</option>
          <option value="INCOME">Income</option>
        </select>
        <div class="modal-actions">
          <button type="button" class="secondary" on:click={() => isEditing = false}>Cancel</button>
          <button type="submit">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
{/if}

<div class="card">
  <h2>Add New Transaction</h2>
  <form on:submit|preventDefault={handleAddTransaction} class="add-form">
    </form>
</div>

<div class="card">
  <h2>My Transactions</h2>
  {#if isLoading}
    <p>Loading transactions...</p>
  {:else if transactions.length === 0}
    <p>No transactions yet. Add one using the form above!</p>
  {:else}
    <ul class="transaction-list">
      {#each transactions.sort((a, b) => new Date(b.date) - new Date(a.date)) as trx (trx.id)}
        <li>
          <div class="details">
            <span class="title">{trx.title}</span>
            <span class="category">{trx.category} - {formatDate(trx.date)}</span>
          </div>
          <div class="amount-actions">
            <span class={trx.type.toLowerCase()}>{formatCurrency(trx.amount)}</span>
            <div class="actions">
              <button class="icon-btn" on:click={() => openEditModal(trx)}>✏️</button>
              <button class="icon-btn" on:click={() => handleDelete(trx.id)}>🗑️</button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  /* Add all new and updated styles here */
  .card { background-color: var(--surface-color); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  h2 { margin-top: 0; }
  .add-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; }
  .transaction-list { list-style: none; padding: 0; margin: 0; }
  .transaction-list li { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 1px solid var(--border-color); }
  .transaction-list li:last-child { border-bottom: none; }
  .details { display: flex; flex-direction: column; gap: 0.25rem; }
  .title { font-weight: 500; }
  .category { font-size: 0.85rem; color: #777; }
  .amount-actions { display: flex; align-items: center; gap: 1rem; }
  .income { color: var(--success-color); font-weight: bold; }
  .expense { color: var(--danger-color); font-weight: bold; }
  .actions { display: none; }
  li:hover .actions { display: flex; gap: 0.5rem; }
  .icon-btn { background: none; border: none; cursor: pointer; padding: 0.25rem; font-size: 1rem; }

  /* Modal Styles */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; }
  .modal { background-color: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; }
  .modal form { display: flex; flex-direction: column; gap: 1rem; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
  .secondary { background-color: #eee; color: #333; }
  .secondary:hover { background-color: #ddd; }

  @media (max-width: 600px) {
    .actions { display: flex; gap: 0.5rem; } /* Always show buttons on mobile */
  }
</style>