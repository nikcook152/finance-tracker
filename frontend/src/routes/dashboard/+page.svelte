<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatCurrency, formatDate } from '$lib/formatters';
  import AnalyticsSummary from '$lib/components/AnalyticsSummary.svelte';
  import SavingsGoalManager from '$lib/components/SavingsGoalManager.svelte';

  // --- TYPE DEFINITIONS ---
  type Transaction = {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
    type: 'INCOME' | 'EXPENSE';
  };

  type AnalyticsData = {
    monthlyIncome: number;
    monthlyExpenses: number;
    currentBudget: number;
    savingsGoal: number;
    savedAmount: number;
    hasReachedGoal: boolean;
    fixCosts: number;
  };

  // --- STATE VARIABLES ---
  let transactions: Transaction[] = [];
  let analytics: AnalyticsData | null = null;
  let isLoading = true;
  let apiError = '';

  let newTransaction = {
    title: '',
    amount: null as number | null,
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE'
  };

  let isEditing = false;
  let transactionToEdit: Transaction | null = null;

  // --- DATA FETCHING ---
  onMount(async () => {
    const token = $authToken;
    if (!token) {
      goto('/login');
      return;
    }

    isLoading = true;
    try {
      const [transactionsRes, analyticsRes] = await Promise.all([
        fetch(`/api/transactions`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/analytics`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (transactionsRes.ok) transactions = await transactionsRes.json();
      else apiError = 'Failed to fetch transactions.';
      
      if (analyticsRes.ok) analytics = await analyticsRes.json();
      else apiError = 'Failed to fetch analytics.';

    } catch (error) {
      apiError = 'Could not connect to the server.';
    } finally {
      isLoading = false;
    }
  });

  // --- API FUNCTIONS ---
  async function handleAddTransaction() {
    const token = $authToken;
    if (!token || !newTransaction.amount) return;
    apiError = '';

    try {
      const response = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTransaction,
          amount: Number(newTransaction.amount)
        })
      });

      if (response.ok) {
        const createdTransaction = await response.json();
        transactions = [...transactions, createdTransaction];
        // After adding, refetch analytics to update the summary
        await fetchAnalytics();
        // Reset form
        newTransaction.title = '';
        newTransaction.amount = null;
        newTransaction.category = '';
      } else {
        const data = await response.json();
        apiError = data.message || 'Failed to add transaction.';
      }
    } catch (error) {
      apiError = 'Could not connect to the server.';
    }
  }

  function openEditModal(transaction: Transaction) {
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
        transactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
        await fetchAnalytics();
        isEditing = false;
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
        transactions = transactions.filter(t => t.id !== transactionId);
        await fetchAnalytics();
      } else {
        apiError = 'Failed to delete transaction.';
      }
    } catch (error) {
      apiError = 'Server connection error.';
    }
  }

  async function fetchAnalytics() {
      const token = $authToken;
      if (!token) return;
      const res = await fetch(`/api/analytics`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
          analytics = await res.json();
      }
  }
</script>

{#if isEditing && transactionToEdit}
  <div class="modal-backdrop" on:click={() => isEditing = false}>
    <div class="modal" on:click|stopPropagation>
      <h2>Edit Transaction</h2>
      <form on:submit|preventDefault={handleUpdateTransaction}>
        <input type="text" placeholder="Title" bind:value={transactionToEdit.title} required />
        <input type="number" step="0.01" placeholder="Amount" bind:value={transactionToEdit.amount} required />
        <input type="date" bind:value={transactionToEdit.date} required />
        <input type="text" placeholder="Category" bind:value={transactionToEdit.category} required />
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

<h1>Dashboard</h1>

<div class="card">
  <AnalyticsSummary {analytics} />

  {#if analytics}
    <SavingsGoalManager currentGoal={analytics.savingsGoal} on:goalUpdated={fetchAnalytics} />
  {/if}
</div>

<div class="card">
  <h2>Add New Transaction</h2>
  <form on:submit|preventDefault={handleAddTransaction} class="add-form">
    <input type="text" placeholder="Title (e.g., Salary, Groceries)" bind:value={newTransaction.title} required />
    <input type="number" step="0.01" placeholder="Amount" bind:value={newTransaction.amount} required />
    <input type="date" bind:value={newTransaction.date} required />
    <input type="text" placeholder="Category (e.g., Food, Work)" bind:value={newTransaction.category} required />
    <select bind:value={newTransaction.type} required>
      <option value="EXPENSE">Expense</option>
      <option value="INCOME">Income</option>
    </select>
    <button type="submit">Add</button>
  </form>
</div>

<div class="card">
  <h2>My Transactions</h2>
  {#if apiError}<p class="error">{apiError}</p>{/if}
  {#if isLoading}
    <p>Loading transactions...</p>
  {:else if transactions.length === 0}
    <p>No transactions yet. Add one using the form above!</p>
  {:else}
    <ul class="transaction-list">
      {#each transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) as trx (trx.id)}
        <li>
          <div class="details">
            <span class="title">{trx.title}</span>
            <span class="category">{trx.category} - {formatDate(trx.date)}</span>
          </div>
          <div class="amount-actions">
            <span class={trx.type.toLowerCase()}>{formatCurrency(trx.amount)}</span>
            <div class="actions">
              <button class="icon-btn" title="Edit" on:click={() => openEditModal(trx)}>✏️</button>
              <button class="icon-btn" title="Delete" on:click={() => handleDelete(trx.id)}>🗑️</button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
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
  .error { color: var(--danger-color); margin-bottom: 1rem; text-align: center; }
  
  /* Modal Styles */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 10; }
  .modal { background-color: white; padding: 2rem; border-radius: 8px; width: 90%; max-width: 500px; }
  .modal form { display: flex; flex-direction: column; gap: 1rem; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; }
  .secondary { background-color: #eee; color: #333; }
  .secondary:hover { background-color: #ddd; }

  @media (max-width: 600px) {
    .actions { display: flex; gap: 0.5rem; } /* Always show buttons on mobile */
  }
</style>