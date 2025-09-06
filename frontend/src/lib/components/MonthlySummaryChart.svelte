<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { authToken } from '$lib/stores/auth.store';
  import { browser } from '$app/environment';

  Chart.register(...registerables);

  let chart: Chart;
  let canvas: HTMLCanvasElement;

  type MonthlySummary = {
    month: string;
    net: number;
  };

  onMount(async () => {
    if (!browser) return;

    const token = $authToken;
    if (!token) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/monthly-summary', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: MonthlySummary[] = await response.json();
        const labels = data.map((d) => d.month);
        const values = data.map((d) => d.net);

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

<div class="relative h-[48rem]">
  <canvas bind:this={canvas}></canvas>
</div>
