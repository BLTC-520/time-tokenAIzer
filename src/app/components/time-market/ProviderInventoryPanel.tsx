'use client';

import { Activity, CalendarClock, CircleAlert } from 'lucide-react';

export type InventoryFilter = 'all' | 'available' | 'mine';

export interface InventoryFilterCounts {
  all: number;
  available: number;
  mine: number;
}

interface ProviderInventoryPanelProps {
  counts: InventoryFilterCounts;
  filter: InventoryFilter;
  minHours: number;
  onFilterChange: (filter: InventoryFilter) => void;
  onMinHoursChange: (value: number) => void;
  onClearFilters: () => void;
}

const filterOptions: Array<{
  key: InventoryFilter;
  label: string;
  description: string;
}> = [
  { key: 'all', label: 'All providers', description: 'Every published provider' },
  { key: 'available', label: 'Bookable', description: 'Inventory online now' },
  { key: 'mine', label: 'My inventory', description: 'Providers owned by wallet' },
];

export default function ProviderInventoryPanel({
  counts,
  filter,
  minHours,
  onFilterChange,
  onMinHoursChange,
  onClearFilters,
}: ProviderInventoryPanelProps) {
  return (
    <aside className="material-panel p-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Inventory
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
            Provider filters
          </h2>
        </div>
        <Activity aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
      </div>

      <div className="space-y-2" role="list" aria-label="Provider inventory filters">
        {filterOptions.map((option) => {
          const selected = filter === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              className={`min-h-[56px] w-full rounded-[var(--radius-control)] border px-3 py-2 text-left transition ${
                selected
                  ? 'border-[var(--primary)] bg-[var(--jade-muted)] text-[var(--text-strong)]'
                  : 'border-[var(--border-muted)] bg-[var(--surface-subtle)] text-[var(--text)] hover:border-[var(--border)]'
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
                    {option.description}
                  </span>
                </span>
                <span className="tabular-nums rounded-md border border-[var(--border-muted)] px-2 py-1 text-xs text-[var(--text-muted)]">
                  {counts[option.key]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 space-y-5 border-t border-[var(--border-muted)] pt-5">
        <label className="block">
          <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text)]">
            <span className="flex items-center gap-2">
              <CalendarClock aria-hidden="true" className="h-4 w-4 text-[var(--primary)]" />
              Minimum inventory
            </span>
            <span className="tabular-nums text-[var(--text-muted)]">{minHours}h</span>
          </span>
          <input
            type="range"
            min="1"
            max="24"
            step="1"
            value={minHours}
            onChange={(event) => onMinHoursChange(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--primary)]"
          />
        </label>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
        <p>Inventory reflects redeemable hours, not AMM pool depth.</p>
      </div>

      <button
        type="button"
        onClick={onClearFilters}
        className="mt-4 min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
      >
        Reset filters
      </button>
    </aside>
  );
}
