<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { authToken } from '$lib/stores/auth.store';
  import { browser } from '$app/environment';

  Chart.register(...registerables);

  let chart: Chart;
  let canvas: HTMLCanvasElement;

  type HistoricalData = {
    month: string;
    balance: number;
  };

  onMount(async () => {
    if (!browser) return;

    const token = $authToken;
    if (!token) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/historical', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: HistoricalData[] = await response.json();
        const labels = data.map((d) => d.month);
        const values = data.map((d) => d.balance);

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
