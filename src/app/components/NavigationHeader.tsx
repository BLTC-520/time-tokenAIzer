'use client';

import { motion } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ClipboardList,
  WalletCards,
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { localStorage_utils } from '../utils/localStorage';

interface NavigationHeaderProps {
  currentState: string;
  onNavigate?: (state: string) => void;
  showNavigation?: boolean;
}

export default function NavigationHeader({
  currentState,
  onNavigate,
  showNavigation = false
}: NavigationHeaderProps) {
  const navigationSteps = [
    { id: 'questionnaire', label: 'Questionnaire', icon: ClipboardList },
    { id: 'portfolio', label: 'Profile', icon: BriefcaseBusiness },
    { id: 'tokenization', label: 'Agentic Mode', icon: Bot },
    { id: 'marketplace', label: 'Book', icon: CalendarClock },
    { id: 'dashboard', label: 'Portfolio', icon: WalletCards },
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = ['questionnaire', 'portfolio', 'tokenization', 'marketplace', 'dashboard'];
    const currentIndex = stepOrder.indexOf(currentState);
    const stepIndex = stepOrder.indexOf(stepId);
    const userHasReachedDashboard = localStorage_utils.hasUserReachedDashboard();

    // If user has reached dashboard, all steps are considered completed (except current)
    if (userHasReachedDashboard) {
      if (stepIndex === currentIndex) return 'current';
      return 'completed';
    }

    // Normal progression logic for first-time users
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border-muted)] bg-[var(--surface)] backdrop-blur-lg"
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo/Title */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center space-x-3"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] border border-[var(--primary)] bg-[var(--jade-muted)]">
              <span className="text-sm font-bold text-[var(--text-strong)]">TT</span>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-strong)]">Time Tokenizer</h1>
          </motion.div>

          {/* Navigation Steps */}
          {showNavigation && (
            <motion.nav
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="hidden md:flex items-center space-x-1"
            >
              {navigationSteps.map((step) => {
                const status = getStepStatus(step.id);
                const isClickable = status === 'completed' || status === 'current';
                const Icon = step.icon;

                return (
                  <motion.button
                    key={step.id}
                    onClick={() => isClickable && onNavigate?.(step.id)}
                    disabled={!isClickable}
                    whileHover={isClickable ? { scale: 1.05 } : {}}
                    whileTap={isClickable ? { scale: 0.95 } : {}}
                    className={`
                      flex min-h-[40px] items-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-all
                      ${status === 'current'
                        ? 'bg-[var(--primary)] text-[var(--background)] shadow-lg'
                        : status === 'completed'
                          ? 'bg-[var(--jade-muted)] text-[var(--text)] hover:bg-[var(--surface-raised)] cursor-pointer'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-faint)] cursor-not-allowed'
                      }
                    `}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span className="hidden lg:inline">{step.label}</span>
                  </motion.button>
                );
              })}
            </motion.nav>
          )}

          {/* Right side controls */}
          <div className="flex items-center space-x-3">
            <NotificationCenter />
            <ConnectButton />
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="md:hidden mt-3 pt-3 border-t border-[var(--border-muted)]"
          >
            <div className="flex items-center justify-center space-x-2 overflow-x-auto">
              {navigationSteps.map((step) => {
                const status = getStepStatus(step.id);
                const isClickable = status === 'completed' || status === 'current';
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    onClick={() => isClickable && onNavigate?.(step.id)}
                    disabled={!isClickable}
                    className={`
                      flex min-h-[56px] min-w-[80px] flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] px-3 py-2 transition-all
                      ${status === 'current'
                        ? 'bg-[var(--primary)] text-[var(--background)]'
                        : status === 'completed'
                          ? 'bg-[var(--jade-muted)] text-[var(--text)] hover:bg-[var(--surface-raised)]'
                          : 'bg-[var(--surface-subtle)] text-[var(--text-faint)] cursor-not-allowed'
                      }
                    `}
                  >
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    <span className="text-xs font-medium">{step.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
