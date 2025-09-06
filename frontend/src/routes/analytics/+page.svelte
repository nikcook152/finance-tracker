<script lang="ts">
  import BalanceChart from '$lib/components/BalanceChart.svelte';
  import MonthlySummaryChart from '$lib/components/MonthlySummaryChart.svelte';
  import CategoryExpensesChart from '$lib/components/CategoryExpensesChart.svelte';
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Analytics</h1>

  <div class="h-96 md:h-[32rem] mb-8">
    <BalanceChart />
  </div>

  <div class="mt-8">
    <h2 class="text-xl font-bold mb-4">Monthly Summary</h2>
    <div class="h-96 md:h-[32rem] mb-8">
      <MonthlySummaryChart />
    </div>
  </div>

  <div class="mt-8">
    <h2 class="text-xl font-bold mb-4">Expenses by Category</h2>
    <div class="h-96 md:h-[32rem]">
      <CategoryExpensesChart />
    </div>
  </div>
</div>
