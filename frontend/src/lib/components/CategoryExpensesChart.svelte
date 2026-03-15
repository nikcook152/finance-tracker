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
    category?: string;
    amount?: number;
  };

  let decryptedCache: Transaction[] = [];
  let cacheKey = '';

  function getColorForCategory(category: string) {
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
      hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    const r = (hash & 0xff0000) >> 16;
    const g = (hash & 0x00ff00) >> 8;
    const b = hash & 0x0000ff;
    return `rgba(${Math.abs(r) % 200 + 55}, ${Math.abs(g) % 200 + 55}, ${Math.abs(b) % 200 + 55}, 1)`;
  }

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
              return { ...t, amount: decrypted.amount, category: decrypted.category };
            } catch {
              return { ...t, amount: 0, category: 'Unknown' };
            }
          })
        );

        const filtered = filterTransactionsByTimeRange(decryptedTransactions, currentTimeRange);

        decryptedCache = filtered;
        cacheKey = cacheKeyString;

        updateChart(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch category expenses data:', error);
    } finally {
      loading = false;
    }
  }

  function updateChart(transactions: Transaction[]) {
    if (!canvas) return;

    const expenses = transactions.filter(t => t.type === 'EXPENSE');
    const expensesByMonthCategory: { [month: string]: { [category: string]: number } } = {};
    const allCategories = new Set<string>();
    const allMonths = new Set<string>();

    for (const t of expenses) {
      const month = t.date.slice(0, 7);
      allMonths.add(month);
      allCategories.add(t.category || 'Unknown');

      if (!expensesByMonthCategory[month]) {
        expensesByMonthCategory[month] = {};
      }
      if (!expensesByMonthCategory[month][t.category || 'Unknown']) {
        expensesByMonthCategory[month][t.category || 'Unknown'] = 0;
      }
      expensesByMonthCategory[month][t.category || 'Unknown'] += t.amount || 0;
    }

    const sortedMonths = Array.from(allMonths).sort();
    const datasets = Array.from(allCategories).map((category) => {
      const color = getColorForCategory(category);
      const data = sortedMonths.map((month) => expensesByMonthCategory[month]?.[category] || 0);
      return {
        label: category,
        data: data,
        borderColor: color,
        backgroundColor: color + '33',
        fill: false,
      };
    });

    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (chart) {
        chart.destroy();
      }
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: sortedMonths,
          datasets: datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
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