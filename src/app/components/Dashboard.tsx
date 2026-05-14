'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CircleAlert,
  Coins,
  Layers3,
  Plus,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useAccount, useChainId } from 'wagmi';
import { getChainDisplayName } from '../lib/wagmi';
import { getTimeMarketContracts } from '../shared/constants';
import { isV4SupportedChainId } from '../shared/uniswapV4';

interface DashboardProps {
  onCreateToken?: () => void;
  onViewMarketplace?: () => void;
}

type StatusTone = 'success' | 'warning' | 'neutral';

interface BookingRow {
  id: string;
  provider: string;
  status: string;
  tone: StatusTone;
  hours: string;
  slot: string;
  settlement: string;
}

interface InventoryRow {
  service: string;
  available: string;
  booked: string;
  poolDepth: string;
  status: string;
  tone: StatusTone;
}

const bookingRows: BookingRow[] = [
  {
    id: 'B-1042-2H',
    provider: 'Protocol architecture review',
    status: 'Booked',
    tone: 'success',
    hours: '2 TIME',
    slot: 'May 16, 14:00',
    settlement: 'Credits locked',
  },
  {
    id: 'B-1188-4H',
    provider: 'AI workflow implementation',
    status: 'Pending completion',
    tone: 'neutral',
    hours: '4 TIME',
    slot: 'May 18, 17:30',
    settlement: 'Escrow active',
  },
  {
    id: 'B-1215-1H',
    provider: 'Security tabletop session',
    status: 'Quote expires soon',
    tone: 'warning',
    hours: '1 TIME',
    slot: 'May 20, 09:00',
    settlement: 'Needs submit',
  },
];

const inventoryRows: InventoryRow[] = [
  {
    service: 'Protocol architecture review',
    available: '18h',
    booked: '6h',
    poolDepth: '$82k',
    status: 'Online',
    tone: 'success',
  },
  {
    service: 'Security tabletop session',
    available: '6h',
    booked: '12h',
    poolDepth: '$63k',
    status: 'Low inventory',
    tone: 'warning',
  },
  {
    service: 'Launch readiness review',
    available: '0h',
    booked: '9h',
    poolDepth: '$31k',
    status: 'Paused',
    tone: 'neutral',
  },
];

const emptyContracts = {
  timeCreditToken: '0x0000000000000000000000000000000000000000',
  bookingManager: '0x0000000000000000000000000000000000000000',
  timePoolHook: '0x0000000000000000000000000000000000000000',
  usdc: '0x0000000000000000000000000000000000000000',
} as const;

function shortAddress(value?: string) {
  if (!value) return 'Not connected';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function statusClass(tone: StatusTone) {
  switch (tone) {
    case 'success':
      return 'border-[var(--success)] bg-[var(--jade-muted)] text-[var(--text-strong)]';
    case 'warning':
      return 'border-[var(--warning)] bg-[var(--amber-muted)] text-[var(--text-strong)]';
    default:
      return 'border-[var(--border-muted)] bg-[var(--surface-subtle)] text-[var(--text)]';
  }
}

function contractStatus(value: `0x${string}`) {
  return value === '0x0000000000000000000000000000000000000000'
    ? 'Not configured'
    : `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function Dashboard({ onCreateToken, onViewMarketplace }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const chainName = getChainDisplayName(chainId);
  const wrongNetwork = !isV4SupportedChainId(chainId);
  const contracts = getTimeMarketContracts(chainId) ?? emptyContracts;

  return (
    <main className="protocol-shell px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="material-panel mb-4 flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-faint)]">
              Portfolio
            </p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight text-[var(--text-strong)]">
              Booking and liquidity command center
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

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="material-panel p-4">
            <div className="flex items-center gap-3">
              <WalletCards aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
              <p className="text-xs text-[var(--text-faint)]">Wallet</p>
            </div>
            <p className="mt-3 tabular-nums text-xl font-semibold text-[var(--text-strong)]">
              {shortAddress(address)}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {isConnected ? 'Ready for booking actions' : 'Connect to load live positions'}
            </p>
          </div>

          <div className="material-panel p-4">
            <div className="flex items-center gap-3">
              <Coins aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
              <p className="text-xs text-[var(--text-faint)]">TIME credits</p>
            </div>
            <p className="mt-3 tabular-nums text-xl font-semibold text-[var(--text-strong)]">
              14.0 TIME
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Available for BookingManager</p>
          </div>

          <div className="material-panel p-4">
            <div className="flex items-center gap-3">
              <BookOpen aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
              <p className="text-xs text-[var(--text-faint)]">Open bookings</p>
            </div>
            <p className="mt-3 tabular-nums text-xl font-semibold text-[var(--text-strong)]">
              {bookingRows.length}
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Tracked outside the AMM pool</p>
          </div>

          <div className="material-panel p-4">
            <div className="flex items-center gap-3">
              <Layers3 aria-hidden="true" className="h-5 w-5 text-[var(--primary)]" />
              <p className="text-xs text-[var(--text-faint)]">LP exposure</p>
            </div>
            <p className="mt-3 tabular-nums text-xl font-semibold text-[var(--text-strong)]">
              $8.4k
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">TIME/USDC preview position</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.45fr_0.9fr]">
          <section className="material-panel min-w-0 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  BookingManager
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Active booking state
                </h2>
              </div>
              {onViewMarketplace && (
                <button
                  type="button"
                  onClick={onViewMarketplace}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] px-4 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
                >
                  Open marketplace
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.15fr_0.6fr_0.55fr_0.65fr_0.7fr] gap-3 border-b border-[var(--border-muted)] pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-faint)]">
                  <span>Booking</span>
                  <span>Status</span>
                  <span>Hours</span>
                  <span>Slot</span>
                  <span>Settlement</span>
                </div>
                <div className="divide-y divide-[var(--border-muted)]">
                  {bookingRows.map((booking) => (
                    <div
                      key={booking.id}
                      className="grid grid-cols-[1.15fr_0.6fr_0.55fr_0.65fr_0.7fr] gap-3 py-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[var(--text-strong)]">
                          {booking.provider}
                        </p>
                        <p className="mt-1 tabular-nums text-xs text-[var(--text-faint)]">
                          {booking.id}
                        </p>
                      </div>
                      <span
                        className={`inline-flex min-h-[28px] w-fit items-center rounded-md border px-2 text-xs font-semibold ${statusClass(
                          booking.tone
                        )}`}
                      >
                        {booking.status}
                      </span>
                      <span className="tabular-nums text-[var(--text)]">{booking.hours}</span>
                      <span className="text-[var(--text)]">{booking.slot}</span>
                      <span className="text-[var(--text-muted)]">{booking.settlement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="transaction-sheet p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                  v4 readiness
                </p>
                <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                  Pool and hook wiring
                </h2>
              </div>
              <Activity aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">TIME token</span>
                <span className="tabular-nums font-medium text-[var(--text-strong)]">
                  {contractStatus(contracts.timeCreditToken)}
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
              <div className="flex items-center justify-between gap-4">
                <span className="text-[var(--text-muted)]">Quote boundary</span>
                <span className="font-medium text-[var(--text-strong)]">Hook checks only</span>
              </div>
            </div>

            <div className="mt-4 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--amber-muted)] p-3 text-xs text-[var(--text)]">
              Swaps can acquire TIME, but only BookingManager creates service rights and slot state.
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {onCreateToken && (
                <button
                  type="button"
                  onClick={onCreateToken}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--primary)] px-3 text-sm font-bold text-[var(--background)] transition hover:bg-[var(--primary-pressed)]"
                >
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Publish
                </button>
              )}
              {onViewMarketplace && (
                <button
                  type="button"
                  onClick={onViewMarketplace}
                  className="flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] px-3 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
                >
                  Book
                  <CalendarClock aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>
        </div>

        <section className="material-panel mt-4 p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                Provider inventory
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
                Redeemable hours and market depth
              </h2>
            </div>
            <p className="text-sm text-[var(--text-muted)]">
              AMM depth is informational; inventory caps redemption.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {inventoryRows.map((item) => (
              <div
                key={item.service}
                className="rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold text-[var(--text-strong)]">{item.service}</h3>
                  <span
                    className={`inline-flex min-h-[28px] shrink-0 items-center rounded-md border px-2 text-xs font-semibold ${statusClass(
                      item.tone
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-[var(--text-faint)]">Available</p>
                    <p className="tabular-nums font-semibold text-[var(--text-strong)]">
                      {item.available}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-faint)]">Booked</p>
                    <p className="tabular-nums font-semibold text-[var(--text-strong)]">
                      {item.booked}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-faint)]">Pool</p>
                    <p className="tabular-nums font-semibold text-[var(--text-strong)]">
                      {item.poolDepth}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
