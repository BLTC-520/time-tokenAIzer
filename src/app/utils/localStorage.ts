// Local Storage Utility Functions for Time Tokenizer
import type { PortfolioData } from '../types/portfolio';

// Types for localStorage data
export interface UserAnswers {
  name: string;
  experience: string;
  skills: string[];
  timeAvailable: string;
  goals: string;
  preferredProjects: string[];
  hourlyRate: string;
}

export interface WalletData {
  address: string;
  chainId: number;
  isConnected: boolean;
  lastConnected: number;
}

export interface TokenDraft {
  id: string;
  serviceName: string;
  pricePerHour: number;
  totalHours: number;
  validityDays: number;
  description?: string;
  createdAt: number;
  status: 'draft' | 'minting' | 'minted' | 'failed';
}

export interface SessionData {
  userAnswers: UserAnswers | null;
  portfolioData: PortfolioData | null;
  walletData: WalletData | null;
  currentAppState: 'landing' | 'kyc_verification' | 'questionnaire' | 'processing' | 'portfolio' | 'tokenization' | 'token_creation' | 'marketplace' | 'dashboard';
  tokenDrafts: TokenDraft[];
  completedQuestionnaireStep: number;
  lastActivity: number;
  version: string; // for data migration
  legacyBrowserAiKey?: string; // Deprecated: browser AI keys are no longer used
  kycVerified: boolean; // KYC verification status
  kycResult: any | null; // KYC verification result
  hasReachedDashboard?: boolean; // Whether user has reached dashboard at least once
}

// Storage keys
const STORAGE_KEYS = {
  SESSION_DATA: 'timeTokenizer_session',
  USER_PREFERENCES: 'timeTokenizer_preferences',
  CHAIN_PREFERENCE: 'timeTokenizer_chainId',
  BOOKING_DATA: 'timeTokenizer_bookings',
} as const;

// Session timeout (24 hours)
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
const CURRENT_VERSION = '1.0.0';

// Utility functions
const isLocalStorageAvailable = (): boolean => {
  if (
    typeof window === 'undefined' ||
    typeof window.localStorage === 'undefined' ||
    typeof window.localStorage.getItem !== 'function' ||
    typeof window.localStorage.setItem !== 'function'
  ) {
    return false;
  }

  try {
    const test = '__localStorage_test__';
    window.localStorage.setItem(test, test);
    window.localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

const safeJsonParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    console.warn('Failed to parse localStorage value:', value);
    return fallback;
  }
};

const safeJsonStringify = (value: any): string => {
  try {
    return JSON.stringify(value);
  } catch {
    console.error('Failed to stringify value for localStorage');
    return '{}';
  }
};

// Session Data Management
export const saveSessionData = (sessionData: Partial<SessionData>): boolean => {
  if (!isLocalStorageAvailable()) return false;

  try {
    const existingData = getSessionData();
    const updatedData: SessionData = {
      ...existingData,
      ...sessionData,
      lastActivity: Date.now(),
      version: CURRENT_VERSION,
    };

    localStorage.setItem(STORAGE_KEYS.SESSION_DATA, safeJsonStringify(updatedData));
    console.log('✅ Session data saved successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to save session data:', error);
    return false;
  }
};

export const getSessionData = (): SessionData => {
  if (!isLocalStorageAvailable()) {
    return getDefaultSessionData();
  }

  const storedData = localStorage.getItem(STORAGE_KEYS.SESSION_DATA);
  const defaultData = getDefaultSessionData();

  if (!storedData) return defaultData;

  const parsedData = safeJsonParse(storedData, defaultData);

  // Check session timeout
  if (parsedData.lastActivity && Date.now() - parsedData.lastActivity > SESSION_TIMEOUT) {
    console.log('🕒 Session expired, clearing data');
    clearSessionData();
    return defaultData;
  }

  // Handle version migration if needed
  if (parsedData.version !== CURRENT_VERSION) {
    console.log('🔄 Migrating session data to new version');
    // Add migration logic here if needed in future versions
    parsedData.version = CURRENT_VERSION;
    saveSessionData(parsedData);
  }

  return parsedData;
};

const getDefaultSessionData = (): SessionData => ({
  userAnswers: null,
  portfolioData: null,
  walletData: null,
  currentAppState: 'landing',
  tokenDrafts: [],
  completedQuestionnaireStep: 0,
  lastActivity: Date.now(),
  version: CURRENT_VERSION,
  kycVerified: false,
  kycResult: null,
  hasReachedDashboard: false,
});

export const clearSessionData = (): void => {
  if (!isLocalStorageAvailable()) return;

  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION_DATA);
    console.log('🗑️ Session data cleared');
  } catch (error) {
    console.error('❌ Failed to clear session data:', error);
  }
};

// User Answers Management
export const saveUserAnswers = (answers: UserAnswers): boolean => {
  return saveSessionData({ userAnswers: answers });
};

export const getUserAnswers = (): UserAnswers | null => {
  return getSessionData().userAnswers;
};

// Portfolio Data Management
export const savePortfolioData = (portfolioData: PortfolioData): boolean => {
  return saveSessionData({ portfolioData });
};

export const getPortfolioData = (): PortfolioData | null => {
  return getSessionData().portfolioData;
};

// Wallet Data Management
export const saveWalletData = (walletData: WalletData): boolean => {
  return saveSessionData({ walletData });
};

export const getWalletData = (): WalletData | null => {
  return getSessionData().walletData;
};

// App State Management
export const saveAppState = (appState: SessionData['currentAppState']): boolean => {
  return saveSessionData({ currentAppState: appState });
};

export const getAppState = (): SessionData['currentAppState'] => {
  return getSessionData().currentAppState;
};

// Questionnaire Progress Management
export const saveQuestionnaireProgress = (step: number): boolean => {
  return saveSessionData({ completedQuestionnaireStep: step });
};

export const getQuestionnaireProgress = (): number => {
  return getSessionData().completedQuestionnaireStep;
};

// Token Drafts Management
export const saveTokenDraft = (tokenDraft: TokenDraft): boolean => {
  const sessionData = getSessionData();
  const existingDrafts = sessionData.tokenDrafts || [];

  // Update existing or add new draft
  const updatedDrafts = existingDrafts.filter(draft => draft.id !== tokenDraft.id);
  updatedDrafts.push(tokenDraft);

  return saveSessionData({ tokenDrafts: updatedDrafts });
};

export const getTokenDrafts = (): TokenDraft[] => {
  return getSessionData().tokenDrafts || [];
};

export const removeTokenDraft = (draftId: string): boolean => {
  const sessionData = getSessionData();
  const updatedDrafts = sessionData.tokenDrafts.filter(draft => draft.id !== draftId);
  return saveSessionData({ tokenDrafts: updatedDrafts });
};

export const updateTokenDraftStatus = (draftId: string, status: TokenDraft['status']): boolean => {
  const sessionData = getSessionData();
  const updatedDrafts = sessionData.tokenDrafts.map(draft =>
    draft.id === draftId ? { ...draft, status } : draft
  );
  return saveSessionData({ tokenDrafts: updatedDrafts });
};

// Chain Preference Management
export const saveChainPreference = (chainId: number): boolean => {
  if (!isLocalStorageAvailable()) return false;

  try {
    localStorage.setItem(STORAGE_KEYS.CHAIN_PREFERENCE, chainId.toString());
    return true;
  } catch (error) {
    console.error('❌ Failed to save chain preference:', error);
    return false;
  }
};

export const getChainPreference = (): number | null => {
  if (!isLocalStorageAvailable()) return null;

  const chainId = localStorage.getItem(STORAGE_KEYS.CHAIN_PREFERENCE);
  return chainId ? parseInt(chainId, 10) : null;
};

// User Preferences Management
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  autoSave: boolean;
  defaultTokenDuration: number; // days
  defaultValidityPeriod: number; // days
}

export const saveUserPreferences = (preferences: Partial<UserPreferences>): boolean => {
  if (!isLocalStorageAvailable()) return false;

  try {
    const existingPrefs = getUserPreferences();
    const updatedPrefs = { ...existingPrefs, ...preferences };

    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, safeJsonStringify(updatedPrefs));
    return true;
  } catch (error) {
    console.error('❌ Failed to save user preferences:', error);
    return false;
  }
};

export const getUserPreferences = (): UserPreferences => {
  if (!isLocalStorageAvailable()) {
    return getDefaultUserPreferences();
  }

  const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
  return safeJsonParse(stored, getDefaultUserPreferences());
};

const getDefaultUserPreferences = (): UserPreferences => ({
  theme: 'system',
  notifications: true,
  autoSave: true,
  defaultTokenDuration: 30, // 30 days
  defaultValidityPeriod: 90, // 90 days
});

// Auto-save functionality
let autoSaveTimer: NodeJS.Timeout | null = null;

export const enableAutoSave = (interval: number = 30000): void => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
  }

  autoSaveTimer = setInterval(() => {
    const preferences = getUserPreferences();
    if (preferences.autoSave) {
      // Update last activity timestamp
      saveSessionData({ lastActivity: Date.now() });
    }
  }, interval);

  console.log('💾 Auto-save enabled with', interval / 1000, 'second interval');
};

export const disableAutoSave = (): void => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
    console.log('⏹️ Auto-save disabled');
  }
};

// Storage utilities
export const getStorageStats = () => {
  if (!isLocalStorageAvailable()) {
    return { available: false, used: 0, remaining: 0 };
  }

  try {
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage.getItem(key)?.length || 0;
      }
    }

    // Rough estimate of localStorage limit (5MB = 5,242,880 chars)
    const limit = 5242880;

    return {
      available: true,
      used,
      remaining: limit - used,
      usedMB: (used / 1024 / 1024).toFixed(2),
      remainingMB: ((limit - used) / 1024 / 1024).toFixed(2),
    };
  } catch (error) {
    console.error('Failed to calculate storage stats:', error);
    return { available: false, used: 0, remaining: 0 };
  }
};

// KYC Status Management
export const saveKYCStatus = (kycVerified: boolean, kycResult: any = null): boolean => {
  return saveSessionData({ kycVerified, kycResult });
};

export const getKYCStatus = (): { kycVerified: boolean; kycResult: any | null } => {
  const sessionData = getSessionData();
  return {
    kycVerified: sessionData.kycVerified || false,
    kycResult: sessionData.kycResult || null
  };
};

export const clearKYCStatus = (): boolean => {
  return saveSessionData({ kycVerified: false, kycResult: null });
};

// Dashboard Progress Management
export const markDashboardReached = (): boolean => {
  return saveSessionData({ hasReachedDashboard: true });
};

export const hasUserReachedDashboard = (): boolean => {
  const sessionData = getSessionData();
  return sessionData.hasReachedDashboard || false;
};

// Export all for easy access
export const localStorage_utils = {
  saveSessionData,
  getSessionData,
  clearSessionData,
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
  saveKYCStatus,
  getKYCStatus,
  clearKYCStatus,
  markDashboardReached,
  hasUserReachedDashboard,
  enableAutoSave,
  disableAutoSave,
  getStorageStats,
};
