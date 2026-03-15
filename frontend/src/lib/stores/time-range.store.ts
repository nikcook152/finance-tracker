import { writable, derived, get } from 'svelte/store';

export type TimeRangeType = 'custom' | '1m' | '3m' | '6m' | '12m' | 'all';

export interface TimeRange {
  type: TimeRangeType;
  startDate: string | null;
  endDate: string | null;
}

function createTimeRangeStore() {
  const { subscribe, set, update } = writable<TimeRange>({
    type: 'all',
    startDate: null,
    endDate: null,
  });

  function calculateStartDate(type: TimeRangeType): string | null {
    if (type === 'all') return null;
    
    const now = new Date();
    let monthsToSubtract = 0;
    
    switch (type) {
      case '1m':
        monthsToSubtract = 1;
        break;
      case '3m':
        monthsToSubtract = 3;
        break;
      case '6m':
        monthsToSubtract = 6;
        break;
      case '12m':
        monthsToSubtract = 12;
        break;
      default:
        return null;
    }
    
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - monthsToSubtract);
    
    return startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  function setTimeRange(type: TimeRangeType, startDate?: string, endDate?: string) {
    if (type === 'custom' && startDate && endDate) {
      set({ type, startDate, endDate });
    } else {
      const calculatedStartDate = calculateStartDate(type);
      const now = new Date();
      const endDateStr = now.toISOString().split('T')[0];
      
      set({
        type,
        startDate: calculatedStartDate,
        endDate: endDateStr,
      });
    }
  }

  function resetTimeRange() {
    set({
      type: 'all',
      startDate: null,
      endDate: null,
    });
  }

  return {
    subscribe,
    setTimeRange,
    resetTimeRange,
  };
}

export const timeRange = createTimeRangeStore();

// Helper function to filter transactions by time range
export function filterTransactionsByTimeRange<T extends { date: string }>(
  transactions: T[],
  timeRangeValue: TimeRange
): T[] {
  if (timeRangeValue.type === 'all' || !timeRangeValue.startDate || !timeRangeValue.endDate) {
    return transactions;
  }

  const startDate = timeRangeValue.startDate;
  const endDate = timeRangeValue.endDate;

  if (!startDate || !endDate) {
    return transactions;
  }

  return transactions.filter((t) => {
    const transactionDate = t.date.slice(0, 10); // YYYY-MM-DD
    return transactionDate >= startDate && transactionDate <= endDate;
  });
}
