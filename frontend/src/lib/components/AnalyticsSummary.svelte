<script lang="ts">
  import { formatCurrency } from '$lib/formatters';

  // Define the expected data structure for our analytics
  export let analytics: {
    monthlyIncome: number;
    monthlyExpenses: number;
    currentBudget: number;
    savingsGoal: number;
    savedAmount: number;
    hasReachedGoal: boolean;
    fixCosts: number;
  } | null;
</script>

<div class="summary-grid">
  {#if analytics}
    <div class="summary-item">
      <span class="label">Total Income</span>
      <span class="value income">{formatCurrency(analytics.monthlyIncome)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Total Expenses</span>
      <span class="value expense">{formatCurrency(analytics.monthlyExpenses)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Remaining Budget</span>
      <span class="value budget">{formatCurrency(analytics.currentBudget)}</span>
    </div>
    <div class="summary-item savings-goal">
      <span class="label">Monthly Savings Goal</span>
      <div class="goal-status">
        <span class="value">{formatCurrency(analytics.savingsGoal)}</span>
        {#if analytics.hasReachedGoal}
          <span class="badge success">Achieved</span>
        {:else}
          <span class="badge pending">Pending</span>
        {/if}
      </div>
    </div>
    <div class="summary-item">
      <span class="label">Amount Saved This Month</span>
      <span class="value">{formatCurrency(analytics.savedAmount)}</span>
    </div>
    <div class="summary-item">
      <span class="label">Monthly Fix Costs</span>
      <span class="value">{formatCurrency(analytics.fixCosts)}</span>
    </div>
  {:else}
    <p>Loading analytics...</p>
  {/if}
</div>

<style>
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  .summary-item {
    background-color: #fff;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .label {
    display: block;
    font-size: 0.9rem;
    color: #777;
    margin-bottom: 0.5rem;
  }
  .value {
    font-size: 1.5rem;
    font-weight: bold;
  }
  .income { color: var(--success-color); }
  .expense { color: var(--danger-color); }
  .budget { color: var(--primary-color); }

  .savings-goal .goal-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .badge {
    font-size: 0.75rem;
    font-weight: bold;
    padding: 0.25rem 0.5rem;
    border-radius: 12px;
    color: white;
  }
  .success { background-color: var(--success-color); }
  .pending { background-color: #f39c12; }
</style>