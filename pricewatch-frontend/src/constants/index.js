export const STATUSES = ['Pending', 'Running', 'Paused', 'Completed', 'Expired', 'Cancelled', 'Failed'];
export const MONITORING_TYPES = [
  { value: 'PriceRange', label: 'Target price range' },
  { value: 'TargetPrice', label: 'Price at or below target' },
  { value: 'PriceChange', label: 'Any price change' },
  { value: 'PercentageDrop', label: 'Percentage drop' },
];
export const INTERVALS = [
  { value: 5, label: 'Every 5 minutes' },
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  // { value: 45, label: 'Every 45 minutes' },
  { value: 60, label: 'Every 1 hour' },
  { value: 120, label: 'Every 2 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  // { value: 1440, label: 'Every 24 hours' },
];
export const typeLabel = (v) => MONITORING_TYPES.find((t) => t.value === v)?.label || v;
export const intervalLabel = (m) => INTERVALS.find((i) => i.value === m)?.label || `Every ${m} min`;

// Change the product name shown in the UI here.
export const BRAND = { name: 'PRIXORA', tagline: 'Price intelligence' };
