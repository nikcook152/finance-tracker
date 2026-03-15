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

    // Use cached data if available
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

        // Filter by time range
        const filtered = filterTransactionsByTimeRange(decryptedTransactions, currentTimeRange);

        // Cache the filtered data
        decryptedCache = filtered;
        cacheKey = cacheKeyString;

        updateChart(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    } finally {
      loading = false;
    }
  }

  function updateChart(transactions: Transaction[]) {
    if (!canvas) return;

    const monthlyData: { [month: string]: number } = {};

    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    for (const t of sorted) {
      const month = t.date.slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = 0;
      }
      if (t.type === 'INCOME') {
        monthlyData[month] += t.amount || 0;
      } else {
        monthlyData[month] -= t.amount || 0;
      }
    }

    const months = Object.keys(monthlyData).sort();
    const cumulativeData: { month: string; balance: number }[] = [];
    let runningBalance = 0;

    for (const month of months) {
      runningBalance += monthlyData[month];
      cumulativeData.push({ month, balance: runningBalance });
    }

    const labels = cumulativeData.map((d) => d.month);
    const values = cumulativeData.map((d) => d.balance);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (chart) {
        chart.destroy();
      }
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Balance Over Time',
              data: values,
              borderColor: 'rgba(75, 192, 192, 1)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)',
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
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

  // React to time range changes
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