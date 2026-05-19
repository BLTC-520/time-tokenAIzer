'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import {
  Activity,
  CalendarClock,
  CircleAlert,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { getChainDisplayName } from '../../lib/wagmi';
import { isV4SupportedChainId } from '../../shared/uniswapV4';
import type { AddressString, ProviderInventory } from '../../types/time-market';
import BookingCheckout from './BookingCheckout';
import LiquidityPanel from './LiquidityPanel';
import ProviderInventoryPanel, {
  type InventoryFilter,
  type InventoryFilterCounts,
} from './ProviderInventoryPanel';

export interface MarketplaceProps {
  onCreateToken?: () => void;
  onViewDashboard?: () => void;
}

export interface MarketplaceProvider extends ProviderInventory {
  headline: string;
  specialty: string;
  timezone: string;
  nextSlot: string;
  nextSlotPriority: number;
  rateUsdc: number;
  completionRate: number;
  poolDepth: string;
  quoteWindowMinutes: number;
}

const WAD = BigInt(10) ** BigInt(18);

function toWad(hours: number) {
  return BigInt(hours) * WAD;
}

function hoursFromWad(value: bigint) {
  return Number(value / WAD);
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isOwnedByWallet(provider: MarketplaceProvider, address?: string) {
  return Boolean(address && provider.owner.toLowerCase() === address.toLowerCase());
}

const demoProviders: MarketplaceProvider[] = [
  {
    providerId: '1',
    owner: '0xaA00000000000000000000000000000000001042' as AddressString,
    serviceName: 'Protocol architecture review',
    headline: 'Review v4 hook boundaries, settlement assumptions, and launch risks.',
    specialty: 'Uniswap v4 hooks',
    timezone: 'UTC+1',
    nextSlot: 'May 16, 14:00',
    nextSlotPriority: 1,
    rateUsdc: 420,
    completionRate: 98,
    poolDepth: '$82k',
    quoteWindowMinutes: 9,
    availableHoursWad: toWad(18),
    paused: false,
  },
  {
    providerId: '2',
    owner: '0xbB00000000000000000000000000000000001188' as AddressString,
    serviceName: 'AI workflow implementation',
    headline: 'Turn a tokenized service plan into agentic booking and follow-up ops.',
    specialty: 'Automation',
    timezone: 'UTC-4',
    nextSlot: 'May 18, 17:30',
    nextSlotPriority: 3,
    rateUsdc: 260,
    completionRate: 96,
    poolDepth: '$46k',
    quoteWindowMinutes: 12,
    availableHoursWad: toWad(24),
    paused: false,
  },
  {
    providerId: '3',
    owner: '0xcC00000000000000000000000000000000001215' as AddressString,
    serviceName: 'Security tabletop session',
    headline: 'Map signing flows, Permit2 approvals, and booking failure recovery.',
    specialty: 'Threat modeling',
    timezone: 'UTC+8',
    nextSlot: 'May 20, 09:00',
    nextSlotPriority: 5,
    rateUsdc: 520,
    completionRate: 99,
    poolDepth: '$63k',
    quoteWindowMinutes: 7,
    availableHoursWad: toWad(6),
    paused: false,
  },
  {
    providerId: '4',
    owner: '0xdD00000000000000000000000000000000001301' as AddressString,
    serviceName: 'Launch readiness review',
    headline: 'Evaluate provider inventory, quote expiry, and checkout support paths.',
    specialty: 'Marketplace ops',
    timezone: 'UTC',
    nextSlot: 'Paused',
    nextSlotPriority: 99,
    rateUsdc: 340,
    completionRate: 94,
    poolDepth: '$31k',
    quoteWindowMinutes: 6,
    availableHoursWad: toWad(0),
    paused: true,
  },
];

function buildCounts(providers: MarketplaceProvider[], address?: string): InventoryFilterCounts {
  return providers.reduce<InventoryFilterCounts>(
    (counts, provider) => {
      const hours = hoursFromWad(provider.availableHoursWad);
      counts.all += 1;
      if (!provider.paused && hours > 0) counts.available += 1;
      if (!provider.paused && provider.nextSlotPriority <= 3) counts.near_term += 1;
      if (isOwnedByWallet(provider, address)) counts.mine += 1;
      return counts;
    },
    { all: 0, available: 0, near_term: 0, mine: 0 }
  );
}

function filterProviders(
  providers: MarketplaceProvider[],
  filter: InventoryFilter,
  address: string | undefined,
  maxRate: number,
  minHours: number
) {
  return providers.filter((provider) => {
    const hours = hoursFromWad(provider.availableHoursWad);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'available' && !provider.paused && hours > 0) ||
      (filter === 'near_term' && !provider.paused && provider.nextSlotPriority <= 3) ||
      (filter === 'mine' && isOwnedByWallet(provider, address));

    return matchesFilter && provider.rateUsdc <= maxRate && hours >= minHours;
  });
}

export default function BookingMarketplace({
  onCreateToken,
  onViewDashboard,
}: MarketplaceProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [filter, setFilter] = useState<InventoryFilter>('available');
  const [maxRate, setMaxRate] = useState(550);
  const [minHours, setMinHours] = useState(1);
  const [selectedProviderId, setSelectedProviderId] = useState(demoProviders[0].providerId);
  const [requestedHours, setRequestedHours] = useState(2);

  const chainName = getChainDisplayName(chainId);
  const wrongNetwork = !isV4SupportedChainId(chainId);
  const counts = useMemo(() => buildCounts(demoProviders, address), [address]);
  const visibleProviders = useMemo(
    () => filterProviders(demoProviders, filter, address, maxRate, minHours),
    [address, filter, maxRate, minHours]
  );
  const selectedProvider =
    visibleProviders.find((provider) => provider.providerId === selectedProviderId) ??
    visibleProviders[0] ??
    null;
  const availableProviderCount = counts.available;
  const selectedAvailableHours = selectedProvider
    ? hoursFromWad(selectedProvider.availableHoursWad)
    : 0;

  useEffect(() => {
    if (!selectedProvider && visibleProviders[0]) {
      setSelectedProviderId(visibleProviders[0].providerId);
    }
  }, [selectedProvider, visibleProviders]);

  useEffect(() => {
    if (!selectedProvider) return;
    setRequestedHours((current) =>
      Math.min(Math.max(1, current), Math.max(1, hoursFromWad(selectedProvider.availableHoursWad)))
    );
  }, [selectedProvider]);

  const clearFilters = () => {
    setFilter('available');
    setMaxRate(550);
    setMinHours(1);
  };

  return (
    <main className="protocol-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="material-panel mb-4 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Time TokenAIzer
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--text-strong)]">
              Book redeemable professional time
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div
              className={`flex min-h-[44px] items-center gap-2 rounded-[var(--radius-control)] border px-3 text-sm ${
                wrongNetwork
                  ? 'border-[var(--warning)] bg-[var(--amber-muted)] text-[var(--text-strong)]'
                  : 'border-[var(--border-muted)] bg-[var(--surface-subtle)] text-[var(--text)]'
              }`}
            >
              {wrongNetwork ? (
                <CircleAlert aria-hidden="true" className="h-4 w-4 text-[var(--warning)]" />
              ) : (
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--success)]" />
              )}
              <span>{chainName}</span>
            </div>

            <div className="min-h-[44px]">
              <ConnectButton />
            </div>

            {onViewDashboard && (
              <button
                type="button"
                onClick={onViewDashboard}
                className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
              >
                Portfolio
              </button>
            )}

            {onCreateToken && (
              <button
                type="button"
                onClick={onCreateToken}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-bold text-[var(--background)] transition hover:bg-[var(--primary-pressed)]"
              >
                <CalendarClock aria-hidden="true" className="h-4 w-4" />
                Publish inventory
              </button>
            )}
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="material-panel flex items-center gap-3 p-3">
            <CalendarClock aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="text-xs text-[var(--text-faint)]">Bookable providers</p>
              <p className="tabular-nums text-lg font-semibold text-[var(--text-strong)]">
                {availableProviderCount}
              </p>
            </div>
          </div>
          <div className="material-panel flex items-center gap-3 p-3">
            <Coins aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="text-xs text-[var(--text-faint)]">Selected quote</p>
              <p className="tabular-nums text-lg font-semibold text-[var(--text-strong)]">
                {selectedProvider ? `$${selectedProvider.rateUsdc}/h` : 'None'}
              </p>
            </div>
          </div>
          <div className="material-panel flex items-center gap-3 p-3">
            <Activity aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="text-xs text-[var(--text-faint)]">Selected inventory</p>
              <p className="tabular-nums text-lg font-semibold text-[var(--text-strong)]">
                {selectedProvider ? `${selectedAvailableHours}h redeemable` : 'No selection'}
              </p>
            </div>
          </div>
        </div>

        <div className="booking-marketplace-grid">
          <ProviderInventoryPanel
            counts={counts}
            filter={filter}
            maxRate={maxRate}
            minHours={minHours}
            onClearFilters={clearFilters}
            onFilterChange={setFilter}
            onMaxRateChange={setMaxRate}
            onMinHoursChange={setMinHours}
          />

          <section className="material-panel min-w-0 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  Providers
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Published booking inventory
                </h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {visibleProviders.length} of {demoProviders.length} providers shown
              </p>
            </div>

            <div className="provider-table-grid hidden border-b border-[var(--border-muted)] pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)] min-[861px]:grid">
              <span>Provider</span>
              <span>Rate</span>
              <span>Inventory</span>
              <span>Next slot</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-[var(--border-muted)]">
              {visibleProviders.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center text-center">
                  <div>
                    <CircleAlert
                      aria-hidden="true"
                      className="mx-auto h-6 w-6 text-[var(--warning)]"
                    />
                    <p className="mt-3 font-semibold text-[var(--text-strong)]">
                      No providers match these filters
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Reset filters or lower the minimum inventory.
                    </p>
                  </div>
                </div>
              ) : (
                visibleProviders.map((provider) => {
                  const hours = hoursFromWad(provider.availableHoursWad);
                  const selected = selectedProvider?.providerId === provider.providerId;
                  const owned = isOwnedByWallet(provider, address);
                  const unavailable = provider.paused || hours === 0;

                  return (
                    <button
                      key={provider.providerId}
                      type="button"
                      onClick={() => setSelectedProviderId(provider.providerId)}
                      className={`provider-table-grid w-full py-4 text-left transition ${
                        selected
                          ? 'bg-[var(--jade-muted)]'
                          : 'hover:bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-strong)]">
                            {provider.serviceName}
                          </span>
                          {owned && (
                            <span className="rounded-md border border-[var(--border-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                              Mine
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block max-w-[58ch] text-sm text-[var(--text-muted)]">
                          {provider.headline}
                        </span>
                        <span className="mt-2 block text-xs text-[var(--text-faint)]">
                          {provider.specialty} / {shortAddress(provider.owner)} / {provider.timezone}
                        </span>
                      </span>
                      <span>
                        <span className="text-xs text-[var(--text-faint)] min-[861px]:hidden">
                          Rate
                        </span>
                        <span className="tabular-nums block font-semibold text-[var(--text-strong)]">
                          ${provider.rateUsdc}/h
                        </span>
                      </span>
                      <span>
                        <span className="text-xs text-[var(--text-faint)] min-[861px]:hidden">
                          Inventory
                        </span>
                        <span className="tabular-nums block font-semibold text-[var(--text-strong)]">
                          {hours}h
                        </span>
                      </span>
                      <span>
                        <span className="text-xs text-[var(--text-faint)] min-[861px]:hidden">
                          Next slot
                        </span>
                        <span className="block font-medium text-[var(--text)]">
                          {provider.nextSlot}
                        </span>
                      </span>
                      <span>
                        <span
                          className={`inline-flex min-h-[28px] items-center gap-1 rounded-md border px-2 text-xs font-semibold ${
                            unavailable
                              ? 'border-[var(--warning)] bg-[var(--amber-muted)] text-[var(--text-strong)]'
                              : 'border-[var(--success)] bg-[var(--jade-muted)] text-[var(--text-strong)]'
                          }`}
                        >
                          {unavailable ? (
                            <CircleAlert aria-hidden="true" className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
                          )}
                          {unavailable ? 'Paused' : `${provider.completionRate}% complete`}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          <div className="booking-marketplace-right">
            <BookingCheckout
              provider={selectedProvider}
              requestedHours={requestedHours}
              isConnected={isConnected}
              wrongNetwork={wrongNetwork}
              chainName={chainName}
              chainId={chainId}
              walletAddress={address}
              onRequestedHoursChange={setRequestedHours}
            />
            <LiquidityPanel provider={selectedProvider} chainId={chainId} />
          </div>
        </div>
      </div>
    </main>
  );
}
