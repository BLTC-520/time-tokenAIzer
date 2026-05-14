'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

import '@rainbow-me/rainbowkit/styles.css';

const WalletProviders = dynamic(
  () => import('./walletProviders').then((mod) => mod.WalletProviders),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProviders>{children}</WalletProviders>;
}
