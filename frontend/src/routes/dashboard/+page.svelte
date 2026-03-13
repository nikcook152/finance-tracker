<script lang="ts">
  import { isAuthenticated, encryptionKey } from '$lib/stores/auth.store';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { formatCurrency, formatDate } from '$lib/formatters';
  import { encryptTransaction, decryptTransaction, type EncryptedTransactionData } from '$lib/crypto';
  import AnalyticsSummary from '$lib/components/AnalyticsSummary.svelte';
  import SavingsGoalManager from '$lib/components/SavingsGoalManager.svelte';

  // --- TYPE DEFINITIONS ---
  type Transaction = {
    id: string;
    encryptedData: string;
    iv: string;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    // Decrypted fields (computed client-side)
    title?: string;
    amount?: number;
    category?: string;
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
  let isLoadingMore = false;
  let apiError = '';
  let offset = 0;
  let hasMore = true;
  const limit = 25;

  let newTransaction = {
    title: '',
    amount: null as number | null,
    date: new Date().toISOString().split('T')[0],
    category: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE'
  };

  let isEditing = false;
  let transactionToEdit: Transaction | null = null;

  // --- HELPER: Decrypt a single transaction ---
  async function decryptTransactionData(trx: Transaction, key: CryptoKey): Promise<Transaction> {
    try {
      const decrypted = await decryptTransaction(trx.encryptedData, trx.iv, key);
      return {
        ...trx,
        title: decrypted.title,
        amount: decrypted.amount,
        category: decrypted.category
      };
    } catch (e) {
      console.error('Failed to decrypt transaction:', trx.id, e);
      return {
        ...trx,
        title: '[Decryption Failed]',
        amount: 0,
        category: '[Decryption Failed]'
      };
    }
  }

  // --- HELPER: Calculate analytics client-side ---
  function calculateAnalytics(decryptedTransactions: Transaction[]): AnalyticsData {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Filter transactions for current month
    const monthlyTransactions = decryptedTransactions.filter(t => {
      const date = new Date(t.date);
      return date >= startOfMonth && date <= endOfMonth && t.amount !== undefined;
    });

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const currentBudget = monthlyIncome - monthlyExpenses;

    return {
      monthlyIncome,
      monthlyExpenses,
      currentBudget,
      savingsGoal: 0, // Will be updated from API
      savedAmount: currentBudget,
      hasReachedGoal: currentBudget >= 0,
      fixCosts: 0
    };
  }

  // --- DATA FETCHING ---
  async function fetchTransactions(reset: boolean = false) {
    const key = $encryptionKey;
    if (!$isAuthenticated || !key) return;

    const currentOffset = reset ? 0 : offset;
    
    try {
      // Fetch transactions with pagination
      const url = `/api/transactions?limit=${limit}&offset=${currentOffset}`;
      const transactionsRes = await fetch(url, {
        credentials: 'include'
      });

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        const rawTransactions = data.transactions || data;
        hasMore = data.hasMore !== undefined ? data.hasMore : rawTransactions.length === limit;
        
        // Decrypt transactions
        const decryptedTransactions = await Promise.all(
          rawTransactions.map((t: Transaction) => decryptTransactionData(t, key))
        );

        if (reset) {
          transactions = decryptedTransactions;
          offset = limit;
        } else {
          // Append new transactions, avoiding duplicates
          const existingIds = new Set(transactions.map(t => t.id));
          const newTransactions = decryptedTransactions.filter(t => !existingIds.has(t.id));
          transactions = [...transactions, ...newTransactions];
          offset += limit;
        }

        // Calculate analytics from ALL transactions for accurate data
        analytics = calculateAnalytics(transactions);
      } else {
        apiError = 'Failed to fetch transactions.';
      }
    } catch (error) {
      apiError = 'Could not connect to the server.';
    }
  }

  async function loadMoreTransactions() {
    isLoadingMore = true;
    await fetchTransactions(false);
    isLoadingMore = false;
  }

  onMount(async () => {
    const key = $encryptionKey;
    
    if (!$isAuthenticated || !key) {
      goto('/login');
      return;
    }

    isLoading = true;
    try {
      await fetchTransactions(true);

      // Fetch savings goal from API
      const analyticsRes = await fetch(`/api/analytics`, {
        credentials: 'include'
      });
      
      if (analyticsRes.ok) {
        const apiAnalytics = await analyticsRes.json();
        if (analytics) {
          analytics.savingsGoal = apiAnalytics.savingsGoal || 0;
          analytics.hasReachedGoal = analytics.savedAmount >= analytics.savingsGoal;
        }
      }

    } catch (error) {
      apiError = 'Could not connect to the server.';
    } finally {
      isLoading = false;
    }
  });

  // --- API FUNCTIONS ---
  async function handleAddTransaction() {
    const key = $encryptionKey;
    if (!$isAuthenticated || !key || !newTransaction.amount) return;
    apiError = '';

    try {
      // Encrypt the sensitive data
      const encrypted = await encryptTransaction(
        {
          title: newTransaction.title,
          amount: Number(newTransaction.amount),
          category: newTransaction.category
        },
        key
      );

      const response = await fetch(`/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv,
          date: newTransaction.date,
          type: newTransaction.type
        })
      });

      if (response.ok) {
        const createdTransaction = await response.json();
        // Decrypt the created transaction for display
        const decryptedTransaction = await decryptTransactionData(createdTransaction, key);
        transactions = [...transactions, decryptedTransaction];
        // Recalculate analytics
        analytics = calculateAnalytics([...transactions]);
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
    transactionToEdit = { 
      ...transaction, 
      date: transaction.date.split('T')[0] 
    };
    isEditing = true;
  }

  async function handleUpdateTransaction() {
    if (!transactionToEdit || transactionToEdit.amount === undefined) return;
    const key = $encryptionKey;
    if (!$isAuthenticated || !key) return;
    
    try {
      // Encrypt the updated data
      const encrypted = await encryptTransaction(
        {
          title: transactionToEdit.title || '',
          amount: Number(transactionToEdit.amount),
          category: transactionToEdit.category || ''
        },
        key
      );

      const response = await fetch(`/api/transactions/${transactionToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          encryptedData: encrypted.ciphertext,
          iv: encrypted.iv,
          date: transactionToEdit.date,
          type: transactionToEdit.type
        })
      });

      if (response.ok) {
        const updatedTransaction = await response.json();
        const decryptedTransaction = await decryptTransactionData(updatedTransaction, key);
        transactions = transactions.map(t => t.id === updatedTransaction.id ? decryptedTransaction : t);
        analytics = calculateAnalytics(transactions);
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

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        transactions = transactions.filter(t => t.id !== transactionId);
        analytics = calculateAnalytics(transactions);
      } else {
        apiError = 'Failed to delete transaction.';
      }
    } catch (error) {
      apiError = 'Server connection error.';
    }
  }

  async function fetchAnalytics() {
    // Recalculate analytics from decrypted transactions
    analytics = calculateAnalytics(transactions);
    
    // Fetch savings goal from API
    const res = await fetch(`/api/analytics`, { credentials: 'include' });
    if (res.ok) {
      const apiAnalytics = await res.json();
      if (analytics) {
        analytics.savingsGoal = apiAnalytics.savingsGoal || 0;
        analytics.hasReachedGoal = analytics.savedAmount >= analytics.savingsGoal;
      }
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
            <span class={trx.type.toLowerCase()}>{trx.amount !== undefined ? formatCurrency(trx.amount) : '...'}</span>
            <div class="actions">
              <button class="icon-btn" title="Edit" on:click={() => openEditModal(trx)}>✏️</button>
              <button class="icon-btn" title="Delete" on:click={() => handleDelete(trx.id)}>🗑️</button>
            </div>
          </div>
        </li>
      {/each}
    </ul>
    
    {#if hasMore}
      <div class="load-more-container">
        <button 
          class="load-more-btn" 
          on:click={loadMoreTransactions} 
          disabled={isLoadingMore}
        >
          {isLoadingMore ? 'Loading...' : 'Load More Transactions'}
        </button>
      </div>
    {/if}
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

  /* Load More Button */
  .load-more-container {
    display: flex;
    justify-content: center;
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
  }

  .load-more-btn {
    background-color: var(--primary-color);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 0.95rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .load-more-btn:hover:not(:disabled) {
    background-color: var(--primary-hover-color, #2563eb);
  }

  .load-more-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>
