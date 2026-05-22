'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import type { Address, Hex } from 'viem';
import { Activity, CalendarClock, CircleAlert, ShieldCheck } from 'lucide-react';
import type { MarketplaceProvider } from './BookingMarketplace';
import { BLOCK_EXPLORERS, getTimeMarketContracts } from '../../shared/constants';
import { BookingService } from '../../services/bookingService';
import type { BookingQuote } from '../../types/time-market';

type CheckoutState =
  | 'ready'
  | 'wallet_disconnected'
  | 'wrong_network'
  | 'config_missing'
  | 'quote_loading'
  | 'quote_expired'
  | 'inventory_insufficient'
  | 'booking_pending'
  | 'booking_confirmed'
  | 'execution_failed';

type ExecutionState = 'idle' | 'booking_pending' | 'booking_confirmed';

interface BookingCheckoutProps {
  provider: MarketplaceProvider | null;
  requestedHours: number;
  isConnected: boolean;
  wrongNetwork: boolean;
  chainName: string;
  chainId: number;
  walletAddress?: string;
  onRequestedHoursChange: (hours: number) => void;
  onProviderRegistered?: () => void | Promise<void>;
}

interface StateMeta {
  title: string;
  body: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const WAD = BigInt(10) ** BigInt(18);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function hoursFromWad(value: bigint) {
  return Number(value / WAD);
}

function toHoursWad(hours: number) {
  return BigInt(Math.max(1, Math.floor(hours))) * WAD;
}

function formatCountdown(milliseconds: number) {
  const safeMilliseconds = Math.max(0, milliseconds);
  const totalSeconds = Math.floor(safeMilliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function shortAddress(value?: string) {
  if (!value) return 'Not connected';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function shortHex(value?: Hex) {
  if (!value) return '--';
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

function toneClasses(tone: StateMeta['tone']) {
  switch (tone) {
    case 'success':
      return 'border-[var(--success)] bg-[var(--jade-muted)] text-[var(--text-strong)]';
    case 'warning':
      return 'border-[var(--warning)] bg-[var(--amber-muted)] text-[var(--text-strong)]';
    case 'danger':
      return 'border-[var(--danger)] bg-[var(--red-muted)] text-[var(--text-strong)]';
    default:
      return 'border-[var(--border-muted)] bg-[var(--surface-subtle)] text-[var(--text)]';
  }
}

function parseError(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function statusMeta(
  state: CheckoutState,
  chainName: string,
  errorMessage: string | null
): StateMeta {
  switch (state) {
    case 'wallet_disconnected':
      return {
        title: 'Wallet disconnected',
        body: 'Connect a wallet before requesting or submitting a booking.',
        tone: 'warning',
        icon: CircleAlert,
      };
    case 'wrong_network':
      return {
        title: 'Wrong network',
        body: `Switch from ${chainName} to Sepolia or Base Sepolia for the v4 route.`,
        tone: 'warning',
        icon: CircleAlert,
      };
    case 'config_missing':
      return {
        title: 'Contracts not configured',
        body: 'BookingManager is missing for this chain environment.',
        tone: 'danger',
        icon: CircleAlert,
      };
    case 'quote_loading':
      return {
        title: 'Quote loading',
        body: 'Requesting signed booking terms from /api/booking/quote.',
        tone: 'neutral',
        icon: Activity,
      };
    case 'quote_expired':
      return {
        title: 'Quote expired',
        body: 'Refresh the signed quote before booking submission.',
        tone: 'warning',
        icon: CircleAlert,
      };
    case 'inventory_insufficient':
      return {
        title: 'Inventory insufficient',
        body: 'Requested hours exceed the provider inventory available for booking.',
        tone: 'danger',
        icon: CircleAlert,
      };
    case 'booking_pending':
      return {
        title: 'Booking pending',
        body: 'Submitting signed quote to BookingManager.',
        tone: 'neutral',
        icon: CalendarClock,
      };
    case 'booking_confirmed':
      return {
        title: 'Booking confirmed',
        body: 'BookingManager recorded the booking on-chain.',
        tone: 'success',
        icon: ShieldCheck,
      };
    case 'execution_failed':
      return {
        title: 'Transaction failed',
        body: errorMessage || 'Execution failed. Check wallet/network and try again.',
        tone: 'danger',
        icon: CircleAlert,
      };
    default:
      return {
        title: 'Ready to book with TIME',
        body: 'Use wallet TIME credits with a real signed BookingManager quote.',
        tone: 'success',
        icon: ShieldCheck,
      };
  }
}

function normalizeAddress(value: string): Address {
  return value as Address;
}

export default function BookingCheckout({
  provider,
  requestedHours,
  isConnected,
  wrongNetwork,
  chainName,
  chainId,
  walletAddress,
  onRequestedHoursChange,
  onProviderRegistered,
}: BookingCheckoutProps) {
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<bigint>(BigInt(0));
  const [now, setNow] = useState(() => Date.now());
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [registeringProvider, setRegisteringProvider] = useState(false);
  const [registerTxHash, setRegisterTxHash] = useState<Hex | null>(null);
  const [bookingTxHash, setBookingTxHash] = useState<Hex | null>(null);
  const [checkingManagerRole, setCheckingManagerRole] = useState(false);
  const [hasProviderManagerRole, setHasProviderManagerRole] = useState(false);
  const [managerRoleError, setManagerRoleError] = useState<string | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const chainContracts = getTimeMarketContracts(chainId);
  const bookingManagerAddress = chainContracts?.bookingManager;

  const normalizedHours = Math.max(1, Math.floor(requestedHours));
  const availableHours = provider ? hoursFromWad(provider.availableHoursWad) : 0;
  const maxHours = Math.max(1, availableHours);
  const inventoryInsufficient = Boolean(provider && normalizedHours > availableHours);
  const quoteExpiresAtMs = quote ? Number(quote.expiresAt) * 1000 : 0;
  const quoteExpired = !quote || now >= quoteExpiresAtMs;

  const bookingConfigured = Boolean(
    bookingManagerAddress && bookingManagerAddress.toLowerCase() !== ZERO_ADDRESS
  );

  const bookingService = useMemo(
    () =>
      new BookingService({
        bookingManagerAddress: bookingManagerAddress as Address,
        publicClient,
        walletClient: walletClient ?? undefined,
        account: walletAddress ? normalizeAddress(walletAddress) : undefined,
      }),
    [bookingManagerAddress, publicClient, walletAddress, walletClient]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const resetExecution = useCallback(() => {
    setExecutionState('idle');
    setExecutionError(null);
    setRegisterTxHash(null);
    setBookingTxHash(null);
  }, []);

  useEffect(() => {
    resetExecution();
  }, [provider?.providerId, normalizedHours, resetExecution]);

  useEffect(() => {
    let cancelled = false;

    const checkManagerRole = async () => {
      if (!isConnected || !walletAddress || !bookingConfigured || !publicClient) {
        setHasProviderManagerRole(false);
        setManagerRoleError(null);
        return;
      }

      setCheckingManagerRole(true);
      setManagerRoleError(null);
      try {
        const hasRole = await bookingService.hasProviderManagerRole(normalizeAddress(walletAddress));
        if (!cancelled) setHasProviderManagerRole(hasRole);
      } catch (error) {
        if (!cancelled) {
          setHasProviderManagerRole(false);
          setManagerRoleError(parseError(error));
        }
      } finally {
        if (!cancelled) setCheckingManagerRole(false);
      }
    };

    void checkManagerRole();

    return () => {
      cancelled = true;
    };
  }, [bookingConfigured, bookingService, isConnected, publicClient, walletAddress]);

  const explorerBase = BLOCK_EXPLORERS[chainId as keyof typeof BLOCK_EXPLORERS] ?? '';

  const refreshQuote = useCallback(async (): Promise<BookingQuote | null> => {
    if (!provider || !isConnected || wrongNetwork || !walletAddress || !bookingConfigured) {
      setQuote(null);
      setQuoteError(null);
      return null;
    }

    setQuoteLoading(true);
    setQuoteError(null);

    try {
      const nextSlotId = BigInt(Math.floor(Date.now() / 1000 / 60));
      setSlotId(nextSlotId);

      const nextQuote = await bookingService.getQuote({
        chainId,
        providerId: BigInt(provider.providerId),
        buyer: normalizeAddress(walletAddress),
        hoursWad: toHoursWad(normalizedHours),
        slotId: nextSlotId,
        quoteMode: 'auto',
      });

      setQuote(nextQuote);
      return nextQuote;
    } catch (error) {
      const message = parseError(error);
      setQuote(null);
      setQuoteError(message);
      setExecutionError(message);
      return null;
    } finally {
      setQuoteLoading(false);
    }
  }, [
    bookingConfigured,
    bookingService,
    chainId,
    isConnected,
    normalizedHours,
    provider,
    walletAddress,
    wrongNetwork,
  ]);

  useEffect(() => {
    void refreshQuote();
  }, [refreshQuote]);

  const submitBooking = useCallback(
    async (liveQuote: BookingQuote): Promise<boolean> => {
      if (!publicClient) {
        setExecutionError('Public client is unavailable for the selected chain.');
        return false;
      }

      setExecutionError(null);
      setExecutionState('booking_pending');

      try {
        const txHash = await bookingService.bookWithCredits(liveQuote);
        setBookingTxHash(txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        setExecutionState('booking_confirmed');
        return true;
      } catch (error) {
        setExecutionError(parseError(error));
        setExecutionState('idle');
        return false;
      }
    },
    [bookingService, publicClient]
  );

  const effectiveState: CheckoutState = useMemo(() => {
    if (!provider) return 'ready';
    if (!isConnected) return 'wallet_disconnected';
    if (wrongNetwork) return 'wrong_network';
    if (!bookingConfigured) return 'config_missing';
    if (quoteLoading) return 'quote_loading';
    if (executionState !== 'idle') return executionState;
    if (inventoryInsufficient) return 'inventory_insufficient';
    if (quoteExpired) return 'quote_expired';
    if (executionError || quoteError) return 'execution_failed';
    return 'ready';
  }, [
    bookingConfigured,
    executionError,
    executionState,
    inventoryInsufficient,
    isConnected,
    provider,
    quoteError,
    quoteExpired,
    quoteLoading,
    wrongNetwork,
  ]);

  const meta = statusMeta(effectiveState, chainName, executionError || quoteError);
  const StatusIcon = meta.icon;

  const primaryDisabled =
    !provider ||
    effectiveState === 'wallet_disconnected' ||
    effectiveState === 'wrong_network' ||
    effectiveState === 'config_missing' ||
    effectiveState === 'inventory_insufficient' ||
    effectiveState === 'quote_loading' ||
    effectiveState === 'booking_pending' ||
    effectiveState === 'booking_confirmed';

  const primaryLabel = (() => {
    if (!provider) return 'Select provider';
    if (effectiveState === 'wallet_disconnected') return 'Connect wallet';
    if (effectiveState === 'wrong_network') return 'Switch network';
    if (effectiveState === 'config_missing') return 'Fix contract config';
    if (effectiveState === 'quote_loading') return 'Quote loading';
    if (effectiveState === 'quote_expired') return 'Refresh quote';
    if (effectiveState === 'inventory_insufficient') return 'Reduce hours';
    if (effectiveState === 'booking_pending') return 'Booking pending';
    if (effectiveState === 'booking_confirmed') return 'Booking confirmed';
    return 'Book with TIME';
  })();

  const handlePrimaryAction = async () => {
    if (!provider || !isConnected || wrongNetwork) return;

    const liveQuote = !quoteExpired && quote ? quote : await refreshQuote();
    if (!liveQuote) return;
    await submitBooking(liveQuote);
  };

  const registerProvider = async () => {
    if (!walletAddress || !publicClient || !bookingConfigured || !hasProviderManagerRole) return;

    setRegisteringProvider(true);
    setExecutionError(null);
    setQuoteError(null);

    try {
      const hoursWad = toHoursWad(Math.max(normalizedHours, 8));
      const txHash = await bookingService.registerProvider({
        owner: normalizeAddress(walletAddress),
        hoursWad,
      });

      setRegisterTxHash(txHash);
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await onProviderRegistered?.();
      await refreshQuote();
    } catch (error) {
      setExecutionError(parseError(error));
    } finally {
      setRegisteringProvider(false);
    }
  };

  const clearStatus = () => {
    resetExecution();
    setQuoteError(null);
  };

  const txUrl = (hash: Hex | null) =>
    hash && explorerBase ? `${explorerBase}/tx/${hash}` : null;

  const managerDisabled =
    !isConnected ||
    wrongNetwork ||
    !walletAddress ||
    !bookingConfigured ||
    checkingManagerRole ||
    !hasProviderManagerRole ||
    registeringProvider;

  const managerHelper = (() => {
    if (!isConnected) return 'Connect a wallet to check provider-manager permissions.';
    if (wrongNetwork) return 'Switch to a supported chain to manage providers.';
    if (!bookingConfigured) return 'BookingManager is not configured for this chain.';
    if (checkingManagerRole) return 'Checking PROVIDER_MANAGER_ROLE...';
    if (managerRoleError) return `Manager role check failed: ${managerRoleError}`;
    if (!hasProviderManagerRole) return 'Manager-only: connected wallet lacks PROVIDER_MANAGER_ROLE.';
    return 'Manager wallet can publish live BookingManager inventory.';
  })();

  return (
    <section className="transaction-sheet p-4" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Checkout
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
            {provider?.serviceName ?? 'Select a provider'}
          </h2>
        </div>
        <CalendarClock aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
      </div>

      <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--jade-muted)] p-3 text-sm text-[var(--text-strong)]">
        <span className="block font-semibold">Use TIME</span>
        <span className="mt-0.5 block text-xs text-[var(--text-muted)]">
          Swap checkout is disabled until a real provider pricing source is published.
        </span>
      </div>

      <div className={`mt-4 rounded-[var(--radius-control)] border p-3 ${toneClasses(meta.tone)}`}>
        <div className="flex items-start gap-3">
          <StatusIcon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{meta.title}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{meta.body}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="flex items-center justify-between text-[var(--text-muted)]">
            Hours
            <span className="tabular-nums">{normalizedHours}h selected</span>
          </span>
          <input
            type="number"
            min="1"
            max={provider ? maxHours : undefined}
            step="1"
            value={normalizedHours}
            onChange={(event) => {
              const value = Number(event.target.value);
              const next = Math.min(
                Math.max(1, Math.floor(value || 1)),
                provider ? maxHours : Math.max(1, Math.floor(value || 1))
              );
              onRequestedHoursChange(next);
            }}
            className="mt-2 min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] px-3 text-[var(--text-strong)]"
          />
        </label>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[var(--border-muted)] pt-4">
          <div>
            <p className="text-xs text-[var(--text-faint)]">Wallet</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {shortAddress(walletAddress)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Quote</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {shortHex(quote?.quoteId)}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Slot</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {slotId > BigInt(0) ? slotId.toString() : '--'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Credits required</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? `${normalizedHours} TIME` : 'Select provider'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Provider owner</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? shortAddress(provider.owner) : '--'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Expires in</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {quote ? formatCountdown(quoteExpiresAtMs - now) : '--'}
            </p>
          </div>
        </div>
      </div>

      {(registerTxHash || bookingTxHash) && (
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text)]">
          <p className="mb-2 font-semibold">Latest transactions</p>
          <div className="space-y-1">
            {registerTxHash && (
              <p>
                Register provider: {txUrl(registerTxHash) ? <a className="underline" href={txUrl(registerTxHash) as string} target="_blank" rel="noreferrer">{shortHex(registerTxHash)}</a> : shortHex(registerTxHash)}
              </p>
            )}
            {bookingTxHash && (
              <p>
                Booking: {txUrl(bookingTxHash) ? <a className="underline" href={txUrl(bookingTxHash) as string} target="_blank" rel="noreferrer">{shortHex(bookingTxHash)}</a> : shortHex(bookingTxHash)}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            void refreshQuote();
          }}
          disabled={!provider || quoteLoading}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh quote
        </button>
        <button
          type="button"
          onClick={clearStatus}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear status
        </button>
      </div>

      <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
        <p className="font-semibold text-[var(--text)]">Provider manager action</p>
        <p className="mt-1">{managerHelper}</p>
        <button
          type="button"
          onClick={() => {
            void registerProvider();
          }}
          disabled={managerDisabled}
          className="mt-3 min-h-[44px] w-full rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {registeringProvider ? 'Registering provider...' : 'Manager: register provider'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          void handlePrimaryAction();
        }}
        disabled={primaryDisabled}
        className="mt-3 min-h-[48px] w-full rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-bold text-[var(--background)] transition hover:bg-[var(--primary-pressed)] disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--text-faint)]"
      >
        {primaryLabel}
      </button>
    </section>
  );
}
