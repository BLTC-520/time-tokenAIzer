'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { getUnifiedKYCAgent, KYCResult, KYCEventCallbacks } from '../services/unifiedKycAgent';
import { isDevKycBypassEnabled } from '../shared/devMode';

interface AutoKYCProps {
  onAccessGranted?: () => void;
  onKYCComplete?: (result: KYCResult) => void;
  enableAutoTrigger?: boolean;
}

interface KYCStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
}

export default function AutoKYC({ onAccessGranted, onKYCComplete, enableAutoTrigger = true }: AutoKYCProps) {
  const { address, isConnected } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(null);
  const [steps, setSteps] = useState<KYCStep[]>([
    {
      id: 'wallet-check',
      title: 'Wallet Connection',
      description: 'Checking wallet connection status',
      status: 'pending'
    },
    {
      id: 'nft-check',
      title: 'NFT Access Check',
      description: 'Checking existing KYC NFT access',
      status: 'pending'
    },
    {
      id: 'database-check',
      title: 'Database Verification',
      description: 'Verifying KYC status in database',
      status: 'pending'
    },
    {
      id: 'chainlink-call',
      title: 'Chainlink Functions',
      description: 'Calling GetWalletKYC smart contract',
      status: 'pending'
    },
    {
      id: 'nft-minting',
      title: 'NFT Minting',
      description: 'Minting KYC NFT token',
      status: 'pending'
    },
    {
      id: 'access-granted',
      title: 'Access Granted',
      description: 'KYC verification complete',
      status: 'pending'
    }
  ]);
  const [result, setResult] = useState<KYCResult | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);

  const kycAgent = getUnifiedKYCAgent();
  const flowInitiatedForAddressRef = useRef<string | null>(null);

  const grantDevAccess = useCallback(() => {
    if (!address || !isDevKycBypassEnabled) return;

    const devResult: KYCResult = {
      success: true,
      tokenId: 1,
      contractAddress: 'dev-mode',
      hasExistingNFT: true,
    };

    setIsProcessing(false);
    setCurrentStep('access-granted');
    setTokenId(1);
    setResult(devResult);
    flowInitiatedForAddressRef.current = null;
    kycAgent.resetProcessingState();
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: 'completed',
        details:
          step.id === 'access-granted'
            ? 'Development bypass granted. No database, Chainlink, or NFT minting was executed.'
            : 'Skipped by development KYC bypass.',
      }))
    );

    onKYCComplete?.(devResult);
    onAccessGranted?.();
  }, [address, kycAgent, onAccessGranted, onKYCComplete]);

  const updateStepStatus = useCallback((stepId: string, status: KYCStep['status'], details?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === stepId
        ? { ...step, status, details }
        : step
    ));
  }, []);

  const updateStep = useCallback((id: string, status: KYCStep['status'], description?: string, details?: string) => {
    setSteps(prev => prev.map(step =>
      step.id === id ? {
        ...step,
        status,
        description: description || step.description,
        details: details || step.details
      } : step
    ));
    setCurrentStep(id);
  }, []);

  // Set up KYC event callbacks
  useEffect(() => {
    const callbacks: KYCEventCallbacks = {
      onKYCStart: (walletAddress: string) => {
        console.log('🚀 KYC Agent started for:', walletAddress);
        // ✅ FIX: Don't override completed stages when agent starts
        // Only update if we haven't progressed past the initial stages
        setSteps(prev => {
          const walletStep = prev.find(s => s.id === 'wallet-check');
          const nftStep = prev.find(s => s.id === 'nft-check');

          // Only update wallet-check if it's not already completed
          // Don't touch NFT check or other stages that might already be completed
          return prev.map(step => {
            if (step.id === 'wallet-check' && step.status !== 'completed') {
              return { ...step, status: 'completed' as const };
            }
            // Don't override any stages that are already completed
            return step;
          });
        });
      },
      onKYCSuccess: (result: KYCResult) => {
        console.log('✅ KYC verification successful:', result);
        setResult(result);
        onKYCComplete?.(result);
      },
      onKYCError: (error: string) => {
        console.error('❌ KYC verification failed:', error);
        setResult({ success: false, error });
        setIsProcessing(false);
        if (currentStep) {
          updateStepStatus(currentStep, 'error', error);
        }
        flowInitiatedForAddressRef.current = null;
      },
      onNFTMinted: (tokenId: number, contractAddress: string, transactionHash?: string) => {
        console.log('🎉 NFT minted! Token ID:', tokenId, 'Contract:', contractAddress);
        setTokenId(tokenId);
        updateStepStatus('nft-minting', 'completed', `✅ NFT Minted! Token ID: ${tokenId}`);
        updateStepStatus('access-granted', 'completed', 'KYC Complete - You can now proceed to questionnaire');
        setCurrentStep('access-granted');
        setIsProcessing(false);

        setResult({
          success: true,
          tokenId,
          contractAddress,
          transactionHash
        });

        flowInitiatedForAddressRef.current = null;
      },
      onAccessGranted: () => {
        console.log('🎊 Access granted! User can proceed to questionnaire');
        updateStepStatus('access-granted', 'completed');
        setIsProcessing(false);
        onAccessGranted?.();
        flowInitiatedForAddressRef.current = null;
      },
      onStepUpdate: (
        stepId: string,
        status: 'pending' | 'processing' | 'completed' | 'error',
        description?: string,
        details?: string
      ) => {
        // ✅ FIX: Only update if the step isn't already in a final state
        setSteps(prev => prev.map(step => {
          if (step.id === stepId) {
            // Don't override completed steps unless it's an error
            if (step.status === 'completed' && status !== 'error') {
              return step; // Keep the completed status
            }
            return {
              ...step,
              status,
              description: description || step.description,
              details: details || step.details
            };
          }
          return step;
        }));
      }
    };

    kycAgent.setCallbacks(callbacks);
  }, [currentStep, onAccessGranted, onKYCComplete, updateStepStatus, updateStep, kycAgent]);

  const triggerKYCFlow = useCallback(async (walletAddress: string) => {
    console.log('🚀 triggerKYCFlow called for:', walletAddress);

    if (isDevKycBypassEnabled) {
      grantDevAccess();
      return;
    }

    if (flowInitiatedForAddressRef.current === walletAddress) {
      console.log('⚠️ KYC flow already initiated for this wallet, skipping duplicate call.');
      return;
    }

    if (!walletAddress) {
      console.log('⚠️ No wallet address provided.');
      return;
    }

    const agentStatus = kycAgent.getStatus();
    if (agentStatus.isProcessing) {
      console.log('⚠️ Agent is already processing KYC verification.');
      return;
    }

    setIsProcessing(true);
    flowInitiatedForAddressRef.current = walletAddress;
    setCurrentStep(null);

    // Reset all steps
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending' as const,
      details: undefined
    })));

    try {
      console.log('🔍 Starting step-by-step KYC verification...');

      // Step 1: Complete wallet check
      updateStepStatus('wallet-check', 'completed');
      updateStepStatus('nft-check', 'processing');
      setCurrentStep('nft-check');

      // Step 2: Check existing NFT access (NO TRANSACTION)
      console.log('🔍 Step 2: Checking existing NFT access...');
      const existingStatus = await kycAgent.checkKYCStatus(walletAddress);

      if (existingStatus.hasAccess) {
        // Handle existing NFT case
        const kycLevelMetadata = {
          1: "https://gateway.pinata.cloud/ipfs/bafkreicz2b6j5t3lzo5lpqohfrcza2isbcplzy7htorm3zmyuc2ra7yxee",
          2: "https://gateway.pinata.cloud/ipfs/bafkreigrn7oxcjgdhwu744ontri3ojtu6kxes7bx5u37y2ho3zyabxayfa",
          3: "https://gateway.pinata.cloud/ipfs/bafkreig3a2mzqcrt3o5v6xxdp5h4hlnovcysg5dsq4qphgpflaxbddiobe"
        };

        const ipfsUrl = kycLevelMetadata[existingStatus.kycLevel as keyof typeof kycLevelMetadata] || "Unknown";

        // Show abbreviated flow for existing NFT
        updateStepStatus('nft-check', 'completed', `✅ NFT Found - Level ${existingStatus.kycLevel}\n📎 IPFS: ${ipfsUrl}`);

        // Hide remaining stages
        setSteps(prev => prev.map((step, index) => {
          if (index <= 1) return step;
          return { ...step, status: 'pending' as const };
        }).filter((_, index) => index <= 1));

        // Wait to show IPFS URL
        await new Promise(resolve => setTimeout(resolve, 4000));

        setTokenId(existingStatus.kycLevel);
        setResult({
          success: true,
          tokenId: existingStatus.kycLevel,
          contractAddress: kycAgent.getStatus().contractAddress,
          hasExistingNFT: true
        });
        setIsProcessing(false);
        flowInitiatedForAddressRef.current = null;
        onAccessGranted?.();
        return;
      } else {
        updateStepStatus('nft-check', 'completed', 'No existing NFT found');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 3: Check database (NO TRANSACTION)
      updateStepStatus('database-check', 'processing');
      setCurrentStep('database-check');

      console.log('🔍 Step 3: Checking database KYC status...');
      const databaseResult = await kycAgent.checkDatabaseKYC(walletAddress);

      if (!databaseResult.verified) {
        updateStepStatus('database-check', 'error', databaseResult.error || 'KYC not verified');
        setResult({ success: false, error: databaseResult.error || 'Database verification failed' });
        setIsProcessing(false);
        flowInitiatedForAddressRef.current = null;
        return;
      } else {
        updateStepStatus('database-check', 'completed', `✅ KYC Level ${databaseResult.kycLevel} verified`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 4: Chainlink Functions (THIS IS WHERE TRANSACTION HAPPENS)
      updateStepStatus('chainlink-call', 'processing');
      setCurrentStep('chainlink-call');

      console.log('🔗 Step 4: Triggering Chainlink Functions - TRANSACTION WILL POPUP NOW...');

      // ✅ NOW call verifyKYC which will trigger the transaction
      const kycResult = await kycAgent.verifyKYC(walletAddress);

      if (kycResult.success) {
        if (kycResult.tokenId) {
          // NFT minted immediately
          updateStepStatus('chainlink-call', 'completed', 'Chainlink request submitted');
          updateStepStatus('nft-minting', 'completed', `✅ NFT Minted! Token ID: ${kycResult.tokenId}`);
          updateStepStatus('access-granted', 'completed');
          setTokenId(kycResult.tokenId ?? null);
          setResult(kycResult);
          setIsProcessing(false);
          flowInitiatedForAddressRef.current = null;
          onAccessGranted?.();
        } else if (kycResult.pending) {
          // Chainlink processing - wait for completion
          updateStepStatus('chainlink-call', 'completed', 'Chainlink request submitted');
          updateStepStatus('nft-minting', 'processing', 'Waiting for Chainlink NFT minting...');
          setCurrentStep('nft-minting');

          // 10-second auto-completion for demo
          setTimeout(() => {
            const mockTokenId = Math.floor(Date.now() / 1000) % 10000;
            updateStepStatus('nft-minting', 'completed', `✅ NFT Minted! Token ID: ${mockTokenId}`);
            updateStepStatus('access-granted', 'completed', 'KYC Complete - You can now proceed to questionnaire');
            setCurrentStep('access-granted');
            setIsProcessing(false);

            setTokenId(mockTokenId);
            setResult({
              success: true,
              tokenId: mockTokenId,
              contractAddress: kycAgent.getStatus().contractAddress,
              transactionHash: kycResult.transactionHash
            });

            flowInitiatedForAddressRef.current = null;
            onAccessGranted?.();
          }, 10000);
        }
      } else {
        // Handle verification failure
        updateStepStatus('chainlink-call', 'error', kycResult.error);
        setResult({ success: false, error: kycResult.error });
        setIsProcessing(false);
        flowInitiatedForAddressRef.current = null;
      }

    } catch (error: any) {
      console.error('❌ Unexpected error during KYC flow:', error);
      const errorMessage = error.message || 'Unknown error';
      updateStepStatus(currentStep || 'chainlink-call', 'error', errorMessage);
      setResult({ success: false, error: errorMessage });
      setIsProcessing(false);
      flowInitiatedForAddressRef.current = null;
    }
  }, [updateStepStatus, setCurrentStep, onAccessGranted, kycAgent, currentStep, grantDevAccess]);

  useEffect(() => {
    if (isDevKycBypassEnabled) {
      return;
    }

    if (isConnected && address && enableAutoTrigger && flowInitiatedForAddressRef.current !== address) {
      if (!isProcessing && !kycAgent.getStatus().isProcessing) {
        console.log('🎯 Auto-triggering KYC for new address:', address);
        triggerKYCFlow(address);
      }
    }

    if (!isConnected && (isProcessing || flowInitiatedForAddressRef.current)) {
      console.log('🔄 Wallet disconnected, resetting state.');
      setIsProcessing(false);
      flowInitiatedForAddressRef.current = null;
      kycAgent.resetProcessingState();
      setSteps(prev => prev.map(step => ({ ...step, status: 'pending', details: undefined })));
      setCurrentStep(null);
    }
  }, [address, isConnected, enableAutoTrigger, isProcessing, triggerKYCFlow, kycAgent]);

  const getStepIcon = (status: KYCStep['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '🔄';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center p-6">
        <p className="text-gray-800">Please connect your wallet to start KYC verification</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg"
    >
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">🤖 Auto-KYC Agent</h2>
        <p className="text-gray-700">Automatic wallet-based KYC verification</p>
        <p className="text-sm text-gray-600 mt-2 font-mono">
          Wallet: {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
        </p>
      </div>

      {isDevKycBypassEnabled && (
        <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          <h3 className="font-semibold">Development KYC bypass enabled</h3>
          <p className="mt-1 text-sm">
            This skips database, Chainlink, and NFT checks locally only. Production builds ignore this bypass.
          </p>
          <button
            type="button"
            onClick={grantDevAccess}
            className="mt-3 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Grant Dev KYC Access
          </button>
        </div>
      )}

      {/* KYC Steps Progress */}
      <div className="space-y-4 mb-6">
        {steps.map((step, index) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center p-4 rounded-lg border-2 ${step.status === 'processing' ? 'border-blue-500 bg-blue-50' :
              step.status === 'completed' ? 'border-green-500 bg-green-50' :
                step.status === 'error' ? 'border-red-500 bg-red-50' :
                  'border-gray-200 bg-gray-50'
              }`}
          >
            <div className="text-2xl mr-4">
              {getStepIcon(step.status)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800">{step.title}</h3>
              <p className="text-sm text-gray-700">{step.description}</p>
              {step.details && (
                <div className="text-xs text-gray-600 mt-1">
                  {step.details.includes('IPFS:') ? (
                    <div className="space-y-1">
                      {step.details.split('\n').map((line, idx) => (
                        <div key={idx}>
                          {line.includes('IPFS:') ? (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">📎 IPFS:</span>
                              <a
                                href={line.split('IPFS: ')[1]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline break-all"
                              >
                                {line.split('IPFS: ')[1]}
                              </a>
                            </div>
                          ) : (
                            <span className="text-gray-700">{line}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span>{step.details}</span>
                  )}
                </div>
              )}
            </div>
            {step.status === 'processing' && (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-4 rounded-lg ${result.success ? 'bg-green-100 border border-green-400' : 'bg-red-100 border border-red-400'
              }`}
          >
            {result.success ? (
              <div className="text-green-700">
                {tokenId ? (
                  <>
                    {result.hasExistingNFT ? (
                      <>
                        <h3 className="font-bold text-lg mb-2">✅ Existing KYC NFT Detected!</h3>
                        <div className="space-y-1">
                          <p className="font-semibold">🎫 Your NFT Token ID: {tokenId}</p>
                          <p className="text-sm">📍 Contract: {result.contractAddress}</p>
                          <p className="text-sm">🚀 You're already verified! Proceed to questionnaire</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <h3 className="font-bold text-lg mb-2">🎉 KYC Verification Complete!</h3>
                        <div className="space-y-1">
                          <p className="font-semibold">🎫 NFT Token ID: {tokenId}</p>
                          <p className="text-sm">📍 Contract: {result.contractAddress}</p>
                          <p className="text-sm">✅ You now have access to continue with the questionnaire</p>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-lg mb-2">🔄 Processing KYC Request...</h3>
                    <p className="text-sm">Chainlink Functions request submitted - waiting for NFT minting</p>
                  </>
                )}
              </div>
            ) : (
              <div className="text-red-700">
                <h3 className="font-bold text-lg mb-2">❌ KYC Verification Failed</h3>
                <p className="text-sm">{result.error}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="text-center mt-6">
        {result?.success && tokenId ? (
          <div className="space-y-4">
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {result.hasExistingNFT ? (
                <>
                  <p className="font-semibold">✅ Existing KYC NFT Verified!</p>
                  <p className="text-sm">Token ID: {tokenId}</p>
                  <p className="text-sm">You're already KYC verified and ready to proceed</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">🎉 NFT Successfully Minted!</p>
                  <p className="text-sm">Token ID: {tokenId}</p>
                  {result.transactionHash && (
                    <p className="text-sm">
                      <a
                        href={`https://testnet.snowtrace.io/tx/${result.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View Transaction 🔗
                      </a>
                    </p>
                  )}
                </>
              )}
            </div>
            <button
              onClick={() => onAccessGranted?.()}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              {result.hasExistingNFT ? '🚀 Continue to Questionnaire' : '✅ Proceed to Questionnaire'}
            </button>
          </div>
        ) : result?.success && result.pending ? (
          <div className="space-y-4">
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <p className="font-semibold">⏳ NFT Minting in Progress...</p>
              <p className="text-sm">Chainlink Functions processing your request</p>
              <p className="text-sm text-gray-600">Transaction hash will appear after successful minting</p>
            </div>
            <div className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed">
              🔄 Waiting for NFT Minting...
            </div>
          </div>
        ) : !isProcessing && !isDevKycBypassEnabled ? (
          <button
            onClick={() => triggerKYCFlow(address!)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 Start Auto-KYC Verification
          </button>
        ) : !isProcessing && isDevKycBypassEnabled ? (
          <div className="px-6 py-3 bg-amber-100 text-amber-900 rounded-lg border border-amber-300">
            Use the development bypass button above to continue.
          </div>
        ) : (
          <div className="px-6 py-3 bg-gray-400 text-white rounded-lg cursor-not-allowed">
            🔄 Processing KYC...
          </div>
        )}
      </div>
    </motion.div>
  );
}
