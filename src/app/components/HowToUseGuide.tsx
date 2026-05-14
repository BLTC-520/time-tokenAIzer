'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  Layers3,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface HowToUseGuideProps {
  currentState: string;
  availableStates: string[];
  isWalletConnected: boolean;
  onNavigate: (state: string) => void;
}

interface GuideStep {
  id: string;
  state: string;
  anchorId: string;
  title: string;
  eyebrow: string;
  body: string;
  detail: string;
  actionLabel: string;
  lockedLabel: string;
}

const guideSteps: GuideStep[] = [
  {
    id: 'kyc',
    state: 'kyc_verification',
    anchorId: 'kyc',
    eyebrow: 'Step 1',
    title: 'Connect and unlock access',
    body: 'Connect your wallet, then complete KYC. In local development, use the dev bypass button to skip the database, Chainlink, and NFT checks.',
    detail: 'This only gates the app flow. It does not create bookings or pool positions.',
    actionLabel: 'Open KYC',
    lockedLabel: 'Connect wallet first',
  },
  {
    id: 'questionnaire',
    state: 'questionnaire',
    anchorId: 'questionnaire',
    eyebrow: 'Step 2',
    title: 'Describe your sellable time',
    body: 'Answer the questionnaire with skills, availability, goals, and preferred work. GPT-5.5 uses this to shape your provider profile.',
    detail: 'Better inputs here produce cleaner inventory, rates, and booking suggestions later.',
    actionLabel: 'Open questionnaire',
    lockedLabel: 'Complete KYC first',
  },
  {
    id: 'profile',
    state: 'portfolio',
    anchorId: 'profile',
    eyebrow: 'Step 3',
    title: 'Review the GPT profile',
    body: 'The profile turns your answers into service ideas, earnings ranges, and positioning. Use it as the bridge into provider inventory.',
    detail: 'This is planning context, not onchain state.',
    actionLabel: 'Open profile',
    lockedLabel: 'Finish questionnaire first',
  },
  {
    id: 'strategy',
    state: 'tokenization',
    anchorId: 'strategy',
    eyebrow: 'Step 4',
    title: 'Choose a market strategy',
    body: 'Agentic mode bundles service ideas into realistic provider inventory. Pick the plan that matches your time capacity and risk.',
    detail: 'The goal is to avoid overselling redeemable hours.',
    actionLabel: 'Open strategy',
    lockedLabel: 'Generate profile first',
  },
  {
    id: 'publish',
    state: 'token_creation',
    anchorId: 'publish',
    eyebrow: 'Step 5',
    title: 'Publish provider inventory',
    body: 'Publishing creates redeemable provider terms for BookingManager. It is separate from Uniswap liquidity and separate from a buyer booking.',
    detail: 'Think inventory first, liquidity second, booking third.',
    actionLabel: 'Open publisher',
    lockedLabel: 'Select a strategy first',
  },
  {
    id: 'marketplace',
    state: 'marketplace',
    anchorId: 'marketplace',
    eyebrow: 'Step 6',
    title: 'Book or acquire TIME',
    body: 'In the marketplace, choose a provider, requested hours, and checkout mode: use TIME, swap USDC, or swap and book.',
    detail: 'The v4 hook checks swap intent. BookingManager is still what records service rights.',
    actionLabel: 'Open marketplace',
    lockedLabel: 'Complete access first',
  },
  {
    id: 'dashboard',
    state: 'dashboard',
    anchorId: 'dashboard',
    eyebrow: 'Step 7',
    title: 'Track bookings and liquidity',
    body: 'The dashboard separates open bookings, TIME credits, provider inventory, and v4 readiness so you can see what is real state.',
    detail: 'Pool depth is useful context; redeemable inventory caps what can be booked.',
    actionLabel: 'Open dashboard',
    lockedLabel: 'Complete access first',
  },
];

const guideIndexByState: Record<string, number> = {
  landing: 0,
  kyc_verification: 0,
  questionnaire: 1,
  processing: 2,
  portfolio: 2,
  tokenization: 3,
  token_creation: 4,
  marketplace: 5,
  dashboard: 6,
};

const storageKey = 'time-tokenizer-how-to-use-guide-seen';

function getInitialOpenState() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(storageKey) !== 'true';
}

export default function HowToUseGuide({
  currentState,
  availableStates,
  isWalletConnected,
  onNavigate,
}: HowToUseGuideProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(guideIndexByState[currentState] ?? 0);

  const availableSet = useMemo(() => new Set(availableStates), [availableStates]);
  const activeStep = guideSteps[activeIndex];
  const canOpenActiveStep = availableSet.has(activeStep.state);
  const isCurrentStep = guideIndexByState[currentState] === activeIndex;

  useEffect(() => {
    setIsOpen(getInitialOpenState());
  }, []);

  useEffect(() => {
    setActiveIndex(guideIndexByState[currentState] ?? 0);
  }, [currentState]);

  const markSeenAndClose = () => {
    window.localStorage.setItem(storageKey, 'true');
    setIsOpen(false);
  };

  const moveStep = (direction: 1 | -1) => {
    setActiveIndex((current) => {
      const next = current + direction;
      return Math.min(Math.max(0, next), guideSteps.length - 1);
    });
  };

  const openActiveStep = () => {
    if (!canOpenActiveStep) return;
    onNavigate(activeStep.state);

    window.setTimeout(() => {
      const anchor = document.querySelector(`[data-guide-id="${activeStep.anchorId}"]`);
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  return (
    <div className="liquid-guide-root" aria-live="polite">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="liquid-guide-launcher"
        aria-expanded={isOpen}
        aria-label="Open how to use guide"
      >
        <Compass aria-hidden="true" className="h-4 w-4" />
        <span>How to use</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.section
            key="guide-note"
            layout
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="liquid-guide-note"
          >
            <div className="liquid-guide-note__shine" aria-hidden="true" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="liquid-guide-icon">
                  {activeStep.id === 'kyc' && <WalletCards aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'questionnaire' && <ClipboardList aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'profile' && <BookOpen aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'strategy' && <Sparkles aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'publish' && <Layers3 aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'marketplace' && <CalendarClock aria-hidden="true" className="h-4 w-4" />}
                  {activeStep.id === 'dashboard' && <WalletCards aria-hidden="true" className="h-4 w-4" />}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">
                    {activeStep.eyebrow}
                  </p>
                  <h2 className="text-base font-semibold text-[var(--text-strong)]">
                    {activeStep.title}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={markSeenAndClose}
                className="liquid-guide-icon-button"
                aria-label="Close how to use guide"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-1" aria-label="Guide progress">
              {guideSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Open ${step.title}`}
                  className={`liquid-guide-dot ${index === activeIndex ? 'liquid-guide-dot--active' : ''}`}
                />
              ))}
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--text)]">{activeStep.body}</p>

            <div className="mt-3 rounded-[var(--radius-control)] border border-[var(--border-muted)] bg-[var(--surface-subtle)] p-3 text-xs leading-5 text-[var(--text-muted)]">
              {activeStep.detail}
            </div>

            {!isWalletConnected && activeStep.id === 'kyc' && (
              <p className="mt-3 text-xs font-medium text-[var(--warning)]">
                Connect a wallet first, then the dev KYC bypass can grant local access.
              </p>
            )}

            <div className="mt-5 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => moveStep(-1)}
                disabled={activeIndex === 0}
                className="liquid-guide-nav-button"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                Back
              </button>

              <button
                type="button"
                onClick={openActiveStep}
                disabled={!canOpenActiveStep}
                className="liquid-guide-primary-button"
              >
                {canOpenActiveStep
                  ? isCurrentStep
                    ? 'You are here'
                    : activeStep.actionLabel
                  : activeStep.lockedLabel}
              </button>

              <button
                type="button"
                onClick={() => moveStep(1)}
                disabled={activeIndex === guideSteps.length - 1}
                className="liquid-guide-nav-button"
              >
                Next
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
