<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { isAuthenticated, encryptionKey } from '$lib/stores/auth.store';
  import { decryptTransaction } from '$lib/crypto';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';

  Chart.register(...registerables);

  let chart: Chart;
  let canvas: HTMLCanvasElement;

  type Transaction = {
    id: string;
    encryptedData: string;
    iv: string;
    date: string;
    type: 'INCOME' | 'EXPENSE';
  };

  onMount(async () => {
    if (!browser) return;

    const key = $encryptionKey;
    if (!$isAuthenticated || !key) {
      goto('/login');
      return;
    }

    try {
      // Fetch all transactions for analytics
      const response = await fetch('/api/transactions?limit=10000', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const transactions: Transaction[] = data.transactions || data;
        
        // Decrypt all transactions
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

        // Calculate monthly summary
        const monthlyData: { [month: string]: { income: number; expense: number } } = {};
        
        for (const t of decryptedTransactions) {
          const month = t.date.slice(0, 7); // YYYY-MM
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
    } catch (error) {
      console.error('Failed to fetch monthly summary data:', error);
    }
  });
</script>

<div style="position: relative; height: 100%; width: 100%;">
  <canvas bind:this={canvas}></canvas>
</div>