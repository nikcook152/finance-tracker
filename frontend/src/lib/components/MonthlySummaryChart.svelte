<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { isAuthenticated, encryptionKey } from '$lib/stores/auth.store';
  import { timeRange, filterTransactionsByTimeRange } from '$lib/stores/time-range.store';
  import { decryptTransaction } from '$lib/crypto';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  Chart.register(...registerables);

  let chart: Chart;
  let canvas: HTMLCanvasElement;
  let loading = false;

  type Transaction = {
    id: string;
    encryptedData: string;
    iv: string;
    date: string;
    type: 'INCOME' | 'EXPENSE';
    amount?: number;
  };

  let decryptedCache: Transaction[] = [];
  let cacheKey = '';

  async function loadAndProcessData() {
    if (!browser) return;
    if (!$isAuthenticated || !$encryptionKey) {
      goto('/login');
      return;
    }

    const key = $encryptionKey;
    const currentTimeRange = $timeRange;
    const cacheKeyString = `${currentTimeRange.type}-${currentTimeRange.startDate}-${currentTimeRange.endDate}`;

    if (decryptedCache.length > 0 && cacheKey === cacheKeyString) {
      updateChart(decryptedCache);
      return;
    }

    loading = true;

    try {
      const response = await fetch('/api/transactions?limit=10000', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const transactions: Transaction[] = data.transactions || data;

        const decryptedTransactions = await Promise.all(
          transactions.map(async (t) => {
            try {
              const decrypted = await decryptTransaction(t.encryptedData, t.iv, key);
              return { ...t, amount: decrypted.amount };
            } catch {
              return { ...t, amount: 0 };
            }
          })
        );

        const filtered = filterTransactionsByTimeRange(decryptedTransactions, currentTimeRange);

        decryptedCache = filtered;
        cacheKey = cacheKeyString;

        updateChart(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch monthly summary data:', error);
    } finally {
      loading = false;
    }
  }

  function updateChart(transactions: Transaction[]) {
    if (!canvas) return;

    const monthlyData: { [month: string]: { income: number; expense: number } } = {};

    for (const t of transactions) {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') {
        monthlyData[month].income += t.amount || 0;
      } else {
        monthlyData[month].expense += t.amount || 0;
      }
    }

    const months = Object.keys(monthlyData).sort();
    const monthlySummary = months.map((month) => ({
      month,
      net: monthlyData[month].income - monthlyData[month].expense,
    }));

    const labels = monthlySummary.map((d) => d.month);
    const values = monthlySummary.map((d) => d.net);

    const positiveData = values.map((v) => (v >= 0 ? v : null));
    const negativeData = values.map((v) => (v < 0 ? v : null));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (chart) {
        chart.destroy();
      }
      chart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Surplus',
              data: positiveData,
              backgroundColor: 'green',
              borderColor: 'green',
              borderWidth: 1,
            },
            {
              label: 'Deficit',
              data: negativeData,
              backgroundColor: 'red',
              borderColor: 'red',
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
            },
            y: {
              stacked: true,
              beginAtZero: true,
            },
          },
        },
      });
    }
  }

  onMount(() => {
    if (!browser) return;
    if (!$isAuthenticated || !$encryptionKey) {
      goto('/login');
      return;
    }
    loadAndProcessData();
  });

  $: if ($timeRange && browser && $encryptionKey) {
    loadAndProcessData();
  }

  onDestroy(() => {
    if (chart) {
      chart.destroy();
    }
  });
</script>

<div style="position: relative; height: 100%; width: 100%;">
  {#if loading}
    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);">
      Loading...
    </div>
  {/if}
  <canvas bind:this={canvas}></canvas>
</div>