<script lang="ts">
  import BalanceChart from '$lib/components/BalanceChart.svelte';
  import MonthlySummaryChart from '$lib/components/MonthlySummaryChart.svelte';
  import CategoryExpensesChart from '$lib/components/CategoryExpensesChart.svelte';
  import TimeRangeSelector from '$lib/components/TimeRangeSelector.svelte';
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Analytics</h1>

  <TimeRangeSelector />

  <div style="height: 32rem; margin-bottom: 2rem;">
    <BalanceChart />
  </div>

  <div class="mt-8">
    <h2 class="text-xl font-bold mb-4">Monthly Summary</h2>
    <div style="height: 32rem; margin-bottom: 2rem;">
      <MonthlySummaryChart />
    </div>
  </div>

  <div class="mt-8">
    <h2 class="text-xl font-bold mb-4">Expenses by Category</h2>
    <div style="height: 32rem;">
      <CategoryExpensesChart />
    </div>
  </div>
</div>
