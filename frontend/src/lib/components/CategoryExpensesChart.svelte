<script lang="ts">
  import { onMount } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  import { authToken } from '$lib/stores/auth.store';
  import { browser } from '$app/environment';

  Chart.register(...registerables);

  let chart: Chart;
  let canvas: HTMLCanvasElement;

  type ChartData = {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
    }[];
  };

  // Function to generate a random color
  function getRandomColor() {
    const r = Math.floor(Math.random() * 255);
    const g = Math.floor(Math.random() * 255);
    const b = Math.floor(Math.random() * 255);
    return `rgba(${r}, ${g}, ${b}, 1)`;
  }

  onMount(async () => {
    if (!browser) return;

    const token = $authToken;
    if (!token) {
      return;
    }

    try {
      const response = await fetch('/api/analytics/category-expenses', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data: ChartData = await response.json();

        const datasets = data.datasets.map((dataset) => {
          const color = getRandomColor();
          return {
            ...dataset,
            borderColor: color,
            backgroundColor: color + '33', // Add some transparency to background
            fill: false,
          };
        });

        const ctx = canvas.getContext('2d');
        if (ctx) {
          chart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: data.labels,
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

<div class="relative h-full w-full">
  <canvas bind:this={canvas}></canvas>
</div>
