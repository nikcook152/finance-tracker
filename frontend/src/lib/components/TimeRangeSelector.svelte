<script lang="ts">
  import { timeRange, type TimeRangeType } from '$lib/stores/time-range.store';
  import { browser } from '$app/environment';

  let selectedType: TimeRangeType = 'all';
  let customStartDate = '';
  let customEndDate = '';
  let showCustomPicker = false;

  // Preset buttons
  const presets: { type: TimeRangeType; label: string }[] = [
    { type: 'all', label: 'Alle' },
    { type: '1m', label: '1M' },
    { type: '3m', label: '3M' },
    { type: '6m', label: '6M' },
    { type: '12m', label: '12M' },
  ];

  function selectPreset(type: TimeRangeType) {
    selectedType = type;
    showCustomPicker = false;
    timeRange.setTimeRange(type);
  }

  function openCustomPicker() {
    selectedType = 'custom';
    showCustomPicker = true;
  }

  function applyCustomRange() {
    if (customStartDate && customEndDate) {
      timeRange.setTimeRange('custom', customStartDate, customEndDate);
    }
  }

  // Initialize with current store value
  $: if ($timeRange) {
    selectedType = $timeRange.type;
    showCustomPicker = $timeRange.type === 'custom';
    if ($timeRange.startDate) customStartDate = $timeRange.startDate;
    if ($timeRange.endDate) customEndDate = $timeRange.endDate;
  }
</script>

<div class="time-range-selector">
  <div class="preset-buttons">
    {#each presets as preset}
      <button
        class="preset-btn"
        class:active={selectedType === preset.type && !showCustomPicker}
        on:click={() => selectPreset(preset.type)}
      >
        {preset.label}
      </button>
    {/each}
    <button
      class="preset-btn"
      class:active={showCustomPicker}
      on:click={openCustomPicker}
    >
      Benutzerdefiniert
    </button>
  </div>

  {#if showCustomPicker}
    <div class="custom-picker">
      <div class="date-input">
        <label for="start-date">Von:</label>
        <input
          type="date"
          id="start-date"
          bind:value={customStartDate}
          on:change={applyCustomRange}
        />
      </div>
      <div class="date-input">
        <label for="end-date">Bis:</label>
        <input
          type="date"
          id="end-date"
          bind:value={customEndDate}
          on:change={applyCustomRange}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .time-range-selector {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: #f9fafb;
    border-radius: 0.5rem;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .preset-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: white;
    color: #374151;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .preset-btn:hover {
    background-color: #f3f4f6;
  }

  .preset-btn.active {
    background-color: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }

  .custom-picker {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .date-input {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .date-input label {
    font-size: 0.875rem;
    color: #374151;
  }

  .date-input input {
    padding: 0.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
  }

  .date-input input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
  }
</style>