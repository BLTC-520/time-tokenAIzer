'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import type { Address, Hex } from 'viem';
import { Activity, CalendarClock, CircleAlert, Coins, ShieldCheck } from 'lucide-react';
import type { MarketplaceProvider } from './BookingMarketplace';
import { BLOCK_EXPLORERS, getTimeMarketContracts } from '../../shared/constants';
import { getV4Deployment } from '../../shared/uniswapV4';
import { BookingService } from '../../services/bookingService';
import { UniswapV4Service } from '../../services/uniswapV4Service';
import type { BookingQuote, V4PoolKeyConfig } from '../../types/time-market';

export type CheckoutMode = 'time' | 'swap' | 'swap_book';

type CheckoutState =
  | 'ready'
  | 'wallet_disconnected'
  | 'wrong_network'
  | 'config_missing'
  | 'quote_loading'
  | 'quote_expired'
  | 'inventory_insufficient'
  | 'swap_pending'
  | 'swap_confirmed'
  | 'booking_pending'
  | 'booking_confirmed'
  | 'swap_confirmed_booking_failed'
  | 'execution_failed';

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
  chainId: number;
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
const USDC_DECIMALS = BigInt(10) ** BigInt(6);
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const UNIVERSAL_ROUTER_ABI = [
  {
    type: 'function',
    name: 'execute',
    stateMutability: 'payable',
    inputs: [
      { name: 'commands', type: 'bytes' },
      { name: 'inputs', type: 'bytes[]' },
      { name: 'deadline', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;

function hoursFromWad(value: bigint) {
  return Number(value / WAD);
}

function toHoursWad(hours: number) {
  return BigInt(Math.max(1, Math.floor(hours))) * WAD;
}

function toUsdcAmount(hours: number, hourlyRate: number) {
  const normalizedHours = Math.max(1, Math.floor(hours));
  const normalizedRate = Math.max(1, Math.floor(hourlyRate));
  return BigInt(normalizedHours * normalizedRate) * USDC_DECIMALS;
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
  mode: CheckoutMode,
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
        body: 'Required booking/swap contract addresses are missing for this chain environment.',
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
    case 'swap_pending':
      return {
        title: 'Swap pending',
        body: 'Executing Permit2/Universal Router flow on-chain.',
        tone: 'neutral',
        icon: Activity,
      };
    case 'swap_confirmed':
      return {
        title: 'Swap confirmed',
        body: 'TIME was acquired. BookingManager booking is still a separate transaction.',
        tone: 'success',
        icon: Coins,
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
    case 'swap_confirmed_booking_failed':
      return {
        title: 'Swap confirmed, booking failed',
        body: errorMessage || 'TIME is in wallet, but BookingManager booking transaction failed.',
        tone: 'danger',
        icon: CircleAlert,
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
        title: mode === 'swap' ? 'Ready to swap' : 'Ready to book',
        body:
          mode === 'swap'
            ? 'This path acquires TIME only and leaves booking for a later step.'
            : mode === 'swap_book'
              ? 'Swap for TIME, then submit a separate BookingManager transaction.'
              : 'Use wallet TIME credits with a signed BookingManager quote.',
        tone: 'success',
        icon: ShieldCheck,
      };
  }
}

function normalizeAddress(value: string): Address {
  return value as Address;
}

function buildPoolKey(
  usdc: Address,
  timeCreditToken: Address,
  hooks: Address,
  fee: number,
  tickSpacing: number
): V4PoolKeyConfig {
  const [currency0, currency1] =
    usdc.toLowerCase() < timeCreditToken.toLowerCase()
      ? [usdc, timeCreditToken]
      : [timeCreditToken, usdc];

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  };
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
}: BookingCheckoutProps) {
  const [mode, setMode] = useState<CheckoutMode>('time');
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<bigint>(BigInt(0));
  const [now, setNow] = useState(() => Date.now());
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [registeringProvider, setRegisteringProvider] = useState(false);
  const [registerTxHash, setRegisterTxHash] = useState<Hex | null>(null);
  const [permitTxHash, setPermitTxHash] = useState<Hex | null>(null);
  const [swapTxHash, setSwapTxHash] = useState<Hex | null>(null);
  const [bookingTxHash, setBookingTxHash] = useState<Hex | null>(null);

  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId });

  const chainContracts = getTimeMarketContracts(chainId);
  const bookingManagerAddress = chainContracts?.bookingManager;
  const timeTokenAddress = chainContracts?.timeCreditToken;
  const usdcAddress = chainContracts?.usdc;
  const hookAddress = chainContracts?.timePoolHook;

  const normalizedHours = Math.max(1, Math.floor(requestedHours));
  const availableHours = provider ? hoursFromWad(provider.availableHoursWad) : 0;
  const maxHours = Math.max(1, availableHours);
  const inventoryInsufficient = Boolean(provider && normalizedHours > availableHours);
  const quoteExpiresAtMs = quote ? Number(quote.expiresAt) * 1000 : 0;
  const quoteExpired = !quote || now >= quoteExpiresAtMs;

  const bookingConfigured = Boolean(
    bookingManagerAddress && bookingManagerAddress.toLowerCase() !== ZERO_ADDRESS
  );
  const swapConfigured = Boolean(
    timeTokenAddress &&
      usdcAddress &&
      hookAddress &&
      timeTokenAddress.toLowerCase() !== ZERO_ADDRESS &&
      usdcAddress.toLowerCase() !== ZERO_ADDRESS &&
      hookAddress.toLowerCase() !== ZERO_ADDRESS
  );

  const modeConfigured = mode === 'time' ? bookingConfigured : bookingConfigured && swapConfigured;

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

  const uniswapService = useMemo(
    () =>
      new UniswapV4Service({
        publicClient,
        walletClient: walletClient ?? undefined,
        account: walletAddress ? normalizeAddress(walletAddress) : undefined,
      }),
    [publicClient, walletAddress, walletClient]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const resetExecution = useCallback(() => {
    setExecutionState('idle');
    setExecutionError(null);
    setRegisterTxHash(null);
    setPermitTxHash(null);
    setSwapTxHash(null);
    setBookingTxHash(null);
  }, []);

  useEffect(() => {
    resetExecution();
  }, [mode, provider?.providerId, normalizedHours, resetExecution]);

  const quoteTotal = provider ? provider.rateUsdc * normalizedHours : 0;
  const swapEstimate = quoteTotal;
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

  const runSwap = useCallback(
    async (liveQuote: BookingQuote): Promise<boolean> => {
      if (!provider || !publicClient || !walletClient || !walletAddress || !swapConfigured) {
        setExecutionError('Swap dependencies are not ready. Check wallet and contract configuration.');
        return false;
      }

      setExecutionError(null);
      setExecutionState('swap_pending');

      try {
        const deployment = getV4Deployment(chainId);
        const fee = Number.parseInt(process.env.NEXT_PUBLIC_POOL_FEE ?? '3000', 10);
        const tickSpacing = Number.parseInt(process.env.NEXT_PUBLIC_POOL_TICK_SPACING ?? '60', 10);
        const poolKey = buildPoolKey(
          normalizeAddress(usdcAddress as string),
          normalizeAddress(timeTokenAddress as string),
          normalizeAddress(hookAddress as string),
          Number.isFinite(fee) ? fee : 3000,
          Number.isFinite(tickSpacing) ? tickSpacing : 60
        );

        const usdcIsCurrency0 =
          poolKey.currency0.toLowerCase() === (usdcAddress as string).toLowerCase();
        const amountIn = toUsdcAmount(normalizedHours, provider.rateUsdc);
        const hookData = uniswapService.buildHookData(liveQuote);

        const quoteResult = await uniswapService.quoteExactInputSingle({
          chainId,
          poolKey,
          zeroForOne: usdcIsCurrency0,
          amountIn,
          hookData,
        });

        const permitHash = await uniswapService.ensurePermit2Approval({
          token: normalizeAddress(usdcAddress as string),
          chainId,
          amount: amountIn,
          spender: deployment.universalRouter,
          owner: normalizeAddress(walletAddress),
        });

        if (permitHash) {
          setPermitTxHash(permitHash);
          await publicClient.waitForTransactionReceipt({ hash: permitHash });
        }

        const swapCall = uniswapService.buildExactInputSingle({
          chainId,
          poolKey,
          zeroForOne: usdcIsCurrency0,
          amountIn,
          amountOutMinimum: quoteResult.amountOutMinimum,
          hookData,
        });

        const account = walletClient.account ?? normalizeAddress(walletAddress);
        const txHash = await walletClient.writeContract({
          account,
          chain: walletClient.chain ?? null,
          address: deployment.universalRouter,
          abi: UNIVERSAL_ROUTER_ABI,
          functionName: 'execute',
          args: [swapCall.commands, swapCall.inputs, swapCall.deadline],
          value: swapCall.value,
        });

        setSwapTxHash(txHash);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        setExecutionState('swap_confirmed');
        return true;
      } catch (error) {
        setExecutionError(parseError(error));
        setExecutionState('idle');
        return false;
      }
    },
    [
      chainId,
      hookAddress,
      normalizedHours,
      provider,
      publicClient,
      swapConfigured,
      timeTokenAddress,
      uniswapService,
      usdcAddress,
      walletAddress,
      walletClient,
    ]
  );

  const effectiveState: CheckoutState = useMemo(() => {
    if (!provider) return 'ready';
    if (!isConnected) return 'wallet_disconnected';
    if (wrongNetwork) return 'wrong_network';
    if (!modeConfigured) return 'config_missing';
    if (quoteLoading) return 'quote_loading';
    if (executionState !== 'idle') return executionState;
    if (inventoryInsufficient) return 'inventory_insufficient';
    if (quoteExpired) return 'quote_expired';
    if (executionError || quoteError) return 'execution_failed';
    return 'ready';
  }, [
    executionError,
    executionState,
    inventoryInsufficient,
    isConnected,
    modeConfigured,
    provider,
    quoteError,
    quoteExpired,
    quoteLoading,
    wrongNetwork,
  ]);

  const meta = statusMeta(effectiveState, chainName, mode, executionError || quoteError);
  const StatusIcon = meta.icon;

  const primaryDisabled =
    !provider ||
    effectiveState === 'wallet_disconnected' ||
    effectiveState === 'wrong_network' ||
    effectiveState === 'config_missing' ||
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
    if (effectiveState === 'config_missing') return 'Fix contract config';
    if (effectiveState === 'quote_loading') return 'Quote loading';
    if (effectiveState === 'quote_expired') return 'Refresh quote';
    if (effectiveState === 'inventory_insufficient') return 'Reduce hours';
    if (effectiveState === 'swap_pending') return 'Swap pending';
    if (effectiveState === 'booking_pending') return 'Booking pending';
    if (effectiveState === 'booking_confirmed') return 'Booking confirmed';
    if (effectiveState === 'swap_confirmed') return 'Swap confirmed';
    if (effectiveState === 'swap_confirmed_booking_failed') return 'Retry booking with TIME';
    if (mode === 'swap') return 'Swap USDC -> TIME';
    if (mode === 'swap_book') return 'Swap then book';
    return 'Book with TIME';
  })();

  const handlePrimaryAction = async () => {
    if (!provider || !isConnected || wrongNetwork) return;

    const liveQuote = !quoteExpired && quote ? quote : await refreshQuote();
    if (!liveQuote) return;

    if (mode === 'time') {
      await submitBooking(liveQuote);
      return;
    }

    if (mode === 'swap') {
      await runSwap(liveQuote);
      return;
    }

    if (executionState === 'swap_confirmed_booking_failed') {
      await submitBooking(liveQuote);
      return;
    }

    const swapOk = await runSwap(liveQuote);
    if (!swapOk) return;

    const bookingOk = await submitBooking(liveQuote);
    if (!bookingOk) {
      setExecutionState('swap_confirmed_booking_failed');
    }
  };

  const registerProvider = async () => {
    if (!provider || !walletAddress || !publicClient || !bookingConfigured) return;

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
            <span className="tabular-nums">{normalizedHours}h selected</span>
          </span>
          <input
            type="number"
            min="1"
            max={maxHours}
            step="1"
            value={normalizedHours}
            onChange={(event) => {
              const value = Number(event.target.value);
              const next = Math.min(Math.max(1, Math.floor(value || 1)), maxHours);
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
            <p className="text-xs text-[var(--text-faint)]">Booking price</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? formatMoney(quoteTotal) : 'Select provider'}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-faint)]">USDC swap input</p>
            <p className="tabular-nums font-medium text-[var(--text-strong)]">
              {provider ? formatMoney(swapEstimate) : 'Select provider'}
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

      {(registerTxHash || permitTxHash || swapTxHash || bookingTxHash) && (
        <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text)]">
          <p className="mb-2 font-semibold">Latest transactions</p>
          <div className="space-y-1">
            {registerTxHash && (
              <p>
                Register provider: {txUrl(registerTxHash) ? <a className="underline" href={txUrl(registerTxHash) as string} target="_blank" rel="noreferrer">{shortHex(registerTxHash)}</a> : shortHex(registerTxHash)}
              </p>
            )}
            {permitTxHash && (
              <p>
                Permit2: {txUrl(permitTxHash) ? <a className="underline" href={txUrl(permitTxHash) as string} target="_blank" rel="noreferrer">{shortHex(permitTxHash)}</a> : shortHex(permitTxHash)}
              </p>
            )}
            {swapTxHash && (
              <p>
                Swap: {txUrl(swapTxHash) ? <a className="underline" href={txUrl(swapTxHash) as string} target="_blank" rel="noreferrer">{shortHex(swapTxHash)}</a> : shortHex(swapTxHash)}
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

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
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
        <button
          type="button"
          onClick={() => {
            void registerProvider();
          }}
          disabled={!provider || !isConnected || !walletAddress || !bookingConfigured || registeringProvider}
          className="min-h-[44px] rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {registeringProvider ? 'Registering provider...' : 'Register provider on-chain'}
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
