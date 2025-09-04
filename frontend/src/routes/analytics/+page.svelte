<script lang="ts">
  import BalanceChart from '$lib/components/BalanceChart.svelte';
  import MonthlySummaryChart from '$lib/components/MonthlySummaryChart.svelte';
</script>

<div class="container mx-auto p-4">
  <h1 class="text-2xl font-bold mb-4">Analytics</h1>
  <BalanceChart />
  <div class="mt-8">
    <h2 class="text-xl font-bold mb-4">Monthly Summary</h2>
    <MonthlySummaryChart />
  </div>
</div>
