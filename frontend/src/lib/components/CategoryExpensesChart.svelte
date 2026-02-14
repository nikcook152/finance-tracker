<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { authToken, encryptionKey } from '$lib/stores/auth.store';
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

  // Function to generate a consistent color based on category name
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

  onMount(async () => {
    if (!browser) return;

    const token = $authToken;
    const key = $encryptionKey;
    if (!token || !key) {
      goto('/login');
      return;
    }

    try {
      // Fetch all transactions
      const response = await fetch('/api/transactions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const transactions: Transaction[] = await response.json();
        
        // Decrypt all transactions
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

        // Filter only expenses and calculate by month/category
        const expenses = decryptedTransactions.filter(t => t.type === 'EXPENSE');
        const expensesByMonthCategory: { [month: string]: { [category: string]: number } } = {};
        const allCategories = new Set<string>();
        const allMonths = new Set<string>();

        for (const t of expenses) {
          const month = t.date.slice(0, 7); // YYYY-MM
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
    } catch (error) {
      console.error('Failed to fetch category expenses data:', error);
    }
  });
</script>

<div style="position: relative; height: 100%; width: 100%;">
  <canvas bind:this={canvas}></canvas>
</div>