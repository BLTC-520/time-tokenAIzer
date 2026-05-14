// React Hook for Local Storage State Management
import { useState, useEffect, useCallback } from 'react';
import {
  SessionData,
  UserAnswers,
  WalletData,
  TokenDraft,
  UserPreferences,
  saveSessionData,
  getSessionData,
  saveUserAnswers,
  getUserAnswers,
  savePortfolioData,
  getPortfolioData,
  saveWalletData,
  getWalletData,
  saveAppState,
  getAppState,
  saveQuestionnaireProgress,
  getQuestionnaireProgress,
  saveTokenDraft,
  getTokenDrafts,
  removeTokenDraft,
  updateTokenDraftStatus,
  saveChainPreference,
  getChainPreference,
  saveUserPreferences,
  getUserPreferences,
  enableAutoSave,
  disableAutoSave,
  clearSessionData,
} from '../utils/localStorage';
import type { PortfolioData } from '../types/portfolio';

// Main hook for session management
export const useSessionStorage = () => {
  const [sessionData, setSessionData] = useState<SessionData>(() => getSessionData());
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydration effect for SSR compatibility
  useEffect(() => {
    setIsHydrated(true);
    const data = getSessionData();
    setSessionData(data);
    
    // Enable auto-save on mount
    enableAutoSave();
    
    return () => {
      disableAutoSave();
    };
  }, []);

  const updateSession = useCallback((updates: Partial<SessionData>) => {
    const success = saveSessionData(updates);
    if (success) {
      setSessionData(prev => ({ ...prev, ...updates }));
    }
    return success;
  }, []);

  const clearSession = useCallback(() => {
    clearSessionData();
    setSessionData(getSessionData()); // Reset to default
  }, []);

  return {
    sessionData,
    updateSession,
    clearSession,
    isHydrated,
  };
};

// Hook for user answers
export const useUserAnswers = () => {
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const answers = getUserAnswers();
    setUserAnswers(answers);
    setIsLoaded(true);
  }, []);

  const saveAnswers = useCallback((answers: UserAnswers) => {
    const success = saveUserAnswers(answers);
    if (success) {
      setUserAnswers(answers);
    }
    return success;
  }, []);

  const clearAnswers = useCallback(() => {
    setUserAnswers(null);
    // Clear from session data as well
    saveSessionData({ userAnswers: null });
  }, []);

  return {
    userAnswers,
    saveAnswers,
    clearAnswers,
    isLoaded,
  };
};

// Hook for portfolio data
export const usePortfolioData = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const data = getPortfolioData();
    setPortfolioData(data);
    setIsLoaded(true);
  }, []);

  const savePortfolio = useCallback((data: PortfolioData) => {
    const success = savePortfolioData(data);
    if (success) {
      setPortfolioData(data);
    }
    return success;
  }, []);

  const clearPortfolio = useCallback(() => {
    setPortfolioData(null);
    saveSessionData({ portfolioData: null });
  }, []);

  return {
    portfolioData,
    savePortfolio,
    clearPortfolio,
    isLoaded,
  };
};

// Hook for wallet data
export const useWalletData = () => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const data = getWalletData();
    setWalletData(data);
    setIsLoaded(true);
  }, []);

  const saveWallet = useCallback((data: WalletData) => {
    const success = saveWalletData(data);
    if (success) {
      setWalletData(data);
    }
    return success;
  }, []);

  const clearWallet = useCallback(() => {
    setWalletData(null);
    saveSessionData({ walletData: null });
  }, []);

  return {
    walletData,
    saveWallet,
    clearWallet,
    isLoaded,
  };
};

// Hook for app state management
export const useAppState = () => {
  const [appState, setAppState] = useState<SessionData['currentAppState']>('landing');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const state = getAppState();
    setAppState(state);
    setIsLoaded(true);
  }, []);

  const updateAppState = useCallback((state: SessionData['currentAppState']) => {
    const success = saveAppState(state);
    if (success) {
      setAppState(state);
    }
    return success;
  }, []);

  return {
    appState,
    updateAppState,
    isLoaded,
  };
};

// Hook for questionnaire progress
export const useQuestionnaireProgress = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const step = getQuestionnaireProgress();
    setCurrentStep(step);
    setIsLoaded(true);
  }, []);

  const updateProgress = useCallback((step: number) => {
    const success = saveQuestionnaireProgress(step);
    if (success) {
      setCurrentStep(step);
    }
    return success;
  }, []);

  const resetProgress = useCallback(() => {
    const success = saveQuestionnaireProgress(0);
    if (success) {
      setCurrentStep(0);
    }
    return success;
  }, []);

  return {
    currentStep,
    updateProgress,
    resetProgress,
    isLoaded,
  };
};

// Hook for token drafts management
export const useTokenDrafts = () => {
  const [tokenDrafts, setTokenDrafts] = useState<TokenDraft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const drafts = getTokenDrafts();
    setTokenDrafts(drafts);
    setIsLoaded(true);
  }, []);

  const saveDraft = useCallback((draft: TokenDraft) => {
    const success = saveTokenDraft(draft);
    if (success) {
      setTokenDrafts(prev => {
        const filtered = prev.filter(d => d.id !== draft.id);
        return [...filtered, draft];
      });
    }
    return success;
  }, []);

  const removeDraft = useCallback((draftId: string) => {
    const success = removeTokenDraft(draftId);
    if (success) {
      setTokenDrafts(prev => prev.filter(d => d.id !== draftId));
    }
    return success;
  }, []);

  const updateDraftStatus = useCallback((draftId: string, status: TokenDraft['status']) => {
    const success = updateTokenDraftStatus(draftId, status);
    if (success) {
      setTokenDrafts(prev => prev.map(d => 
        d.id === draftId ? { ...d, status } : d
      ));
    }
    return success;
  }, []);

  return {
    tokenDrafts,
    saveDraft,
    removeDraft,
    updateDraftStatus,
    isLoaded,
  };
};

// Hook for chain preference
export const useChainPreference = () => {
  const [chainId, setChainId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const preference = getChainPreference();
    setChainId(preference);
    setIsLoaded(true);
  }, []);

  const updateChainPreference = useCallback((newChainId: number) => {
    const success = saveChainPreference(newChainId);
    if (success) {
      setChainId(newChainId);
    }
    return success;
  }, []);

  return {
    chainId,
    updateChainPreference,
    isLoaded,
  };
};

// Hook for user preferences
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(() => getUserPreferences());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const prefs = getUserPreferences();
    setPreferences(prefs);
    setIsLoaded(true);
  }, []);

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    const success = saveUserPreferences(updates);
    if (success) {
      setPreferences(prev => ({ ...prev, ...updates }));
    }
    return success;
  }, []);

  return {
    preferences,
    updatePreferences,
    isLoaded,
  };
};

// Hook for auto-save status
export const useAutoSave = () => {
  const { preferences, updatePreferences } = useUserPreferences();
  
  const toggleAutoSave = useCallback(() => {
    const newState = !preferences.autoSave;
    updatePreferences({ autoSave: newState });
    
    if (newState) {
      enableAutoSave();
    } else {
      disableAutoSave();
    }
  }, [preferences.autoSave, updatePreferences]);

  return {
    isEnabled: preferences.autoSave,
    toggle: toggleAutoSave,
  };
};

// Comprehensive hook that combines all storage functionality
export const useTimeTokenizerStorage = () => {
  const session = useSessionStorage();
  const userAnswers = useUserAnswers();
  const portfolio = usePortfolioData();
  const wallet = useWalletData();
  const appState = useAppState();
  const questionnaire = useQuestionnaireProgress();
  const tokenDrafts = useTokenDrafts();
  const chainPreference = useChainPreference();
  const preferences = useUserPreferences();
  const autoSave = useAutoSave();

  const isFullyLoaded = 
    session.isHydrated &&
    userAnswers.isLoaded &&
    portfolio.isLoaded &&
    wallet.isLoaded &&
    appState.isLoaded &&
    questionnaire.isLoaded &&
    tokenDrafts.isLoaded &&
    chainPreference.isLoaded &&
    preferences.isLoaded;

  const clearAllData = useCallback(() => {
    session.clearSession();
    userAnswers.clearAnswers();
    portfolio.clearPortfolio();
    wallet.clearWallet();
    questionnaire.resetProgress();
    appState.updateAppState('landing');
  }, [session, userAnswers, portfolio, wallet, questionnaire, appState]);

  return {
    session,
    userAnswers,
    portfolio,
    wallet,
    appState,
    questionnaire,
    tokenDrafts,
    chainPreference,
    preferences,
    autoSave,
    isFullyLoaded,
    clearAllData,
  };
};
