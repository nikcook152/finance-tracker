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

        // Calculate historical balance
        const monthlyData: { [month: string]: number } = {};
        
        // Sort by date ascending
        decryptedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        for (const t of decryptedTransactions) {
          const month = t.date.slice(0, 7); // YYYY-MM
          if (!monthlyData[month]) {
            monthlyData[month] = 0;
          }
          if (t.type === 'INCOME') {
            monthlyData[month] += t.amount || 0;
          } else {
            monthlyData[month] -= t.amount || 0;
          }
        }

        // Calculate cumulative balance
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
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
    }
  });
</script>

<div style="position: relative; height: 100%; width: 100%;">
  <canvas bind:this={canvas}></canvas>
</div>