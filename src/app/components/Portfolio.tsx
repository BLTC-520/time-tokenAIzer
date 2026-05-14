'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { portfolioAgent } from '../services/openaiPortfolioAgent';
import type { PortfolioData } from '../types/portfolio';
import { marketAnalyzeAgent, MarketAnalysisResult } from '../services/marketAnalyzeAgent';
import { GETSKILLPRICE_CONTRACT_ADDRESS } from '../shared/constants';
import { getPriceService, PriceData } from '../services/priceService';
import { useChainId } from 'wagmi';

interface UserAnswers {
  name: string;
  experience: string;
  skills: string[];
  timeAvailable: string;
  goals: string;
  preferredProjects: string[];
  hourlyRate: string;
}

interface PortfolioProps {
  userAnswers: UserAnswers;
  portfolioData: PortfolioData;
  onProceedToTokenization?: () => void;
}

const skillIcons: { [key: string]: string } = {
  frontend: '🎨',
  backend: '⚙️',
  fullstack: '🔧',
  mobile: '📱',
  ai: '🤖',
  blockchain: '⛓️',
  design: '🎭',
  graphics: '🖌️',
  marketing: '📈',
  content: '✍️',
  consulting: '💡',
  project: '📋',
};


export default function Portfolio({ userAnswers, portfolioData, onProceedToTokenization }: PortfolioProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [aiPortfolioData, setAiPortfolioData] = useState<PortfolioData | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const chainId = useChainId();
  const priceService = getPriceService();

  const calculateWeeklyEarnings = () => {
    const timeMap: { [key: string]: number } = {
      '5-10': 7.5,
      '10-20': 15,
      '20-30': 25,
      '30+': 35,
    };
    
    const rateMap: { [key: string]: number } = {
      '10-25': 17.5,
      '25-50': 37.5,
      '50-100': 75,
      '100+': 125,
    };
    
    const hours = timeMap[userAnswers.timeAvailable] || 15;
    const rate = rateMap[userAnswers.hourlyRate] || 37.5;
    
    return Math.round(hours * rate);
  };

  const calculateMonthlyEarnings = () => {
    return calculateWeeklyEarnings() * 4.33;
  };

  const calculateCompatibilityScore = () => {
    let score = 70; // base score
    
    // Add points for diverse skills (with safety check)
    const skillsLength = userAnswers.skills?.length || 0;
    score += Math.min(skillsLength * 3, 20);
    
    // Add points for experience
    if (userAnswers.experience === 'expert') score += 10;
    else if (userAnswers.experience === 'advanced') score += 7;
    else if (userAnswers.experience === 'intermediate') score += 5;
    
    // Add points for clear goals (with safety check)
    const goalsLength = userAnswers.goals?.length || 0;
    if (goalsLength > 50) score += 5;
    
    return Math.min(score, 98);
  };

  const generateRecommendedProjects = () => {
    // Generate AI-powered project recommendations based on user profile
    const skillSet = userAnswers.skills.join(', ');
    const experienceLevel = userAnswers.experience;
    const timeAvailable = userAnswers.timeAvailable;
    const goals = userAnswers.goals;

    const projects = [
      { 
        name: 'Decentralized Social Media DApp Frontend', 
        match: 92, 
        estimatedBudget: '$1,500-3,000', 
        duration: '4-6 weeks',
        description: 'Develop the frontend for a decentralized social media application using React and IPFS for decentralized storage. Requires integrating with a smart contract backend (can be provided).',
        fitReason: `Perfect match for your ${skillSet} expertise. Your ${experienceLevel} level experience in frontend development makes you ideal for this cutting-edge Web3 project.`,
        requiredSkills: ['Frontend Development', 'React', 'IPFS', 'Web3'],
        keyResponsibilities: ['Build responsive UI components', 'Integrate with IPFS storage', 'Connect smart contract backend', 'Implement user authentication'],
        whyYouFit: `Your combination of ${skillSet} skills perfectly aligns with this role's requirements. The ${timeAvailable} hours you have available weekly is ideal for this project scope.`
      },
      { 
        name: 'E-commerce Website Backend with AI-powered Product Recommendations', 
        match: 88, 
        estimatedBudget: '$2,000-4,000', 
        duration: '6-8 weeks',
        description: 'Build the backend for an e-commerce website using Node.js and a database like PostgreSQL. Integrate a basic AI model for product recommendations.',
        fitReason: `Your background in ${skillSet} provides strong foundation for full-stack development. ${experienceLevel} experience level shows you can handle complex backend architecture.`,
        requiredSkills: ['Backend Development', 'Node.js', 'PostgreSQL', 'AI Integration'],
        keyResponsibilities: ['Design database schema', 'Build REST APIs', 'Implement AI recommendation engine', 'Set up payment processing'],
        whyYouFit: `Backend development requires the technical understanding you've demonstrated through ${skillSet}. Your goal of "${goals}" aligns perfectly with modern e-commerce needs.`
      },
      { 
        name: 'SaaS Dashboard with User Authentication and Data Visualization', 
        match: 90, 
        estimatedBudget: '$1,000-2,500', 
        duration: '4-6 weeks',
        description: 'Create a user-friendly dashboard for a SaaS application using React and a backend of your choice. Focus on clean user interface and real-time data updates.',
        fitReason: `Your ${skillSet} skills translate well to SaaS development. ${experienceLevel} level shows you can create professional dashboard interfaces.`,
        requiredSkills: ['Frontend Development', 'Backend Development', 'React', 'Data Visualization'],
        keyResponsibilities: ['Build dashboard components', 'Implement user authentication', 'Create data visualization charts', 'Set up real-time updates'],
        whyYouFit: `SaaS development rewards clean architecture and user experience - qualities evident in your ${skillSet} background. Your ${timeAvailable} availability allows for thorough testing and refinement.`
      },
      { 
        name: 'AI-Powered Chatbot for Customer Support', 
        match: 87, 
        estimatedBudget: '$1,800-3,500', 
        duration: '5-7 weeks',
        description: 'Build an intelligent chatbot system with natural language processing capabilities for automated customer support and lead generation.',
        fitReason: `Your expertise in ${skillSet} makes you well-suited for AI integration projects. ${experienceLevel} experience level demonstrates capability for complex implementations.`,
        requiredSkills: ['AI/ML', 'Natural Language Processing', 'Backend Development', 'API Integration'],
        keyResponsibilities: ['Train chatbot models', 'Build conversation flows', 'Integrate with existing systems', 'Implement analytics dashboard'],
        whyYouFit: `AI chatbot development requires both technical skills and user experience thinking, both evident in your ${skillSet} profile. Your goal of "${goals}" aligns with the growing AI automation market.`
      },
      { 
        name: 'Mobile-First Progressive Web App (PWA)', 
        match: 85, 
        estimatedBudget: '$1,200-2,800', 
        duration: '4-6 weeks',
        description: 'Develop a cross-platform progressive web application with offline capabilities, push notifications, and mobile-optimized performance.',
        fitReason: `Your ${skillSet} background provides excellent foundation for modern PWA development. ${experienceLevel} experience shows you understand mobile-first principles.`,
        requiredSkills: ['Progressive Web Apps', 'Mobile Development', 'Service Workers', 'Performance Optimization'],
        keyResponsibilities: ['Implement PWA features', 'Optimize for mobile performance', 'Set up offline functionality', 'Configure push notifications'],
        whyYouFit: `PWA development combines web and mobile expertise, perfectly matching your ${skillSet} skills. Your ${timeAvailable} weekly availability ensures dedicated focus on performance optimization.`
      },
      { 
        name: 'Blockchain Smart Contract Development & Integration', 
        match: 93, 
        estimatedBudget: '$2,500-5,000', 
        duration: '6-10 weeks',
        description: 'Create and deploy smart contracts for DeFi applications with comprehensive testing suite and frontend integration for seamless user experience.',
        fitReason: `Your ${skillSet} expertise positions you perfectly for blockchain development. ${experienceLevel} level experience indicates strong problem-solving capabilities for complex smart contract logic.`,
        requiredSkills: ['Blockchain', 'Smart Contracts', 'Solidity', 'Web3 Integration'],
        keyResponsibilities: ['Write secure smart contracts', 'Deploy to testnet/mainnet', 'Build frontend integration', 'Conduct security audits'],
        whyYouFit: `Blockchain development is at the cutting edge of technology, perfectly matching your ${skillSet} background. Your goal of "${goals}" aligns with the high-growth potential in Web3 space, and your ${timeAvailable} availability allows for thorough testing and security considerations.`
      }
    ];
    
    return projects;
  };

  const generateSkillAssessment = () => {
    const skills = userAnswers.skills || [];
    return skills.map(skill => ({
      skill,
      level: Math.floor(Math.random() * 30) + 70, // 70-100%
      marketDemand: Math.floor(Math.random() * 20) + 80, // 80-100%
      insights: `Strong market demand for ${skill}. Your ${userAnswers.experience} level experience positions you well in this competitive field.`
    }));
  };

  const generateTimeOptimization = () => {
    const tips = [
      'Focus on blockchain projects - they offer 40% higher rates',
      'Consider full-stack roles to maximize your skill utilization',
      'AI/ML projects in your area show strong growth potential',
      'Weekend projects can boost earnings by 25%',
    ];
    
    return tips.slice(0, 2);
  };

  // Helper function to clean and format earnings
  const formatEarnings = (value: any): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      // Remove all $ signs and commas, then parse the first number
      const cleaned = value.replace(/[$,]/g, '');
      const match = cleaned.match(/(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  };

  // Load real-time price data
  useEffect(() => {
    const loadPriceData = async () => {
      try {
        const data = await priceService.getLatestPrice(chainId);
        setPriceData(data);
      } catch (error) {
        console.error('Failed to load price data:', error);
      }
    };

    loadPriceData();
  }, [chainId]);

  // Generate AI portfolio data on component mount
  useEffect(() => {
    const generateAIPortfolio = async () => {
      // Only generate if we don't already have AI portfolio data from props
      if (!portfolioData.projectRecommendations && !aiPortfolioData && !isGeneratingAI) {
        setIsGeneratingAI(true);
        try {
        console.log('🤖 Generating AI portfolio with GPT Portfolio Agent...');
        const aiData = await portfolioAgent.generatePortfolio(userAnswers);
          setAiPortfolioData(aiData);
          console.log('✅ AI portfolio generation completed');
        } catch (error) {
          console.error('❌ Failed to generate AI portfolio:', error);
        } finally {
          setIsGeneratingAI(false);
        }
      }
    };

    generateAIPortfolio();
  }, [userAnswers, portfolioData, aiPortfolioData, isGeneratingAI]);

  // Convert USD to crypto using real Chainlink price feed
  const usdToCrypto = (usd: number): string => {
    if (!priceData) return '...';
    const cryptoAmount = usd / priceData.price;
    return cryptoAmount.toFixed(2);
  };

  // Get currency symbol for current chain
  const getCurrencySymbol = (): string => {
    return priceService.getCurrentCurrencyInfo(chainId).symbol;
  };

  // Use AI-generated data with priority: aiPortfolioData > portfolioData > fallback
  const currentPortfolioData = aiPortfolioData || portfolioData;
  const insights = {
    weeklyEarnings: formatEarnings(currentPortfolioData.earningsProjection?.weekly || calculateWeeklyEarnings()),
    monthlyEarnings: formatEarnings(currentPortfolioData.earningsProjection?.monthly || calculateMonthlyEarnings()),
    compatibilityScore: calculateCompatibilityScore(),
    recommendedProjects: currentPortfolioData.projectRecommendations || generateRecommendedProjects(),
    skillAssessment: currentPortfolioData.skillAssessment || generateSkillAssessment(),
    timeOptimization: currentPortfolioData.earningsProjection?.optimizationTips || generateTimeOptimization(),
    hasAIRecommendations: (aiPortfolioData?.projectRecommendations || portfolioData.projectRecommendations) && 
                         (aiPortfolioData?.projectRecommendations || portfolioData.projectRecommendations)!.length > 0,
    hasAISkillAssessment: (aiPortfolioData?.skillAssessment || portfolioData.skillAssessment) && 
                         (aiPortfolioData?.skillAssessment || portfolioData.skillAssessment)!.length > 0,
    hasAIOptimization: (aiPortfolioData?.earningsProjection?.optimizationTips || portfolioData.earningsProjection?.optimizationTips) && 
                      (aiPortfolioData?.earningsProjection?.optimizationTips || portfolioData.earningsProjection?.optimizationTips)!.length > 0,
    isAIGenerated: !!aiPortfolioData,
  };

  // Market Analysis function
  const handleMarketAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🔍 Starting market analysis...');
      
      // Fetch Chainlink data from GetSkillPrice.sol contract
      const skills = userAnswers.skills || [];
      const chainlinkData = await marketAnalyzeAgent.fetchChainlinkData(
        GETSKILLPRICE_CONTRACT_ADDRESS, 
        skills
      );
      
      // Perform market analysis
      const analysis = await marketAnalyzeAgent.analyzeMarket(skills, chainlinkData);
      setMarketAnalysis(analysis);
      setActiveTab('market');
      
      console.log('✅ Market analysis completed');
    } catch (error) {
      console.error('❌ Market analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const tabs = [
    { id: 'overview', label: '📊 Overview', icon: '📊' },
    { id: 'projects', label: '🚀 Projects', icon: '🚀' },
    { id: 'skills', label: '⭐ Skills', icon: '⭐' },
    { id: 'market', label: '📈 Market Analysis', icon: '📈' },
    { id: 'earnings', label: '💰 Earnings', icon: '💰' },
  ];

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="mb-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              {userAnswers.name}'s Time Portfolio
            </h1>
            <p className="text-white/80 text-xl">
              Generated by GPT Portfolio Maker Agent
            </p>
          </div>
          
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-2 border border-white/20">
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-purple-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Profile Summary */}
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 col-span-full lg:col-span-2">
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                  👤 Profile Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-white/80 font-semibold">Experience Level</h3>
                    <p className="text-white text-lg capitalize">{userAnswers.experience}</p>
                  </div>
                  <div>
                    <h3 className="text-white/80 font-semibold">Time Available</h3>
                    <p className="text-white text-lg">{userAnswers.timeAvailable} hours/week</p>
                  </div>
                  <div>
                    <h3 className="text-white/80 font-semibold">Hourly Rate</h3>
                    <p className="text-white text-lg">${userAnswers.hourlyRate}/hour</p>
                  </div>
                  <div>
                    <h3 className="text-white/80 font-semibold">Skills Count</h3>
                    <p className="text-white text-lg">{userAnswers.skills?.length || 0} core skills</p>
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="text-white/80 font-semibold mb-2">
                    {currentPortfolioData.profileSummary ? 'AI-Generated Profile Summary' : 'Goals'}
                  </h3>
                  <p className="text-white">
                    {currentPortfolioData.profileSummary || userAnswers.goals}
                  </p>
                  {currentPortfolioData.profileSummary && (
                    <div className="mt-3 text-xs text-green-400 flex items-center">
                      Generated by GPT Portfolio Maker Agent
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-500/20 to-green-700/20 backdrop-blur-lg rounded-3xl p-6 border border-green-500/30">
                  <h3 className="text-green-400 font-bold text-lg mb-2">Weekly Earnings</h3>
                  <p className="text-white text-3xl font-bold">${insights.weeklyEarnings.toLocaleString()}</p>
                  <p className="text-green-300 text-sm mt-1">≈ {usdToCrypto(insights.weeklyEarnings)} {getCurrencySymbol()}</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-700/20 backdrop-blur-lg rounded-3xl p-6 border border-blue-500/30">
                  <h3 className="text-blue-400 font-bold text-lg mb-2">Monthly Earnings</h3>
                  <p className="text-white text-3xl font-bold">${insights.monthlyEarnings.toLocaleString()}</p>
                  <p className="text-blue-300 text-sm mt-1">≈ {usdToCrypto(insights.monthlyEarnings)} {getCurrencySymbol()}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  🚀 Recommended Projects
                </h2>
                {(insights.hasAIRecommendations || isGeneratingAI) && (
                  <div className="text-green-400 text-sm flex items-center justify-center">
                    {isGeneratingAI ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-400 mr-2"></div>
                        GPT agent generating personalized projects...
                      </div>
                    ) : (
                      <>🤖 {insights.isAIGenerated ? 'AI-generated' : 'AI-curated'} projects based on your profile analysis</>
                    )}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {insights.recommendedProjects.map((project, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                    className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20 hover:border-white/40 transition-all hover:scale-105 cursor-pointer"
                  >
                    {/* Match Badge */}
                    <div className="flex justify-end mb-4">
                      <div className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full font-bold text-sm">
                        {project.match}% Match
                      </div>
                    </div>
                    
                    {/* Project Header */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">{project.name}</h3>
                      <p className="text-white/80 text-sm mb-4 leading-relaxed line-clamp-3">{project.description}</p>
                    </div>
                    
                    {/* Budget and Duration */}
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center text-white/70">
                        <span className="text-lg mr-2">💰</span>
                        <span>Budget: {project.estimatedBudget}</span>
                      </div>
                      <div className="flex items-center text-white/70">
                        <span className="text-lg mr-2">⏱️</span>
                        <span>Duration: {project.duration}</span>
                      </div>
                    </div>

                    {/* Required Skills */}
                    <div className="mb-4">
                      <h4 className="text-white font-bold text-sm mb-2 flex items-center">
                        <span className="text-lg mr-2">🔧</span>
                        Required Skills
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {((project as any).requiredSkills || ['Sales', 'Communication', 'Technology']).slice(0, 3).map((skill: string, skillIndex: number) => (
                          <span 
                            key={skillIndex}
                            className="bg-purple-500/20 text-purple-200 px-2 py-1 rounded-full text-xs font-medium border border-purple-400/30"
                          >
                            {skill}
                          </span>
                        ))}
                        {((project as any).requiredSkills?.length || 0) > 3 && (
                          <span className="bg-gray-500/20 text-gray-200 px-2 py-1 rounded-full text-xs font-medium border border-gray-400/30">
                            +{((project as any).requiredSkills?.length || 0) - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Why You're Perfect Section - Condensed */}
                    <div className="bg-blue-500/10 rounded-xl p-3 mb-4 border border-blue-400/20">
                      <h4 className="text-blue-300 font-bold text-sm mb-2 flex items-center">
                        <span className="text-lg mr-2">🎯</span>
                        Why You're Perfect
                      </h4>
                      <p className="text-white/90 text-xs leading-relaxed line-clamp-2">
                        {(project as any).whyYouFit || 'AI analysis shows strong alignment with your portfolio and experience level.'}
                      </p>
                    </div>
                    
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-gradient-to-r from-white to-gray-100 text-purple-600 px-4 py-3 rounded-xl font-bold text-sm hover:from-gray-100 hover:to-white transition-all shadow-lg"
                    >
                      <span className="flex items-center justify-center">
                        <span className="mr-2">🚀</span>
                        Apply Now
                      </span>
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  ⭐ Skill Assessment
                </h2>
                {insights.hasAISkillAssessment && (
                  <div className="text-green-400 text-sm flex items-center justify-center">
                    🤖 {insights.isAIGenerated ? 'AI-generated' : 'AI-powered'} skill analysis with market insights
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {insights.skillAssessment.map((skillData, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20"
                  >
                    <div className="flex items-center mb-4">
                      <span className="text-3xl mr-3">{skillIcons[skillData.skill] || '🔧'}</span>
                      <h3 className="text-xl font-bold text-white capitalize">
                        {skillData.skill.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-white/80 mb-1">
                          <span>Proficiency</span>
                          <span>{skillData.level}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${skillData.level}%` }}
                            transition={{ delay: 0.5 + index * 0.1, duration: 1 }}
                            className="bg-gradient-to-r from-purple-400 to-blue-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-white/80 mb-1">
                          <span>Market Demand</span>
                          <span>{skillData.marketDemand}%</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${skillData.marketDemand}%` }}
                            transition={{ delay: 0.7 + index * 0.1, duration: 1 }}
                            className="bg-gradient-to-r from-green-400 to-yellow-500 h-2 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'market' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-4">
                  📈 Market Analysis
                </h2>
                <p className="text-white/80 mb-6">
                  Market analysis with the help of Chainlink Functions & AI insights
                </p>
                
                {!marketAnalysis ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleMarketAnalysis}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                        Analyzing Market...
                      </div>
                    ) : (
                      '🔍 Start Market Analysis'
                    )}
                  </motion.button>
                ) : (
                  <div className="space-y-6">
                    {/* Market Summary */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                      <h3 className="text-2xl font-bold text-white mb-4">📊 Market Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-green-500/20 rounded-xl p-4">
                          <h4 className="text-green-400 font-semibold mb-2">Top Paying Skills</h4>
                          <div className="space-y-1">
                            {marketAnalysis.marketSummary.topPayingSkills.map((skill, idx) => (
                              <div key={idx} className="text-white text-sm">{skill}</div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-blue-500/20 rounded-xl p-4">
                          <h4 className="text-blue-400 font-semibold mb-2">Emerging Skills</h4>
                          <div className="space-y-1">
                            {marketAnalysis.marketSummary.emergingSkills.map((skill, idx) => (
                              <div key={idx} className="text-white text-sm">{skill}</div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-yellow-500/20 rounded-xl p-4">
                          <h4 className="text-yellow-400 font-semibold mb-2">Market Hotspots</h4>
                          <div className="space-y-1">
                            {marketAnalysis.marketSummary.marketHotspots.map((region, idx) => (
                              <div key={idx} className="text-white text-sm">{region}</div>
                            ))}
                          </div>
                        </div>
                        <div className="bg-red-500/20 rounded-xl p-4">
                          <h4 className="text-red-400 font-semibold mb-2">Oversaturated</h4>
                          <div className="space-y-1">
                            {marketAnalysis.marketSummary.oversaturatedSkills.length > 0 ? (
                              marketAnalysis.marketSummary.oversaturatedSkills.map((skill, idx) => (
                                <div key={idx} className="text-white text-sm">{skill}</div>
                              ))
                            ) : (
                              <div className="text-white text-sm">None identified</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Skill Analysis */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                      <h3 className="text-2xl font-bold text-white mb-6">💰 Skill Pricing Analysis</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {marketAnalysis.skillAnalysis.map((skill, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white/5 rounded-xl p-4 border border-white/10"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h4 className="text-lg font-semibold text-white capitalize">{skill.skill}</h4>
                              <span className="text-2xl">{skillIcons[skill.skill] || '💼'}</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-white/70">Avg. Rate:</span>
                                <span className="text-green-400 font-bold">${skill.averageHourlyRate}/hr</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Demand:</span>
                                <span className={`font-semibold ${
                                  skill.demandLevel === 'very_high' ? 'text-red-400' :
                                  skill.demandLevel === 'high' ? 'text-orange-400' :
                                  skill.demandLevel === 'medium' ? 'text-yellow-400' : 'text-gray-400'
                                }`}>
                                  {skill.demandLevel.replace('_', ' ').toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Trend:</span>
                                <span className={`font-semibold ${
                                  skill.marketTrend === 'surging' ? 'text-green-400' :
                                  skill.marketTrend === 'growing' ? 'text-blue-400' :
                                  skill.marketTrend === 'stable' ? 'text-yellow-400' : 'text-red-400'
                                }`}>
                                  {skill.marketTrend.toUpperCase()}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-white/70">Competition:</span>
                                <span className="text-white">{skill.competitionLevel}/10</span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                      <h3 className="text-2xl font-bold text-white mb-6">🎯 Strategic Recommendations</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-lg font-semibold text-green-400 mb-3">Short Term (1-3 months)</h4>
                          <ul className="space-y-2">
                            {Array.isArray(marketAnalysis.recommendations.shortTerm) ? 
                              marketAnalysis.recommendations.shortTerm.map((rec, idx) => (
                                <li key={idx} className="text-white flex items-start">
                                  <span className="text-green-400 mr-2">•</span>
                                  {rec}
                                </li>
                              )) : (
                                <li className="text-white flex items-start">
                                  <span className="text-green-400 mr-2">•</span>
                                  {marketAnalysis.recommendations.shortTerm}
                                </li>
                              )
                            }
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-blue-400 mb-3">Medium Term (3-6 months)</h4>
                          <ul className="space-y-2">
                            {Array.isArray(marketAnalysis.recommendations.mediumTerm) ? 
                              marketAnalysis.recommendations.mediumTerm.map((rec, idx) => (
                                <li key={idx} className="text-white flex items-start">
                                  <span className="text-blue-400 mr-2">•</span>
                                  {rec}
                                </li>
                              )) : (
                                <li className="text-white flex items-start">
                                  <span className="text-blue-400 mr-2">•</span>
                                  {marketAnalysis.recommendations.mediumTerm}
                                </li>
                              )
                            }
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-purple-400 mb-3">Long Term (6-12 months)</h4>
                          <ul className="space-y-2">
                            {Array.isArray(marketAnalysis.recommendations.longTerm) ? 
                              marketAnalysis.recommendations.longTerm.map((rec, idx) => (
                                <li key={idx} className="text-white flex items-start">
                                  <span className="text-purple-400 mr-2">•</span>
                                  {rec}
                                </li>
                              )) : (
                                <li className="text-white flex items-start">
                                  <span className="text-purple-400 mr-2">•</span>
                                  {marketAnalysis.recommendations.longTerm}
                                </li>
                              )
                            }
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-yellow-400 mb-3">Rate Optimization</h4>
                          <ul className="space-y-2">
                            {Array.isArray(marketAnalysis.recommendations.rateOptimization) ? 
                              marketAnalysis.recommendations.rateOptimization.map((rec, idx) => (
                                <li key={idx} className="text-white flex items-start">
                                  <span className="text-yellow-400 mr-2">•</span>
                                  {rec}
                                </li>
                              )) : (
                                <li className="text-white flex items-start">
                                  <span className="text-yellow-400 mr-2">•</span>
                                  {marketAnalysis.recommendations.rateOptimization}
                                </li>
                              )
                            }
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Market Insights */}
                    <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                      <h3 className="text-2xl font-bold text-white mb-6">💡 Market Insights</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-green-500/10 rounded-xl p-4">
                          <h4 className="text-green-400 font-semibold mb-3">🚀 Opportunities</h4>
                          <ul className="space-y-2">
                            {marketAnalysis.insights.marketOpportunities.map((opp, idx) => (
                              <li key={idx} className="text-white text-sm">• {opp}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-4">
                          <h4 className="text-red-400 font-semibold mb-3">⚠️ Threats</h4>
                          <ul className="space-y-2">
                            {marketAnalysis.insights.threatAnalysis.map((threat, idx) => (
                              <li key={idx} className="text-white text-sm">• {threat}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-blue-500/10 rounded-xl p-4">
                          <h4 className="text-blue-400 font-semibold mb-3">💪 Advantages</h4>
                          <ul className="space-y-2">
                            {marketAnalysis.insights.competitiveAdvantages.map((adv, idx) => (
                              <li key={idx} className="text-white text-sm">• {adv}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {marketAnalysis.chainlinkData && (
                      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 border border-white/20">
                        <h3 className="text-2xl font-bold text-white mb-4">⛓️ Chainlink Functions Data</h3>
                        <div className="text-green-400 text-sm mb-4">
                          Chainlink Functions return:
                        </div>
                        <pre className="bg-black/20 rounded-xl p-4 text-white text-sm overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(marketAnalysis.chainlinkData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">
                💰 Earnings Optimization
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500/20 to-green-700/20 backdrop-blur-lg rounded-3xl p-8 border border-green-500/30">
                  <h3 className="text-green-400 font-bold text-2xl mb-4">Weekly</h3>
                  <p className="text-white text-4xl font-bold mb-2">${insights.weeklyEarnings.toLocaleString()}</p>
                  <p className="text-green-300">Based on current rate & availability</p>
                </div>
                
                <div className="bg-gradient-to-br from-blue-500/20 to-blue-700/20 backdrop-blur-lg rounded-3xl p-8 border border-blue-500/30">
                  <h3 className="text-blue-400 font-bold text-2xl mb-4">Monthly</h3>
                  <p className="text-white text-4xl font-bold mb-2">${insights.monthlyEarnings.toLocaleString()}</p>
                  <p className="text-blue-300">Consistent project engagement</p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/20 to-purple-700/20 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/30">
                  <h3 className="text-purple-400 font-bold text-2xl mb-4">Yearly</h3>
                  <p className="text-white text-4xl font-bold mb-2">${(insights.monthlyEarnings * 12).toLocaleString()}</p>
                  <p className="text-purple-300">Full tokenization potential</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-6">💡 AI Optimization Tips</h3>
                <div className="space-y-4">
                  {insights.timeOptimization.map((tip, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.3 }}
                      className="flex items-center p-4 bg-white/5 rounded-2xl border border-white/10"
                    >
                      <span className="text-2xl mr-4">💡</span>
                      <p className="text-white text-lg">{tip}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
              
              {/* Tokenization CTA */}
              {onProceedToTokenization && (
                <div className="mt-8 text-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onProceedToTokenization}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl transition-all"
                  >
                    🚀 Start Tokenizing Your Time
                  </motion.button>
                  <p className="text-white/70 text-sm mt-2">
                    Transform your portfolio into tradeable time tokens
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
