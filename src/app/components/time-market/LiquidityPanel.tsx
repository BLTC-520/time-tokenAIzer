'use client';

import { Activity, CircleAlert, Coins, ShieldCheck } from 'lucide-react';
import { getV4Deployment, isV4SupportedChainId } from '../../shared/uniswapV4';
import type { MarketplaceProvider } from './BookingMarketplace';

interface LiquidityPanelProps {
  provider: MarketplaceProvider | null;
  chainId: number;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default function LiquidityPanel({ provider, chainId }: LiquidityPanelProps) {
  const deployment = isV4SupportedChainId(chainId) ? getV4Deployment(chainId) : null;

  return (
    <section className="material-panel p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
            Liquidity
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--text-strong)]">
            TIME/USDC route
          </h2>
        </div>
        <Coins aria-hidden="true" className="mt-1 h-5 w-5 text-[var(--primary)]" />
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Pool depth</span>
          <span className="tabular-nums font-semibold text-[var(--text-strong)]">
            {provider?.poolDepth ?? 'Select provider'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Execution</span>
          <span className="font-semibold text-[var(--text-strong)]">Universal Router</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[var(--text-muted)]">Hook intent</span>
          <span className="font-semibold text-[var(--text-strong)]">
            Signed quote data
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-[var(--border-muted)] pt-4 text-xs">
        {deployment ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[var(--text-muted)]">
                <ShieldCheck aria-hidden="true" className="h-4 w-4 text-[var(--success)]" />
                v4 configured
              </span>
              <span className="font-medium text-[var(--text)]">Chain {chainId}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Router</span>
              <span className="tabular-nums text-[var(--text)]">
                {shortAddress(deployment.universalRouter)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--text-muted)]">Quoter</span>
              <span className="tabular-nums text-[var(--text)]">
                {shortAddress(deployment.quoter)}
              </span>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--warning)] bg-[var(--amber-muted)] p-3 text-[var(--text)]">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warning)]" />
            <span>Switch to Sepolia or Base Sepolia for the v4 liquidity route.</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs text-[var(--text-muted)]">
        <Activity aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
        <p>Pool execution can acquire TIME, but BookingManager still records bookings.</p>
      </div>
    </section>
  );
}
