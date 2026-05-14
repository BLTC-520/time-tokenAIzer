'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount, useWriteContract, useChainId, useWaitForTransactionReceipt } from 'wagmi';
import { TokenBundle } from '../services/tokenizeAgent';
import { CreateTokenParams, ParameterValidationService } from '../services/parameterValidation';
import { TIME_TOKEN_CONTRACT_ADDRESSES } from '../shared/constants';
import { TIME_TOKEN_ABI } from '../abi/TimeToken.abi';
import { parseEther } from 'viem';

interface TransactionProgressProps {
  bundle: TokenBundle;
  onComplete: (tokenIds: string[]) => void;
  onError: () => void;
}

interface TokenCreationStep {
  id: string;
  serviceName: string;
  status: 'pending' | 'preparing' | 'signing' | 'confirming' | 'completed' | 'failed';
  txHash?: string;
  tokenId?: string;
  error?: string;
}

export default function TransactionProgress({ 
  bundle, 
  onComplete, 
  onError 
}: TransactionProgressProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<TokenCreationStep[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTokenIds, setCompletedTokenIds] = useState<string[]>([]);
  const [isCancelled, setIsCancelled] = useState(false);
  const [transactionTimeout, setTransactionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Contract write hook
  const { writeContract: createToken, data: txHash, isPending: isWriting } = useWriteContract();

  // Transaction wait hook
  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Initialize steps from bundle tokens
  useEffect(() => {
    console.log('🔍 TransactionProgress: Initializing steps from bundle tokens');
    console.log('Bundle:', bundle);
    console.log('Tokens in bundle:', bundle.tokens);
    
    const initialSteps: TokenCreationStep[] = bundle.tokens.map((token, index) => {
      console.log(`Token ${index}:`, token.serviceName);
      return {
        id: `step-${index}`,
        serviceName: token.serviceName,
        status: index === 0 ? 'pending' : 'pending'
      };
    });
    
    console.log('Generated steps:', initialSteps);
    setSteps(initialSteps);
  }, [bundle.tokens]);

  // Start processing when component mounts
  useEffect(() => {
    if (steps.length > 0 && !isProcessing && !isCancelled) {
      setIsProcessing(true);
      processNextToken();
    }
  }, [steps]);

  // Process next token when currentStepIndex changes
  useEffect(() => {
    if (currentStepIndex > 0 && currentStepIndex < bundle.tokens.length && !isCancelled) {
      console.log(`🔄 currentStepIndex changed to ${currentStepIndex}, processing next token...`);
      processNextToken();
    }
  }, [currentStepIndex]);

  // Handle transaction state changes
  useEffect(() => {
    if (txHash && currentStepIndex < steps.length) {
      updateStepStatus(currentStepIndex, 'confirming', { txHash: txHash });
      
      // Set a 2-minute timeout for the transaction
      const timeout = setTimeout(() => {
        if (!isSuccess && !isError && !isCancelled) {
          console.warn('⏰ Transaction timeout after 2 minutes');
          updateStepStatus(currentStepIndex, 'failed', { 
            error: 'Transaction timed out. The blockchain network may be congested.' 
          });
          setTimeout(() => {
            onError();
          }, 2000);
        }
      }, 120000); // 2 minutes
      
      setTransactionTimeout(timeout);
    }
  }, [txHash]);

  useEffect(() => {
    if (isSuccess && currentStepIndex < steps.length && !isCancelled) {
      console.log(`✅ Transaction ${currentStepIndex + 1} successful!`);
      console.log(`Current step: ${currentStepIndex + 1}/${bundle.tokens.length}`);
      
      // Clear the timeout since transaction succeeded
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
        setTransactionTimeout(null);
      }
      
      // Generate a mock token ID (in real implementation, this would come from contract events)
      const tokenId = `token-${Date.now()}-${currentStepIndex}`;
      updateStepStatus(currentStepIndex, 'completed', { tokenId });
      setCompletedTokenIds(prev => [...prev, tokenId]);
      
      // Move to next token or complete
      setTimeout(() => {
        if (!isCancelled && currentStepIndex + 1 < bundle.tokens.length) {
          const nextIndex = currentStepIndex + 1;
          console.log(`🔄 Moving to next token: ${currentStepIndex + 1} → ${nextIndex + 1}`);
          setCurrentStepIndex(nextIndex);
          // Don't call processNextToken() here - let the useEffect handle it
        } else if (!isCancelled) {
          console.log(`🎉 All ${bundle.tokens.length} tokens completed!`);
          // All tokens completed
          setTimeout(() => {
            if (!isCancelled) {
              onComplete([...completedTokenIds, tokenId]);
            }
          }, 1000);
        }
      }, 1000);
    }
  }, [isSuccess]);

  useEffect(() => {
    if (isError && currentStepIndex < steps.length) {
      // Clear the timeout since transaction failed
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
        setTransactionTimeout(null);
      }
      
      const errorMessage = txError ? txError.message : 'Transaction failed. Please try again.';
      console.error('❌ Transaction failed:', txError);
      updateStepStatus(currentStepIndex, 'failed', { 
        error: errorMessage
      });
      setTimeout(() => {
        onError();
      }, 2000);
    }
  }, [isError, txError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (transactionTimeout) {
        clearTimeout(transactionTimeout);
      }
    };
  }, [transactionTimeout]);

  const updateStepStatus = (
    stepIndex: number, 
    status: TokenCreationStep['status'], 
    updates: Partial<TokenCreationStep> = {}
  ) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, ...updates }
        : step
    ));
  };

  const handleCancel = () => {
    console.log('❌ Transaction process cancelled');
    setIsCancelled(true);
    setIsProcessing(false);
    
    // Update current step to cancelled if not completed
    if (currentStepIndex < steps.length && steps[currentStepIndex]?.status !== 'completed') {
      updateStepStatus(currentStepIndex, 'failed', { 
        error: 'Cancelled by user' 
      });
    }
    
    onError();
  };

  const processNextToken = async () => {
    if (currentStepIndex >= bundle.tokens.length || isCancelled) return;

    const token = bundle.tokens[currentStepIndex];
    console.log(`🚀 Processing token ${currentStepIndex}:`, token);
    console.log('Service Name:', token.serviceName);
    console.log('Full token object:', JSON.stringify(token, null, 2));
    
    updateStepStatus(currentStepIndex, 'preparing');

    try {
      // Convert token suggestion to contract parameters
      const params: CreateTokenParams = ParameterValidationService.tokenSuggestionToParams(token);
      console.log('Converted params:', params);
      
      // Validate parameters one more time
      const validation = ParameterValidationService.validateTokenCreation(params);
      if (!validation.isValid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
      }

      updateStepStatus(currentStepIndex, 'signing');

      console.log(`📤 Calling createToken for token ${currentStepIndex + 1}: "${params.serviceName}"`);
      // Call smart contract
      createToken({
        address: TIME_TOKEN_CONTRACT_ADDRESSES[chainId as keyof typeof TIME_TOKEN_CONTRACT_ADDRESSES] as `0x${string}`,
        abi: TIME_TOKEN_ABI,
        functionName: 'createTimeToken',
        args: [
          address!,
          params.serviceName,
          parseEther(params.pricePerHour.toString()),
          BigInt(Math.round(params.totalHours)),
          BigInt(Math.round(params.validityDays))
        ]
      });

    } catch (error) {
      console.error('Token creation failed:', error);
      updateStepStatus(currentStepIndex, 'failed', { 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      setTimeout(() => {
        onError();
      }, 2000);
    }
  };

  const getStepIcon = (status: TokenCreationStep['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'preparing': return '🔄';
      case 'signing': return '✍️';
      case 'confirming': return '⏰';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStepColor = (status: TokenCreationStep['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500 bg-gray-100';
      case 'preparing': return 'text-blue-600 bg-blue-100';
      case 'signing': return 'text-yellow-600 bg-yellow-100';
      case 'confirming': return 'text-orange-600 bg-orange-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStepMessage = (step: TokenCreationStep) => {
    switch (step.status) {
      case 'pending': return 'Waiting to start...';
      case 'preparing': return 'Preparing transaction parameters...';
      case 'signing': return 'Please sign the transaction in your wallet';
      case 'confirming': return 'Waiting for blockchain confirmation...';
      case 'completed': return `Token created successfully! ID: ${step.tokenId}`;
      case 'failed': return step.error || 'Transaction failed';
      default: return 'Unknown status';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const currentStep = steps[currentStepIndex];
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-black mb-4">
            Publishing Your Inventory
          </h1>
          <p className="text-gray-600 text-lg mb-4">
            {bundle.bundleName} strategy, {bundle.tokens.length} provider item(s)
          </p>
          
          {/* Progress Bar */}
          <div className="bg-gray-200 rounded-full h-3 w-full max-w-md mx-auto mb-4">
            <motion.div
              className="bg-black rounded-full h-3"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="text-gray-600 text-sm">
            {completedSteps} of {steps.length} inventory items published ({Math.round(progressPercentage)}%)
          </div>
        </motion.div>

        {/* Current Step Highlight */}
        {currentStep && currentStep.status !== 'completed' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-black font-bold text-lg">Currently Processing</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStepColor(currentStep.status)}`}>
                {getStepIcon(currentStep.status)} {currentStep.status.toUpperCase()}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-gray-500 text-sm">Service</div>
                <div className="text-black font-semibold">{currentStep.serviceName}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Token Value</div>
                <div className="text-black font-semibold">
                  {formatCurrency(bundle.tokens[currentStepIndex]?.estimatedRevenue || 0)}
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  currentStep.status === 'preparing' || currentStep.status === 'signing' || currentStep.status === 'confirming' 
                    ? 'animate-pulse bg-blue-500' 
                    : 'bg-gray-300'
                }`} />
                <span className="text-gray-700 text-sm">{getStepMessage(currentStep)}</span>
              </div>
              {currentStep.txHash && (
                <div className="mt-2 text-xs text-gray-500">
                  Transaction: {currentStep.txHash.slice(0, 20)}...
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* All Steps Overview */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <h3 className="text-black font-bold text-lg mb-4">Token Creation Progress</h3>
          {steps.map((step, index) => {
            const token = bundle.tokens[index];
            const isActive = index === currentStepIndex;
            
            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`border rounded-lg p-4 transition-all ${
                  isActive 
                    ? 'border-black bg-gray-50' 
                    : step.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : step.status === 'failed'
                    ? 'border-red-200 bg-red-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStepColor(step.status)}`}>
                      {step.status === 'completed' ? '✓' : index + 1}
                    </span>
                    <div>
                      <div className="text-black font-semibold">{step.serviceName}</div>
                      <div className="text-gray-500 text-sm">{token?.description}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-black font-bold">{formatCurrency(token?.estimatedRevenue || 0)}</div>
                    <div className="text-gray-500 text-sm">
                      {formatCurrency(token?.suggestedPricePerHour || 0)}/hr × {token?.suggestedTotalHours || 0}h
                    </div>
                  </div>
                </div>
                
                {/* Step Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600 mb-2">
                  <div>Rate: {formatCurrency(token?.suggestedPricePerHour || 0)}/hr</div>
                  <div>Hours: {token?.suggestedTotalHours || 0}h</div>
                  <div>Valid: {token?.suggestedValidityDays || 0} days</div>
                  <div>Demand: {token?.marketDemand || 'medium'}</div>
                </div>

                {/* Status Message */}
                <div className="flex items-center gap-2 text-sm">
                  <span>{getStepIcon(step.status)}</span>
                  <span className={
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'failed' ? 'text-red-600' :
                    isActive ? 'text-blue-600' : 'text-gray-500'
                  }>
                    {getStepMessage(step)}
                  </span>
                </div>

                {/* Transaction Hash */}
                {step.txHash && (
                  <div className="mt-2 text-xs text-gray-500">
                    <a 
                      href={`https://testnet.snowtrace.io/tx/${step.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 underline"
                    >
                      View on Explorer: {step.txHash.slice(0, 20)}...
                    </a>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6"
        >
          <h4 className="text-blue-800 font-semibold mb-2">💡 What's Happening?</h4>
          <div className="text-blue-700 text-sm space-y-1">
            <div>• Each token requires a separate blockchain transaction</div>
            <div>• Your wallet will prompt you to sign each transaction</div>
            <div>• Transactions are processed sequentially for better reliability</div>
            <div>• Once completed, your tokens will be available in the marketplace</div>
            <div>• Keep this tab open until all transactions are complete</div>
          </div>
        </motion.div>

        {/* Emergency Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center"
        >
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-sm underline"
          >
            Cancel and Return to Review
          </button>
        </motion.div>
      </div>
    </div>
  );
}
