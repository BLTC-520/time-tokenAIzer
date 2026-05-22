'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, usePublicClient } from 'wagmi';
import {
  Activity,
  CalendarClock,
  CircleAlert,
  Coins,
  ShieldCheck,
} from 'lucide-react';
import { getChainDisplayName } from '../../lib/wagmi';
import { getTimeMarketContracts } from '../../shared/constants';
import { isV4SupportedChainId } from '../../shared/uniswapV4';
import { BookingService } from '../../services/bookingService';
import type { ProviderInventory } from '../../types/time-market';
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
}

const WAD = BigInt(10) ** BigInt(18);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function hoursFromWad(value: bigint) {
  return Number(value / WAD);
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isOwnedByWallet(provider: MarketplaceProvider, address?: string) {
  return Boolean(address && provider.owner.toLowerCase() === address.toLowerCase());
}

function toMarketplaceProvider(provider: ProviderInventory): MarketplaceProvider {
  return {
    ...provider,
    serviceName: `Provider #${provider.providerId}`,
    headline: 'Live BookingManager inventory. Rich service metadata is not published on-chain yet.',
  };
}

function parseError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function buildCounts(providers: MarketplaceProvider[], address?: string): InventoryFilterCounts {
  return providers.reduce<InventoryFilterCounts>(
    (counts, provider) => {
      const hours = hoursFromWad(provider.availableHoursWad);
      counts.all += 1;
      if (!provider.paused && hours > 0) counts.available += 1;
      if (isOwnedByWallet(provider, address)) counts.mine += 1;
      return counts;
    },
    { all: 0, available: 0, mine: 0 }
  );
}

function filterProviders(
  providers: MarketplaceProvider[],
  filter: InventoryFilter,
  address: string | undefined,
  minHours: number
) {
  return providers.filter((provider) => {
    const hours = hoursFromWad(provider.availableHoursWad);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'available' && !provider.paused && hours > 0) ||
      (filter === 'mine' && isOwnedByWallet(provider, address));

    return matchesFilter && hours >= minHours;
  });
}

export default function BookingMarketplace({
  onCreateToken,
  onViewDashboard,
}: MarketplaceProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId });
  const [filter, setFilter] = useState<InventoryFilter>('available');
  const [minHours, setMinHours] = useState(1);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [requestedHours, setRequestedHours] = useState(2);
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [providerWarnings, setProviderWarnings] = useState<string[]>([]);
  const [providerLoadError, setProviderLoadError] = useState<string | null>(null);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);

  const chainName = getChainDisplayName(chainId);
  const wrongNetwork = !isV4SupportedChainId(chainId);
  const chainContracts = getTimeMarketContracts(chainId);
  const bookingManagerAddress = chainContracts?.bookingManager;
  const bookingConfigured = Boolean(
    bookingManagerAddress && bookingManagerAddress.toLowerCase() !== ZERO_ADDRESS
  );

  const bookingService = useMemo(
    () =>
      new BookingService({
        bookingManagerAddress: bookingManagerAddress as `0x${string}`,
        publicClient,
      }),
    [bookingManagerAddress, publicClient]
  );

  const loadProviders = useCallback(async () => {
    if (wrongNetwork || !publicClient) {
      setProviders([]);
      setProviderWarnings([]);
      setProviderLoadError(null);
      return;
    }
    if (!bookingConfigured) {
      setProviders([]);
      setProviderWarnings([]);
      setProviderLoadError('BookingManager is not configured for this chain.');
      return;
    }

    setIsLoadingProviders(true);
    setProviderLoadError(null);

    try {
      const result = await bookingService.listProviderInventories({ includePaused: true });
      setProviders(result.providers.map(toMarketplaceProvider));
      setProviderWarnings(result.warnings);
    } catch (error) {
      setProviders([]);
      setProviderWarnings([]);
      setProviderLoadError(parseError(error));
    } finally {
      setIsLoadingProviders(false);
    }
  }, [bookingConfigured, bookingService, publicClient, wrongNetwork]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const counts = useMemo(() => buildCounts(providers, address), [address, providers]);
  const visibleProviders = useMemo(
    () => filterProviders(providers, filter, address, minHours),
    [address, filter, minHours, providers]
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
    if (selectedProvider) return;
    setSelectedProviderId(visibleProviders[0]?.providerId ?? null);
  }, [selectedProvider, visibleProviders]);

  useEffect(() => {
    if (!selectedProvider) return;
    setRequestedHours((current) =>
      Math.min(Math.max(1, current), Math.max(1, hoursFromWad(selectedProvider.availableHoursWad)))
    );
  }, [selectedProvider]);

  const clearFilters = () => {
    setFilter('available');
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
              <p className="text-xs text-[var(--text-faint)]">Booking quote</p>
              <p className="text-lg font-semibold text-[var(--text-strong)]">Real signer required</p>
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
            minHours={minHours}
            onClearFilters={clearFilters}
            onFilterChange={setFilter}
            onMinHoursChange={setMinHours}
          />

          <section className="material-panel min-w-0 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  Providers
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Live BookingManager inventory
                </h2>
              </div>
              <p className="text-sm text-[var(--text-muted)]">
                {visibleProviders.length} of {providers.length} providers shown
              </p>
            </div>

            {providerWarnings.length > 0 && (
              <div className="mb-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--amber-muted)] p-3 text-sm text-[var(--text)]">
                Loaded with {providerWarnings.length} provider read warning
                {providerWarnings.length === 1 ? '' : 's'}.
              </div>
            )}

            <div className="provider-table-grid hidden border-b border-[var(--border-muted)] pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)] min-[861px]:grid">
              <span>Provider</span>
              <span>Owner</span>
              <span>Inventory</span>
              <span>Pricing</span>
              <span>Status</span>
            </div>

            <div className="divide-y divide-[var(--border-muted)]">
              {isLoadingProviders ? (
                <div className="flex min-h-[220px] items-center justify-center text-center">
                  <div>
                    <Activity aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--primary)]" />
                    <p className="mt-3 font-semibold text-[var(--text-strong)]">
                      Loading BookingManager providers...
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Reading live inventory from the selected chain.
                    </p>
                  </div>
                </div>
              ) : providerLoadError ? (
                <div className="flex min-h-[220px] items-center justify-center text-center">
                  <div>
                    <CircleAlert aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--danger)]" />
                    <p className="mt-3 font-semibold text-[var(--text-strong)]">
                      Provider loading failed
                    </p>
                    <p className="mt-1 max-w-[52ch] text-sm text-[var(--text-muted)]">
                      {providerLoadError}
                    </p>
                  </div>
                </div>
              ) : providers.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center text-center">
                  <div>
                    <CircleAlert aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--warning)]" />
                    <p className="mt-3 font-semibold text-[var(--text-strong)]">
                      No providers registered on this BookingManager yet
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      A provider manager can publish initial inventory from the checkout panel.
                    </p>
                  </div>
                </div>
              ) : visibleProviders.length === 0 ? (
                <div className="flex min-h-[220px] items-center justify-center text-center">
                  <div>
                    <CircleAlert aria-hidden="true" className="mx-auto h-6 w-6 text-[var(--warning)]" />
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
                      </span>
                      <span>
                        <span className="text-xs text-[var(--text-faint)] min-[861px]:hidden">
                          Owner
                        </span>
                        <span className="tabular-nums block font-semibold text-[var(--text-strong)]">
                          {shortAddress(provider.owner)}
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
                          Pricing
                        </span>
                        <span className="block font-medium text-[var(--text-muted)]">
                          Not published on-chain
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
                          {unavailable ? 'Paused' : 'Available'}
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
              onProviderRegistered={loadProviders}
              onRequestedHoursChange={setRequestedHours}
            />
            <LiquidityPanel provider={selectedProvider} chainId={chainId} />
          </div>
        </div>
      </div>
    </main>
  );
}
