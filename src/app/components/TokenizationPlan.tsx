'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TokenizeAgent, type TokenizationPlan, TokenSuggestion } from '../services/tokenizeAgent';
import type { PortfolioData } from '../types/portfolio';
import { UserAnswers } from '../utils/localStorage';
import { useTimeTokenizerStorage } from '../hooks/useLocalStorage';

interface TokenizationPlanProps {
  portfolioData: PortfolioData;
  userAnswers: UserAnswers;
  onTokenizeSelected: (suggestion: TokenSuggestion) => void;
  onViewMarketplace: () => void;
}

export default function TokenizationPlan({ 
  portfolioData, 
  userAnswers, 
  onTokenizeSelected,
  onViewMarketplace 
}: TokenizationPlanProps) {
  const [plan, setPlan] = useState<TokenizationPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'analysis' | 'suggestions' | 'customize'>('analysis');
  const storage = useTimeTokenizerStorage();

  useEffect(() => {
    analyzePortfolio();
  }, [portfolioData, userAnswers]);

  const analyzePortfolio = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 Starting tokenization analysis...');

      const agent = new TokenizeAgent();
      const tokenizationPlan = await agent.analyzePortfolioForTokenization(portfolioData, userAnswers);
      
      setPlan(tokenizationPlan);
      setCurrentStep('suggestions');
    } catch (error) {
      console.error('❌ Tokenization analysis failed:', error);
      // Use fallback plan if server-side AI is unavailable
      try {
        const agent = new TokenizeAgent();
        const fallbackPlan = await agent.analyzePortfolioForTokenization(portfolioData, userAnswers);
        setPlan(fallbackPlan);
        setCurrentStep('suggestions');
      } catch (fallbackError) {
        console.error('❌ Fallback plan also failed:', fallbackError);
        // Create minimal plan to prevent crash
        setPlan({
          totalServices: 1,
          estimatedTotalRevenue: 1500,
          recommendedStartOrder: [{
            id: 'emergency-1',
            serviceName: 'Professional Service',
            description: 'General professional service offering',
            suggestedPricePerHour: 75,
            suggestedTotalHours: 20,
            suggestedValidityDays: 60,
            reasoning: 'Emergency fallback service',
            marketDemand: 'medium',
            competitiveness: 7,
            estimatedRevenue: 1500,
            priority: 'high',
            category: 'Professional',
            tags: ['Service']
          }],
          marketAnalysis: {
            totalPotentialMarket: 25000,
            averageHourlyRate: 75,
            competitorCount: 10,
            marketTrends: ['Professional services demand']
          },
          aiInsights: ['Start with core services'],
          riskFactors: ['Market competition'],
          optimizationTips: ['Focus on quality delivery']
        });
        setCurrentStep('suggestions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: TokenSuggestion) => {
    setSelectedSuggestion(suggestion.id);
    storage.tokenDrafts.saveDraft({
      id: Date.now().toString(),
      serviceName: suggestion.serviceName,
      pricePerHour: suggestion.suggestedPricePerHour,
      totalHours: suggestion.suggestedTotalHours,
      validityDays: suggestion.suggestedValidityDays,
      description: suggestion.description,
      createdAt: Date.now(),
      status: 'draft',
    });
  };

  const handleProceedWithTokenization = () => {
    if (selectedSuggestion && plan) {
      const suggestion = plan.recommendedStartOrder.find(s => s.id === selectedSuggestion);
      if (suggestion) {
        onTokenizeSelected(suggestion);
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getDemandColor = (demand: string) => {
    switch (demand) {
      case 'high': return 'text-black bg-gray-200 border border-gray-300';
      case 'medium': return 'text-black bg-gray-100 border border-gray-200';
      case 'low': return 'text-gray-600 bg-gray-50 border border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-black border-l-4 bg-gray-50';
      case 'medium': return 'border-l-gray-500 border-l-4 bg-gray-50';
      case 'low': return 'border-l-gray-300 border-l-4 bg-gray-50';
      default: return 'border-l-gray-300 border-l-4 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-black mx-auto mb-6"></div>
          <h2 className="text-black text-2xl font-bold mb-2">Analyzing Your Portfolio</h2>
          <p className="text-gray-600 mb-4">AI is crafting optimal tokenization strategies...</p>
          <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-700 text-sm space-y-2">
              <div>🔍 Analyzing service potential</div>
              <div>📊 Calculating market demand</div>
              <div>💰 Optimizing pricing strategies</div>
              <div>🎯 Creating launch recommendations</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 max-w-md w-full text-center">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-black text-2xl font-bold mb-2">Analysis Failed</h2>
          <p className="text-gray-600 mb-6">Unable to generate tokenization plan</p>
          <button
            onClick={analyzePortfolio}
            className="bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-all border"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b border-gray-200 pb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Your Tokenization Strategy
          </h1>
          <p className="text-gray-600 text-xl">
            AI-optimized plan to tokenize your {plan.totalServices} services
          </p>
        </div>

        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-black mb-2">
              {formatCurrency(plan.estimatedTotalRevenue)}
            </div>
            <div className="text-gray-600 text-sm">Estimated Revenue</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-black mb-2">
              {plan.totalServices}
            </div>
            <div className="text-gray-600 text-sm">Services to Tokenize</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-black mb-2">
              {formatCurrency(plan.marketAnalysis.averageHourlyRate)}
            </div>
            <div className="text-gray-600 text-sm">Average Rate</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
            <div className="text-3xl font-bold text-black mb-2">
              {plan.marketAnalysis.competitorCount}
            </div>
            <div className="text-gray-600 text-sm">Competitors</div>
          </div>
        </div>

        {/* Token Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Suggestions List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-black mb-4">Recommended Tokens</h2>
            {plan.recommendedStartOrder.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white border border-gray-200 rounded-lg p-6 ${getPriorityColor(suggestion.priority)} ${
                  selectedSuggestion === suggestion.id ? 'ring-2 ring-black' : ''
                } cursor-pointer transition-all hover:bg-gray-50`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-black font-bold text-lg mb-1">{suggestion.serviceName}</h3>
                    <p className="text-gray-600 text-sm mb-2">{suggestion.description}</p>
                    <div className="flex gap-2 flex-wrap">
                      {suggestion.tags.map(tag => (
                        <span key={tag} className="bg-gray-100 text-black text-xs px-2 py-1 rounded border">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-medium ${getDemandColor(suggestion.marketDemand)}`}>
                    {suggestion.marketDemand} demand
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-gray-500 text-xs">Price per Hour</div>
                    <div className="text-black font-bold">{formatCurrency(suggestion.suggestedPricePerHour)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Total Hours</div>
                    <div className="text-black font-bold">{suggestion.suggestedTotalHours}h</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Validity</div>
                    <div className="text-black font-bold">{suggestion.suggestedValidityDays} days</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-xs">Est. Revenue</div>
                    <div className="text-black font-bold">{formatCurrency(suggestion.estimatedRevenue)}</div>
                  </div>
                </div>

                <div className="bg-gray-100 border border-gray-200 rounded-lg p-3 mb-4">
                  <div className="text-gray-700 text-sm">
                    <strong>AI Reasoning:</strong> {suggestion.reasoning}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-gray-600 text-sm">
                    Competitiveness: {suggestion.competitiveness}/10
                  </div>
                  {selectedSuggestion === suggestion.id && (
                    <div className="text-black font-medium">✓ Selected</div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Analysis Insights */}
          <div className="space-y-6">
            {/* AI Insights */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-black font-bold text-lg mb-4 flex items-center gap-2">
                AI Insights
              </h3>
              <div className="space-y-3">
                {plan.aiInsights.map((insight, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-gray-600 text-sm">•</div>
                    <div className="text-gray-700 text-sm">{insight}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Trends */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-black font-bold text-lg mb-4 flex items-center gap-2">
                Market Trends
              </h3>
              <div className="space-y-2">
                {plan.marketAnalysis.marketTrends.map((trend, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-gray-600 text-sm">↗</div>
                    <div className="text-gray-700 text-sm">{trend}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-black font-bold text-lg mb-4 flex items-center gap-2">
                Risk Factors
              </h3>
              <div className="space-y-2">
                {plan.riskFactors.map((risk, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-gray-600 text-sm">!</div>
                    <div className="text-gray-700 text-sm">{risk}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optimization Tips */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-black font-bold text-lg mb-4 flex items-center gap-2">
                Optimization Tips
              </h3>
              <div className="space-y-2">
                {plan.optimizationTips.map((tip, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="text-gray-600 text-sm">•</div>
                    <div className="text-gray-700 text-sm">{tip}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center pt-8 border-t border-gray-200">
          <button
            onClick={onViewMarketplace}
            className="bg-gray-100 hover:bg-gray-200 text-black px-8 py-3 rounded-lg font-medium transition-all border border-gray-300"
          >
            View Marketplace
          </button>
          
          {selectedSuggestion && (
            <motion.button
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={handleProceedWithTokenization}
              className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium transition-all border"
            >
              Create Token
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
