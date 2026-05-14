'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenizeAgent, AgenticAnalysis, TokenBundle } from '../services/tokenizeAgent';
import type { PortfolioData } from '../types/portfolio';
import { UserAnswers } from '../utils/localStorage';
import { useTimeTokenizerStorage } from '../hooks/useLocalStorage';
import GoalInput from './GoalInput';
import BundleSelection from './BundleSelection';
import ParameterReview from './ParameterReview';
import TransactionProgress from './TransactionProgress';

interface AgenticModeProps {
  portfolioData: PortfolioData;
  userAnswers: UserAnswers;
  onComplete: () => void;
  onBack: () => void;
}

type AgenticStep = 'goal' | 'analysis' | 'bundles' | 'review' | 'executing' | 'complete';

export default function AgenticMode({ 
  portfolioData, 
  userAnswers, 
  onComplete,
  onBack 
}: AgenticModeProps) {
  const [currentStep, setCurrentStep] = useState<AgenticStep>('goal');
  const [goal, setGoal] = useState('');
  const [analysis, setAnalysis] = useState<AgenticAnalysis | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<TokenBundle | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [createdTokens, setCreatedTokens] = useState<string[]>([]);
  const storage = useTimeTokenizerStorage();

  const handleGoalSubmit = async (userGoal: string) => {
    setGoal(userGoal);
    setCurrentStep('analysis');
    setIsAnalyzing(true);

    try {
      console.log('🎯 Starting agentic analysis for goal:', userGoal);
      
      const agent = new TokenizeAgent();
      const agenticResult = await agent.analyzeGoalForTokenBundles(userGoal, portfolioData, userAnswers);
      
      setAnalysis(agenticResult);
      setCurrentStep('bundles');
    } catch (error) {
      console.error('❌ Agentic analysis failed:', error);
      // Use fallback analysis
      try {
        const agent = new TokenizeAgent();
        const fallbackResult = await agent.analyzeGoalForTokenBundles(userGoal, portfolioData, userAnswers);
        setAnalysis(fallbackResult);
        setCurrentStep('bundles');
      } catch (fallbackError) {
        console.error('❌ Fallback analysis also failed:', fallbackError);
        // TODO: Show error state
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBundleSelect = (bundle: TokenBundle) => {
    setSelectedBundle(bundle);
    setCurrentStep('review');
  };

  const handleConfirmTokens = () => {
    setCurrentStep('executing');
    // Transaction execution will be handled by TransactionProgress component
  };

  const handleTransactionComplete = (tokenIds: string[]) => {
    setCreatedTokens(tokenIds);
    setCurrentStep('complete');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'goal':
        return (
          <GoalInput
            userAnswers={userAnswers}
            onSubmit={handleGoalSubmit}
            onBack={onBack}
          />
        );

      case 'analysis':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md w-full text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-6"></div>
              <h2 className="text-black text-2xl font-bold mb-2">Analyzing Your Goal</h2>
              <p className="text-gray-600 mb-4">AI is creating custom token strategies...</p>
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
                <div className="text-gray-700 text-sm space-y-2">
                  <div>🎯 Parsing your goal</div>
                  <div>📊 Analyzing portfolio fit</div>
                  <div>💡 Creating bundle strategies</div>
                  <div>⚖️ Evaluating feasibility</div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'bundles':
        return analysis ? (
          <BundleSelection
            analysis={analysis}
            goal={goal}
            onSelectBundle={handleBundleSelect}
            onBack={() => setCurrentStep('goal')}
          />
        ) : null;

      case 'review':
        return selectedBundle ? (
          <ParameterReview
            bundle={selectedBundle}
            goal={goal}
            analysis={analysis!}
            onConfirm={handleConfirmTokens}
            onBack={() => setCurrentStep('bundles')}
          />
        ) : null;

      case 'executing':
        return selectedBundle ? (
          <TransactionProgress
            bundle={selectedBundle}
            onComplete={handleTransactionComplete}
            onError={() => {
              // Handle error - could go back to review or show error state
              setCurrentStep('review');
            }}
          />
        ) : null;

      case 'complete':
        return (
          <div className="min-h-screen bg-white flex items-center justify-center p-8">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-2xl w-full text-center">
              <div className="text-green-600 text-4xl mb-4">✓</div>
              <h2 className="text-black text-3xl font-bold mb-4">Inventory Published Successfully</h2>
              <p className="text-gray-600 mb-6">
                Your agentic strategy has been prepared. {createdTokens.length} inventory item(s) published.
              </p>
              
              <div className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-black font-semibold mb-2">Published inventory:</h3>
                {createdTokens.map((tokenId, index) => (
                  <div key={tokenId} className="text-gray-700 text-sm">
                    Provider item #{tokenId} - {selectedBundle?.tokens[index]?.serviceName}
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={onComplete}
                  className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium transition-all"
                >
                  View Marketplace
                </button>
                <button
                  onClick={() => {
                    setCurrentStep('goal');
                    setGoal('');
                    setAnalysis(null);
                    setSelectedBundle(null);
                    setCreatedTokens([]);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-medium transition-all border border-gray-300"
                >
                  Publish More Inventory
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Progress Steps */}
      {currentStep !== 'complete' && (
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center space-x-8">
              {[
                { id: 'goal', label: 'Goal', icon: '🎯' },
                { id: 'bundles', label: 'Strategy', icon: '📊' },
                { id: 'review', label: 'Review', icon: '✅' },
                { id: 'executing', label: 'Execute', icon: '🚀' }
              ].map((step, index) => {
                const isActive = currentStep === step.id;
                const isCompleted = ['goal', 'bundles', 'review', 'executing'].indexOf(currentStep) > index;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center space-x-2 ${
                      isActive ? 'text-black' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                        isActive ? 'bg-black text-white' : 
                        isCompleted ? 'bg-gray-200 text-gray-600' : 
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {isCompleted ? '✓' : step.icon}
                      </div>
                      <span className="font-medium">{step.label}</span>
                    </div>
                    {index < 3 && (
                      <div className={`w-8 h-0.5 mx-4 ${
                        isCompleted ? 'bg-gray-300' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
