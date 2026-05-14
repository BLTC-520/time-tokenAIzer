'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  Coins,
  Layers3,
  ShieldCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { getChainDisplayName } from '../lib/wagmi';
import { getTimeMarketContracts } from '../shared/constants';
import { isV4SupportedChainId } from '../shared/uniswapV4';
import type { TokenSuggestion } from '../services/tokenizeAgent';

interface TokenCreationProps {
  suggestion: TokenSuggestion;
  onSuccess: (tokenId: string) => void;
  onCancel: () => void;
}

type PublishState = 'draft' | 'publishing' | 'published';

const emptyContracts = {
  timeCreditToken: '0x0000000000000000000000000000000000000000',
  bookingManager: '0x0000000000000000000000000000000000000000',
  timePoolHook: '0x0000000000000000000000000000000000000000',
  usdc: '0x0000000000000000000000000000000000000000',
} as const;

function contractStatus(value: `0x${string}`) {
  return value === '0x0000000000000000000000000000000000000000'
    ? 'Not configured'
    : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function TokenCreation({ suggestion, onSuccess, onCancel }: TokenCreationProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chainName = getChainDisplayName(chainId);
  const wrongNetwork = !isV4SupportedChainId(chainId);
  const contracts = getTimeMarketContracts(chainId) ?? emptyContracts;
  const [publishState, setPublishState] = useState<PublishState>('draft');
  const [serviceName, setServiceName] = useState(suggestion.serviceName);
  const [hourlyRate, setHourlyRate] = useState(suggestion.suggestedPricePerHour);
  const [availableHours, setAvailableHours] = useState(suggestion.suggestedTotalHours);
  const [quoteWindowMinutes, setQuoteWindowMinutes] = useState(10);
  const [validityDays, setValidityDays] = useState(suggestion.suggestedValidityDays);

  const estimatedInventoryValue = useMemo(
    () => hourlyRate * availableHours,
    [availableHours, hourlyRate]
  );

  const primaryDisabled =
    !isConnected || wrongNetwork || publishState === 'publishing' || publishState === 'published';

  const handlePublish = () => {
    if (primaryDisabled) return;

    setPublishState('publishing');
    window.setTimeout(() => {
      setPublishState('published');
      window.setTimeout(() => {
        onSuccess(`provider-${Date.now()}`);
      }, 700);
    }, 900);
  };

  return (
    <main className="protocol-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="material-panel mb-4 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Provider setup
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--text-strong)]">
              Publish redeemable time inventory
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
            <ConnectButton />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
          <section className="material-panel min-w-0 p-4">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  BookingManager inventory
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Provider terms
                </h2>
              </div>
              <CalendarClock aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="text-sm font-medium text-[var(--text)]">Service name</span>
                <input
                  value={serviceName}
                  onChange={(event) => setServiceName(event.target.value)}
                  className="mt-2 min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] px-3 text-[var(--text-strong)]"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text)]">
                  Hourly quote
                  <span className="tabular-nums text-[var(--text-muted)]">${hourlyRate}/h</span>
                </span>
                <input
                  type="range"
                  min="50"
                  max="900"
                  step="10"
                  value={hourlyRate}
                  onChange={(event) => setHourlyRate(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text)]">
                  Redeemable inventory
                  <span className="tabular-nums text-[var(--text-muted)]">{availableHours}h</span>
                </span>
                <input
                  type="range"
                  min="1"
                  max="80"
                  step="1"
                  value={availableHours}
                  onChange={(event) => setAvailableHours(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text)]">
                  Quote window
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {quoteWindowMinutes}m
                  </span>
                </span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={quoteWindowMinutes}
                  onChange={(event) => setQuoteWindowMinutes(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="flex items-center justify-between gap-3 text-sm font-medium text-[var(--text)]">
                  Availability horizon
                  <span className="tabular-nums text-[var(--text-muted)]">{validityDays}d</span>
                </span>
                <input
                  type="range"
                  min="7"
                  max="120"
                  step="1"
                  value={validityDays}
                  onChange={(event) => setValidityDays(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--primary)]"
                />
              </label>
            </div>

            <div className="mt-5 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--text-strong)]">
                GPT-5.5 rationale
              </p>
              <p className="mt-2 max-w-[72ch] text-sm leading-6 text-[var(--text-muted)]">
                {suggestion.reasoning}
              </p>
            </div>
          </section>

          <section className="transaction-sheet p-4" aria-live="polite">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  Publish preview
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Credit market setup
                </h2>
              </div>
              <Coins aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Wallet</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Inventory value</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  ${estimatedInventoryValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">TIME cap</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  {availableHours} TIME
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">BookingManager</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  {contractStatus(contracts.bookingManager)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">TimePoolHook</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  {contractStatus(contracts.timePoolHook)}
                </span>
              </div>
            </div>

            <div
              className={`mt-4 rounded-[var(--radius-control)] border p-3 text-xs ${
                publishState === 'published'
                  ? 'border-[var(--success)] bg-[var(--jade-muted)] text-[var(--text-strong)]'
                  : wrongNetwork || !isConnected
                    ? 'border-[var(--warning)] bg-[var(--amber-muted)] text-[var(--text)]'
                    : 'border-[var(--border-muted)] bg-[var(--surface-subtle)] text-[var(--text-muted)]'
              }`}
            >
              <div className="flex items-start gap-2">
                {publishState === 'published' ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  {publishState === 'published'
                    ? 'Inventory published. Redirecting to marketplace.'
                    : wrongNetwork
                      ? 'Switch to Sepolia or Base Sepolia before publishing inventory.'
                      : 'Publishing creates provider inventory first; pool liquidity is initialized separately.'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
              <Layers3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
              <p>
                The hook may validate signed swap intent, but it never creates booking state.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={publishState === 'publishing'}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={primaryDisabled}
                className="min-h-[44px] rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-sm font-bold text-[var(--background)] transition hover:bg-[var(--primary-pressed)] disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--text-faint)]"
              >
                {publishState === 'publishing' ? 'Publishing' : 'Publish inventory'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
