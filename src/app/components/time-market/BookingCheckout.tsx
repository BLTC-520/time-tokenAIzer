'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Activity, CalendarClock, CircleAlert, Coins, ShieldCheck } from 'lucide-react';
import type { MarketplaceProvider } from './BookingMarketplace';

export type CheckoutMode = 'time' | 'swap' | 'swap_book';

type CheckoutState =
  | 'ready'
  | 'wallet_disconnected'
  | 'wrong_network'
  | 'quote_loading'
  | 'quote_expired'
  | 'inventory_insufficient'
  | 'permit2_required'
  | 'swap_pending'
  | 'swap_confirmed'
  | 'booking_pending'
  | 'booking_confirmed'
  | 'swap_confirmed_booking_failed';

type ExecutionState =
  | 'idle'
  | 'swap_pending'
  | 'swap_confirmed'
  | 'booking_pending'
  | 'booking_confirmed'
  | 'swap_confirmed_booking_failed';

interface BookingCheckoutProps {
  provider: MarketplaceProvider | null;
  requestedHours: number;
  isConnected: boolean;
  wrongNetwork: boolean;
  chainName: string;
  walletAddress?: string;
  onRequestedHoursChange: (hours: number) => void;
}

interface StateMeta {
  title: string;
  body: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const modeOptions: Array<{
  value: CheckoutMode;
  label: string;
  helper: string;
}> = [
  {
    value: 'time',
    label: 'Use TIME',
    helper: 'Book with wallet credits.',
  },
  {
    value: 'swap',
    label: 'Swap USDC',
    helper: 'Acquire TIME only.',
  },
  {
    value: 'swap_book',
    label: 'Swap and book',
    helper: 'Swap, then book separately.',
  },
];

const WAD = BigInt(10) ** BigInt(18);

function hoursFromWad(value: bigint) {
  return Number(value / WAD);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
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

function statusMeta(state: CheckoutState, chainName: string, mode: CheckoutMode): StateMeta {
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
    case 'quote_loading':
      return {
        title: 'Quote loading',
        body: 'Requesting signed booking terms and a swap estimate.',
        tone: 'neutral',
        icon: Activity,
      };
    case 'quote_expired':
      return {
        title: 'Quote expired',
        body: 'Refresh the signed quote before any swap or booking submission.',
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
    case 'permit2_required':
      return {
        title: 'Permit2 approval required',
        body: 'USDC swap routes need token allowance before Universal Router execution.',
        tone: 'warning',
        icon: ShieldCheck,
      };
    case 'swap_pending':
      return {
        title: 'Swap pending',
        body: 'The USDC to TIME swap is pending. A swap alone does not create a booking.',
        tone: 'neutral',
        icon: Activity,
      };
    case 'swap_confirmed':
      return {
        title: 'Swap confirmed',
        body: 'TIME was acquired. No BookingManager booking was created in this mode.',
        tone: 'success',
        icon: Coins,
      };
    case 'booking_pending':
      return {
        title: 'Booking pending',
        body: 'Submitting the signed quote to BookingManager for booking state.',
        tone: 'neutral',
        icon: CalendarClock,
      };
    case 'booking_confirmed':
      return {
        title: 'Booking confirmed',
        body: 'BookingManager recorded the booking. This confirmation is separate from swap execution.',
        tone: 'success',
        icon: ShieldCheck,
      };
    case 'swap_confirmed_booking_failed':
      return {
        title: 'Swap confirmed, booking failed',
        body: 'TIME remains in the wallet, but BookingManager did not create a booking.',
        tone: 'danger',
        icon: CircleAlert,
      };
    default:
      return {
        title: mode === 'swap' ? 'Ready to swap' : 'Ready to book',
        body:
          mode === 'swap'
            ? 'This path acquires TIME only and leaves booking for a later step.'
            : mode === 'swap_book'
              ? 'Swap for TIME, then submit a separate BookingManager transaction.'
              : 'Use wallet TIME credits with the signed BookingManager quote.',
        tone: 'success',
        icon: ShieldCheck,
      };
  }
}

export default function BookingCheckout({
  provider,
  requestedHours,
  isConnected,
  wrongNetwork,
  chainName,
  walletAddress,
  onRequestedHoursChange,
}: BookingCheckoutProps) {
  const [mode, setMode] = useState<CheckoutMode>('time');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteExpiresAt, setQuoteExpiresAt] = useState(() => Date.now() + 7 * 60 * 1000);
  const [now, setNow] = useState(() => Date.now());
  const [permit2Required, setPermit2Required] = useState(false);
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');

  useEffect(() => {
    setExecutionState('idle');
    setPermit2Required(mode !== 'time');
    setQuoteLoading(false);
    setQuoteExpiresAt(Date.now() + (provider?.quoteWindowMinutes ?? 7) * 60 * 1000);
  }, [mode, provider?.providerId, provider?.quoteWindowMinutes, requestedHours]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    setExecutionState('idle');
  }, [provider?.providerId]);

  const availableHours = provider ? hoursFromWad(provider.availableHoursWad) : 0;
  const maxHours = Math.max(1, availableHours);
  const inventoryInsufficient = Boolean(provider && requestedHours > availableHours);
  const quoteExpired = now >= quoteExpiresAt;

  const effectiveState: CheckoutState = useMemo(() => {
    if (!provider) return 'ready';
    if (!isConnected) return 'wallet_disconnected';
    if (wrongNetwork) return 'wrong_network';
    if (quoteLoading) return 'quote_loading';
    if (executionState !== 'idle') return executionState;
    if (inventoryInsufficient) return 'inventory_insufficient';
    if (quoteExpired) return 'quote_expired';
    if (mode !== 'time' && permit2Required) return 'permit2_required';
    return 'ready';
  }, [
    executionState,
    inventoryInsufficient,
    isConnected,
    mode,
    permit2Required,
    provider,
    quoteExpired,
    quoteLoading,
    wrongNetwork,
  ]);

  const meta = statusMeta(effectiveState, chainName, mode);
  const StatusIcon = meta.icon;
  const quoteTotal = provider ? provider.rateUsdc * requestedHours : 0;
  const timeRequired = requestedHours;
  const swapEstimate = quoteTotal * 1.008;
  const quoteId = provider ? `Q-${provider.providerId}-${requestedHours}H` : 'No provider';
  const primaryDisabled =
    !provider ||
    effectiveState === 'wallet_disconnected' ||
    effectiveState === 'wrong_network' ||
    effectiveState === 'inventory_insufficient' ||
    effectiveState === 'quote_loading' ||
    effectiveState === 'swap_pending' ||
    effectiveState === 'booking_pending' ||
    effectiveState === 'booking_confirmed' ||
    effectiveState === 'swap_confirmed';

  const primaryLabel = (() => {
    if (!provider) return 'Select provider';
    if (effectiveState === 'wallet_disconnected') return 'Connect wallet';
    if (effectiveState === 'wrong_network') return 'Switch network';
    if (effectiveState === 'quote_loading') return 'Quote loading';
    if (effectiveState === 'quote_expired') return 'Refresh quote';
    if (effectiveState === 'inventory_insufficient') return 'Reduce hours';
    if (effectiveState === 'permit2_required') return 'Approve Permit2';
    if (effectiveState === 'swap_pending') return 'Swap pending';
    if (effectiveState === 'booking_pending') return 'Booking pending';
    if (effectiveState === 'booking_confirmed') return 'Booking confirmed';
    if (effectiveState === 'swap_confirmed') return 'Swap confirmed';
    if (effectiveState === 'swap_confirmed_booking_failed') return 'Retry booking with TIME';
    if (mode === 'swap') return 'Preview swap submission';
    if (mode === 'swap_book') return 'Preview swap and booking';
    return 'Preview booking submission';
  })();

  const refreshQuote = () => {
    setQuoteLoading(true);
    setExecutionState('idle');
    window.setTimeout(() => {
      setQuoteLoading(false);
      setPermit2Required(mode !== 'time');
      setQuoteExpiresAt(Date.now() + (provider?.quoteWindowMinutes ?? 7) * 60 * 1000);
    }, 700);
  };

  const runBookingPreview = () => {
    setExecutionState('booking_pending');
    window.setTimeout(() => setExecutionState('booking_confirmed'), 900);
  };

  const runSwapPreview = () => {
    setExecutionState('swap_pending');
    window.setTimeout(() => setExecutionState('swap_confirmed'), 900);
  };

  const runSwapAndBookPreview = () => {
    setExecutionState('swap_pending');
    window.setTimeout(() => setExecutionState('booking_pending'), 900);
    window.setTimeout(() => setExecutionState('booking_confirmed'), 1800);
  };

  const handlePrimaryAction = () => {
    if (effectiveState === 'quote_expired') {
      refreshQuote();
      return;
    }

    if (effectiveState === 'permit2_required') {
      setPermit2Required(false);
      setExecutionState('idle');
      return;
    }

    if (effectiveState === 'swap_confirmed_booking_failed') {
      runBookingPreview();
      return;
    }

    if (effectiveState !== 'ready') return;

    if (mode === 'swap') {
      runSwapPreview();
      return;
    }

    if (mode === 'swap_book') {
      runSwapAndBookPreview();
      return;
    }

    runBookingPreview();
  };

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

      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-muted)]">
        {modeOptions.map((option) => {
          const selected = mode === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setMode(option.value)}
              className={`min-h-[52px] px-2 py-2 text-center text-xs transition ${
                selected
                  ? 'bg-[var(--primary)] text-[var(--background)]'
                  : 'bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
              }`}
            >
              <span className="block font-semibold">{option.label}</span>
              <span className="mt-0.5 block">{option.helper}</span>
            </button>
          );
        })}
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
            <span className="tabular-nums">{requestedHours}h selected</span>
          </span>
          <input
            type="number"
            min="1"
            max={maxHours}
            value={requestedHours}
            onChange={(event) => {
              const value = Number(event.target.value);
              onRequestedHoursChange(Math.min(Math.max(1, value || 1), maxHours));
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
            <p className="tabular-nums font-medium text-[var(--text-strong)]">{quoteId}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">TIME required</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {timeRequired} TIME
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Booking price</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? formatMoney(quoteTotal) : 'Select provider'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">USDC estimate</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? formatMoney(swapEstimate) : 'Select provider'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">Expires in</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {formatCountdown(quoteExpiresAt - now)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={refreshQuote}
          disabled={!provider || quoteLoading}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Refresh quote
        </button>
        <button
          type="button"
          onClick={() => {
            setExecutionState('idle');
            setQuoteExpiresAt(Date.now() - 1000);
          }}
          disabled={!provider}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Expire quote
        </button>
        <button
          type="button"
          onClick={() => setExecutionState('swap_confirmed_booking_failed')}
          disabled={!provider || mode !== 'swap_book'}
          className="col-span-2 min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Preview booking failure state
        </button>
      </div>

      <button
        type="button"
        onClick={handlePrimaryAction}
        disabled={primaryDisabled}
        className="mt-3 min-h-[48px] w-full rounded-[var(--radius-control)] bg-[var(--primary)] px-4 text-sm font-bold text-[var(--background)] transition hover:bg-[var(--primary-pressed)] disabled:cursor-not-allowed disabled:bg-[var(--surface-raised)] disabled:text-[var(--text-faint)]"
      >
        {primaryLabel}
      </button>
    </section>
  );
}
