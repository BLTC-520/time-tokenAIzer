'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { PortfolioData } from '../types/portfolio';
import { UserAnswers } from '../utils/localStorage';
import { TokenSuggestion } from '../services/tokenizeAgent';
import TokenizationPlan from './TokenizationPlan';
import AgenticMode from './AgenticMode';

interface TokenizationModeSelectorProps {
  portfolioData: PortfolioData;
  userAnswers: UserAnswers;
  onTokenizeSelected: (suggestion: TokenSuggestion) => void;
  onViewMarketplace: () => void;
  onComplete: () => void;
  onBack: () => void;
}

type TokenizationMode = 'selector' | 'manual' | 'agentic';

export default function TokenizationModeSelector({
  portfolioData,
  userAnswers,
  onTokenizeSelected,
  onViewMarketplace,
  onComplete,
  onBack
}: TokenizationModeSelectorProps) {
  const [mode, setMode] = useState<TokenizationMode>('selector');

  const handleAgenticComplete = () => {
    // Agentic mode completed successfully, redirect to marketplace
    onComplete();
  };

  const handleBackToSelector = () => {
    setMode('selector');
  };

  if (mode === 'manual') {
    return (
      <TokenizationPlan
        portfolioData={portfolioData}
        userAnswers={userAnswers}
        onTokenizeSelected={onTokenizeSelected}
        onViewMarketplace={onViewMarketplace}
      />
    );
  }

  if (mode === 'agentic') {
    return (
      <AgenticMode
        portfolioData={portfolioData}
        userAnswers={userAnswers}
        onComplete={handleAgenticComplete}
        onBack={handleBackToSelector}
      />
    );
  }

  // Mode selector UI
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Choose Your Tokenization Mode
          </h1>
          <p className="text-gray-600 text-xl mb-8">
            How would you like to create your time tokens?
          </p>
        </motion.div>

        {/* Mode Options */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Manual Mode */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:bg-gray-100 transition-all cursor-pointer group"
            onClick={() => setMode('manual')}
          >
            <div className="text-center">
              <div className="text-6xl mb-6">⚙️</div>
              <h2 className="text-2xl font-bold text-black mb-4">Manual Mode</h2>
              <p className="text-gray-600 mb-6">
                Take full control and customize each token step-by-step with AI-powered recommendations.
              </p>

              <div className="space-y-3 text-left mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700 text-sm">Review AI-generated token suggestions</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700 text-sm">Customize pricing, hours, and validity</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700 text-sm">Create tokens one at a time</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600">✓</span>
                  <span className="text-gray-700 text-sm">Full control over each parameter</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-blue-800 font-medium text-sm">Best for:</div>
                <div className="text-blue-700 text-sm">
                  Experienced users who want detailed control over their tokenization strategy
                </div>
              </div>

              <button className="w-full bg-black hover:bg-gray-800 text-white py-4 px-6 rounded-lg font-medium transition-all group-hover:scale-105">
                Choose Manual Mode
              </button>
            </div>
          </motion.div>

          {/* Agentic Mode */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-3xl p-8 hover:from-blue-100 hover:to-purple-100 transition-all cursor-pointer group"
            onClick={() => setMode('agentic')}
          >
            <div className="text-center">
              <div className="text-6xl mb-6">🤖</div>
              <h2 className="text-2xl font-bold text-black mb-4">
                Agentic Mode
                <span className="ml-2 text-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full">
                  AI-Powered
                </span>
              </h2>
              <p className="text-gray-600 mb-6">
                Tell our AI agent your goal and it will automatically create the perfect token strategy.
              </p>

              <div className="space-y-3 text-left mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-blue-600">🎯</span>
                  <span className="text-gray-700 text-sm">Natural language goal input</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-600">🧠</span>
                  <span className="text-gray-700 text-sm">AI analyzes and creates 3 strategies</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-600">⚡</span>
                  <span className="text-gray-700 text-sm">Automated token creation</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-600">📚</span>
                  <span className="text-gray-700 text-sm">Educational guidance for realistic goals</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-green-800 font-medium text-sm">Perfect for:</div>
                <div className="text-green-700 text-sm">
                  Quick token creation with AI doing the heavy lifting
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 px-6 rounded-lg font-medium transition-all group-hover:scale-105">
                Choose Agentic Mode 🚀
              </button>
            </div>
          </motion.div>
        </div>

        {/* Example Goals for Agentic Mode */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-black font-bold text-lg mb-4 text-center">
            💡 Agentic Mode Examples
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              "I want to earn $200 next week!",
              "I need $500 this month for rent",
              "I want to make $1000 in 2 weeks"
            ].map((example, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-gray-600 text-sm">"{example}"</div>
              </div>
            ))}
          </div>
          <div className="text-center text-gray-500 text-sm mt-4">
            Just tell our AI what you want to achieve, and it handles the rest!
          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex gap-4 justify-center"
        >
          <button
            onClick={onBack}
            className="bg-gray-100 hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-medium transition-all border border-gray-300"
          >
            Back to Portfolio
          </button>

          <button
            onClick={onViewMarketplace}
            className="bg-gray-100 hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-medium transition-all border border-gray-300"
          >
            Browse Marketplace
          </button>
        </motion.div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Not sure which mode to choose? Try Agentic Mode for a quick start, or Manual Mode for detailed control.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
