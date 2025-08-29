<script lang="ts">
  import { authToken } from '$lib/stores/auth.store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { env } from '$env/dynamic/public';

  // Define a type for our transaction for better code quality
  type Transaction = {
    id: string;
    title: string;
    amount: number;
    date: string;
    category: string;
    type: 'INCOME' | 'EXPENSE';
  };

  let transactions: Transaction[] = [];
  let isLoading = true;
  let apiError = '';

  // State for the "Add Transaction" form
  let newTransaction = {
    title: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0], // Default to today
    category: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE'
  };

  onMount(async () => {
    const token = $authToken;
    if (!token) {
      goto('/login');
      return;
    }

    try {
      const response = await fetch('/api/transactions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        transactions = await response.json();
      } else {
        apiError = 'Failed to fetch transactions.';
      }
    } catch (error) {
      apiError = 'Could not connect to the server.';
    } finally {
      isLoading = false;
    }
  });

  async function handleAddTransaction() {
    const token = $authToken;
    if (!token) return;

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...newTransaction,
          amount: Number(newTransaction.amount) // Ensure amount is a number
        })
      });

      if (response.ok) {
        const createdTransaction = await response.json();
        // Reactively update the list with the new transaction!
        transactions = [...transactions, createdTransaction];
        // Reset form
        newTransaction.title = '';
        newTransaction.amount = 0;
        newTransaction.category = '';
      } else {
        const data = await response.json();
        apiError = data.message || 'Failed to add transaction.';
      }
    } catch (error) {
      apiError = 'Could not connect to the server.';
    }
  }
</script>

<h1>Dashboard</h1>
<p>Welcome! Manage your finances below.</p>

<hr/>

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

{#if apiError}<p class="error">{apiError}</p>{/if}

<hr/>

<h2>My Transactions</h2>
{#if isLoading}
  <p>Loading transactions...</p>
{:else if transactions.length === 0}
  <p>No transactions yet. Add one using the form above!</p>
{:else}
  <ul class="transaction-list">
    {#each transactions as trx (trx.id)}
      <li>
        <span>{trx.title} ({trx.category})</span>
        <span class="{trx.type.toLowerCase()}">
          {trx.type === 'INCOME' ? '+' : '-'}{trx.amount.toFixed(2)} €
        </span>
      </li>
    {/each}
  </ul>
{/if}

<style>
  .add-form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  .transaction-list {
    list-style: none;
    padding: 0;
  }
  .transaction-list li {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
    border: 1px solid #eee;
    background-color: #fff;
    margin-bottom: 0.5rem;
    border-radius: 4px;
  }
  .income { color: green; font-weight: bold; }
  .expense { color: red; font-weight: bold; }
  .error { color: red; }
  hr { margin: 2rem 0; border: 0; border-top: 1px solid #eee; }
</style>