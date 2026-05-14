'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import ImprovedQuestionnaire from './components/ImprovedQuestionnaire';
import ProcessingState from './components/ProcessingState';
import Portfolio from './components/Portfolio';
import ChainSwitcher from './components/ChainSwitcher';
import ScrollableLanding from './components/ScrollableLanding';
import AutoKYC from './components/AutoKYC';
import type { PortfolioData } from './types/portfolio';
import TokenizationModeSelector from './components/TokenizationModeSelector';
import TokenCreation from './components/TokenCreation';
import Marketplace from './components/Marketplace';
import Dashboard from './components/Dashboard';
import ClientOnly from './components/ClientOnly';
import NavigationHeader from './components/NavigationHeader';
import AIChatAssistant from './components/AIChatAssistant';
import HowToUseGuide from './components/HowToUseGuide';
import { TokenSuggestion } from './services/tokenizeAgent';
import { useTimeTokenizerStorage } from './hooks/useLocalStorage';
import { UserAnswers, getKYCStatus, saveKYCStatus, clearKYCStatus, localStorage_utils } from './utils/localStorage';
import { isSupportedChain, getChainDisplayName } from './lib/wagmi';
import { KYCResult } from './services/unifiedKycAgent';

type AppState = 'landing' | 'kyc_verification' | 'questionnaire' | 'processing' | 'portfolio' | 'tokenization' | 'token_creation' | 'marketplace' | 'dashboard';

export default function Home() {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const storage = useTimeTokenizerStorage();

  // Local state for immediate UI updates
  const [isInitialized, setIsInitialized] = useState(false);
  const [showChainWarning, setShowChainWarning] = useState(false);
  const [selectedTokenSuggestion, setSelectedTokenSuggestion] = useState<TokenSuggestion | null>(null);
  const [isProcessingTransaction, setIsProcessingTransaction] = useState(false);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycResult, setKycResult] = useState<KYCResult | null>(null);

  // Initialize app state from localStorage on mount
  useEffect(() => {
    if (storage.isFullyLoaded) {
      console.log('📱 Initializing app from localStorage...');

      // Restore KYC status from localStorage
      const { kycVerified: storedKycVerified, kycResult: storedKycResult } = getKYCStatus();
      if (storedKycVerified) {
        console.log('🔐 Restoring KYC status from localStorage:', storedKycVerified);
        setKycVerified(storedKycVerified);
        setKycResult(storedKycResult);
      }

      // Restore wallet data if connected
      if (isConnected && address) {
        storage.wallet.saveWallet({
          address,
          chainId: chainId || 43113, // Default to Avalanche Fuji if no chainId
          isConnected: true,
          lastConnected: Date.now(),
        });

        // Update chain preference
        if (chainId) {
          storage.chainPreference.updateChainPreference(chainId);
        }
      }

      // Log restored session data
      const sessionData = storage.session.sessionData;
      if (sessionData.userAnswers) {
        console.log('✅ Restored user answers for:', sessionData.userAnswers.name);
      }
      if (sessionData.portfolioData) {
        console.log('✅ Restored portfolio data');
      }
      if (sessionData.tokenDrafts.length > 0) {
        console.log('✅ Restored', sessionData.tokenDrafts.length, 'token drafts');
      }

      setIsInitialized(true);
    }
  }, [storage.isFullyLoaded, isConnected, address]);

  // Handle app state transitions based on wallet connection and stored data
  useEffect(() => {
    if (!isInitialized) return;

    const currentAppState = storage.appState.appState;
    const hasUserAnswers = !!storage.userAnswers.userAnswers;
    const hasPortfolioData = !!storage.portfolio.portfolioData;

    console.log('🔄 App state transition check:', {
      currentAppState,
      isConnected,
      hasUserAnswers,
      hasPortfolioData,
    });

    // Mark dashboard as reached if user is already on dashboard
    if (currentAppState === 'dashboard') {
      localStorage_utils.markDashboardReached();
    }

    // Landing page logic
    if (!isConnected) {
      if (currentAppState !== 'landing') {
        console.log('🏠 Redirecting to landing - wallet disconnected');
        storage.appState.updateAppState('landing');
      }

      // Reset KYC status when wallet disconnects
      if (kycVerified) {
        console.log('🔐 Resetting KYC status - wallet disconnected');
        setKycVerified(false);
        setKycResult(null);
        clearKYCStatus(); // Clear from localStorage too
      }

      return;
    }

    // Wallet connected - determine next state (KYC flow)
    if (isConnected) {
      if (currentAppState === 'landing') {
        if (hasPortfolioData && kycVerified) {
          console.log('📊 Redirecting to portfolio - data found and KYC verified');
          storage.appState.updateAppState('portfolio');
        } else if (hasUserAnswers && kycVerified) {
          console.log('⏳ Redirecting to processing - answers found and KYC verified');
          storage.appState.updateAppState('processing');
        } else if (kycVerified) {
          console.log('📝 Redirecting to questionnaire - KYC verified, ready for questions');
          storage.appState.updateAppState('questionnaire');
        } else {
          console.log('🔐 Redirecting to KYC verification - wallet connected but not verified');
          storage.appState.updateAppState('kyc_verification');
        }
      }
    }
  }, [isInitialized, isConnected, storage]);

  // Handle chain validation
  useEffect(() => {
    if (isConnected && chainId) {
      const isSupported = isSupportedChain(chainId);
      setShowChainWarning(!isSupported);

      if (!isSupported) {
        console.warn(`⚠️ Unsupported chain: ${getChainDisplayName(chainId)} (${chainId})`);
      } else {
        console.log(`✅ Connected to supported chain: ${getChainDisplayName(chainId)}`);
      }
    } else {
      setShowChainWarning(false);
    }
  }, [isConnected, chainId]);

  // KYC Event Handlers
  const handleKYCAccessGranted = () => {
    console.log('🎉 KYC Access Granted - User can proceed to questionnaire');
    setKycVerified(true);
    saveKYCStatus(true); // Save to localStorage
    storage.appState.updateAppState('questionnaire');
  };

  const handleKYCComplete = (result: KYCResult) => {
    console.log('🔐 KYC Verification Complete:', result);
    setKycResult(result);
    if (result.success) {
      setKycVerified(true);
      saveKYCStatus(true, result); // Save to localStorage
    } else {
      setKycVerified(false);
      saveKYCStatus(false, result); // Save failure to localStorage
    }
  };

  const handleQuestionnaireComplete = (answers: UserAnswers) => {
    console.log('📝 Questionnaire completed for:', answers.name);
    storage.userAnswers.saveAnswers(answers);
    storage.appState.updateAppState('processing');
  };

  const handleProcessingComplete = (generatedPortfolio: PortfolioData) => {
    console.log('🤖 Portfolio generation completed');
    storage.portfolio.savePortfolio(generatedPortfolio);
    storage.appState.updateAppState('portfolio');
  };

  const handleProceedToTokenization = () => {
    console.log('🚀 Proceeding to tokenization phase');
    storage.appState.updateAppState('tokenization');
  };

  const handleBackToPortfolio = () => {
    console.log('⬅️ Going back to portfolio');
    storage.appState.updateAppState('portfolio');
  };

  const handleAgenticModeComplete = () => {
    console.log('✅ Agentic mode completed, going to marketplace');
    storage.appState.updateAppState('marketplace');
  };

  const handleTokenizeSelected = (suggestion: TokenSuggestion) => {
    console.log('🎯 Token selected for creation:', suggestion);
    setSelectedTokenSuggestion(suggestion);
    storage.appState.updateAppState('token_creation');
  };

  const handleTokenCreationSuccess = (tokenId: string) => {
    console.log('✅ Token created successfully:', tokenId);
    setSelectedTokenSuggestion(null);
    storage.appState.updateAppState('marketplace');
  };

  const handleTokenCreationCancel = () => {
    console.log('❌ Token creation cancelled');
    setSelectedTokenSuggestion(null);
    storage.appState.updateAppState('tokenization');
  };

  const handleViewMarketplace = () => {
    console.log('📊 Navigating to marketplace');
    storage.appState.updateAppState('marketplace');
  };

  const handleCreateTokenFromMarketplace = () => {
    console.log('🚀 Creating token from marketplace');
    storage.appState.updateAppState('tokenization');
  };

  const handleViewDashboard = () => {
    console.log('📊 Navigating to dashboard');
    localStorage_utils.markDashboardReached(); // Mark that user has reached dashboard for full navigation
    storage.appState.updateAppState('dashboard');
  };

  const handleHeaderNavigation = (state: string) => {
    console.log('🧭 Header navigation to:', state);

    // Mark dashboard reached if navigating to dashboard
    if (state === 'dashboard') {
      localStorage_utils.markDashboardReached();
    }

    storage.appState.updateAppState(state as AppState);
  };

  // Show loading until localStorage is hydrated
  if (!storage.isFullyLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl">Loading Time Tokenizer...</p>
          <p className="text-white/60 text-sm mt-2">Restoring your session...</p>
        </div>
      </div>
    );
  }

  const currentAppState = storage.appState.appState;
  const userAnswers = storage.userAnswers.userAnswers;
  const portfolioData = storage.portfolio.portfolioData;
  const guideAvailableStates = Array.from(new Set([
    currentAppState,
    'landing',
    ...(isConnected ? ['kyc_verification'] : []),
    ...(kycVerified ? ['questionnaire', 'marketplace', 'dashboard'] : []),
    ...(userAnswers ? ['processing'] : []),
    ...(userAnswers && portfolioData ? ['portfolio', 'tokenization'] : []),
    ...(selectedTokenSuggestion ? ['token_creation'] : []),
  ]));

  return (
    <ClientOnly fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mb-4"></div>
          <p className="text-white text-xl">Loading Time Tokenizer...</p>
        </div>
      </div>
    }>
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        {/* Navigation Header */}
        {currentAppState !== 'landing' && (
          <NavigationHeader
            currentState={currentAppState}
            onNavigate={handleHeaderNavigation}
            showNavigation={currentAppState !== 'processing'}
          />
        )}


        {/* Chain Warning */}
        {showChainWarning && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-500/20 backdrop-blur-lg border border-red-400 text-red-200 px-6 py-3 rounded-lg z-40 max-w-md text-center">
            <p className="font-semibold mb-1">⚠️ Unsupported Network</p>
            <p className="text-sm">Please switch to Avalanche Fuji to use Time Tokenizer</p>
          </div>
        )}

        {currentAppState === 'landing' && (
          <div data-guide-id="start">
            <ScrollableLanding
              onGetStarted={() => {
                // Trigger state transition based on stored data
                if (portfolioData) {
                  storage.appState.updateAppState('portfolio');
                } else if (userAnswers) {
                  storage.appState.updateAppState('processing');
                } else {
                  storage.appState.updateAppState('questionnaire');
                }
              }}
            />
          </div>
        )}

        {currentAppState === 'kyc_verification' && (
          <div className="pt-20" data-guide-id="kyc">
            <AutoKYC
              onAccessGranted={handleKYCAccessGranted}
              onKYCComplete={handleKYCComplete}
              enableAutoTrigger={true}
            />
          </div>
        )}

        {currentAppState === 'questionnaire' && (
          <div className="pt-20" data-guide-id="questionnaire">
            <ImprovedQuestionnaire onComplete={handleQuestionnaireComplete} />
          </div>
        )}

        {currentAppState === 'processing' && userAnswers && (
          <div className="pt-20" data-guide-id="profile">
            <ProcessingState
              userAnswers={userAnswers}
              onComplete={handleProcessingComplete}
            />
          </div>
        )}

        {currentAppState === 'portfolio' && userAnswers && portfolioData && (
          <div className="pt-20" data-guide-id="profile">
            <Portfolio
              userAnswers={userAnswers}
              portfolioData={portfolioData}
              onProceedToTokenization={handleProceedToTokenization}
            />
          </div>
        )}

        {currentAppState === 'tokenization' && userAnswers && portfolioData && (
          <div className="pt-20" data-guide-id="strategy">
            <TokenizationModeSelector
              userAnswers={userAnswers}
              portfolioData={portfolioData}
              onTokenizeSelected={handleTokenizeSelected}
              onViewMarketplace={handleViewMarketplace}
              onComplete={handleAgenticModeComplete}
              onBack={handleBackToPortfolio}
            />
          </div>
        )}

        {currentAppState === 'token_creation' && selectedTokenSuggestion && (
          <div className="pt-20" data-guide-id="publish">
            <TokenCreation
              suggestion={selectedTokenSuggestion}
              onSuccess={handleTokenCreationSuccess}
              onCancel={handleTokenCreationCancel}
            />
          </div>
        )}

        {currentAppState === 'marketplace' && (
          <div className="pt-20" data-guide-id="marketplace">
            <Marketplace
              onCreateToken={handleCreateTokenFromMarketplace}
              onViewDashboard={handleViewDashboard}
            />
          </div>
        )}

        {currentAppState === 'dashboard' && (
          <div className="pt-20" data-guide-id="dashboard">
            <Dashboard
              onCreateToken={handleCreateTokenFromMarketplace}
              onViewMarketplace={handleViewMarketplace}
            />
          </div>
        )}

        {/* Debug Panel - Development Only */}


        {/* AI Chat Assistant - Available on all states except landing */}
        {currentAppState !== 'landing' && (
          <AIChatAssistant
            currentAppState={currentAppState}
            onStateChange={handleHeaderNavigation}
          />
        )}

        <HowToUseGuide
          currentState={currentAppState}
          availableStates={guideAvailableStates}
          isWalletConnected={isConnected}
          onNavigate={handleHeaderNavigation}
        />
      </div>
    </ClientOnly>
  );
}
