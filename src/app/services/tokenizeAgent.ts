'use client';

import type { PortfolioData } from '../types/portfolio';
import type { UserAnswers } from '../utils/localStorage';

export interface TokenSuggestion {
  id: string;
  serviceName: string;
  description: string;
  suggestedPricePerHour: number;
  suggestedTotalHours: number;
  suggestedValidityDays: number;
  reasoning: string;
  marketDemand: 'high' | 'medium' | 'low';
  competitiveness: number; // 1-10 scale
  estimatedRevenue: number;
  priority: 'high' | 'medium' | 'low';
  category: string;
  tags: string[];
}

export interface TokenizationPlan {
  totalServices: number;
  estimatedTotalRevenue: number;
  recommendedStartOrder: TokenSuggestion[];
  marketAnalysis: {
    totalPotentialMarket: number;
    averageHourlyRate: number;
    competitorCount: number;
    marketTrends: string[];
  };
  aiInsights: string[];
  riskFactors: string[];
  optimizationTips: string[];
}

// New interfaces for Agentic Mode
export interface GoalAnalysis {
  targetAmount: number;
  timeframe: string;
  timeframeDays: number;
  isRealistic: boolean;
  realityScore: number; // 1-10 scale
  educationalMessage?: string;
  adjustedGoal?: {
    amount: number;
    timeframe: string;
    reasoning: string;
  };
}

export interface TokenBundle {
  id: string;
  bundleName: string;
  description: string;
  strategy: 'conservative' | 'balanced' | 'aggressive';
  tokens: TokenSuggestion[];
  totalRevenue: number;
  totalHours: number;
  averageHourlyRate: number;
  successProbability: number; // 1-10 scale
  pros: string[];
  cons: string[];
  timeToComplete: string;
}

export interface AgenticAnalysis {
  goalAnalysis: GoalAnalysis;
  bundles: TokenBundle[];
  recommendation: string;
  educationalInsights: string[];
}

export class TokenizeAgent {
  constructor(_apiKey?: string) {}

  async analyzePortfolioForTokenization(
    portfolioData: PortfolioData,
    userAnswers: UserAnswers
  ): Promise<TokenizationPlan> {
    try {
      console.log('🤖 TokenizeAgent: Analyzing portfolio for optimal tokenization...');

      const analysisPrompt = this.buildTokenizationPrompt(portfolioData, userAnswers);
      const response = await this.callOpenAIAPI(analysisPrompt, 'tokenization');

      const plan = this.parseTokenizationResponse(response);

      console.log('✅ TokenizeAgent: Analysis complete -', plan.totalServices, 'services identified');
      return plan;
    } catch (error) {
      console.error('❌ TokenizeAgent analysis failed:', error);
      return this.getFallbackTokenizationPlan(portfolioData, userAnswers);
    }
  }

  // NEW: Agentic Mode - Goal-driven token bundle generation
  async analyzeGoalForTokenBundles(
    goal: string,
    portfolioData: PortfolioData,
    userAnswers: UserAnswers
  ): Promise<AgenticAnalysis> {
    try {
      console.log('🎯 TokenizeAgent: Analyzing goal for agentic token bundles...');
      console.log('Goal:', goal);
      const goalAnalysis = this.parseGoal(goal);
      const agenticPrompt = this.buildAgenticPrompt(goal, goalAnalysis, portfolioData, userAnswers);

      console.log('🤖 Calling server-side GPT API for agentic analysis...');
      const response = await this.callOpenAIAPI(agenticPrompt, 'agentic');
      console.log('📡 Received AI response, parsing...');

      const analysis = this.parseAgenticResponse(response, goalAnalysis);

      console.log('✅ TokenizeAgent: Agentic analysis complete -', analysis.bundles.length, 'bundles generated');
      console.log('Generated bundles:', analysis.bundles.map(b => ({
        id: b.id,
        name: b.bundleName,
        tokenCount: b.tokens.length,
        tokens: b.tokens.map(t => t.serviceName)
      })));
      return analysis;
    } catch (error) {
      console.error('❌ TokenizeAgent agentic analysis failed:', error);
      console.log('🔄 Falling back to hardcoded analysis...');
      const fallbackAnalysis = this.getFallbackAgenticAnalysis(goal, portfolioData, userAnswers);
      console.log('✅ Fallback analysis complete -', fallbackAnalysis.bundles.length, 'bundles generated');
      console.log('Fallback bundles:', fallbackAnalysis.bundles.map(b => ({
        id: b.id,
        name: b.bundleName,
        tokenCount: b.tokens.length,
        tokens: b.tokens.map(t => t.serviceName)
      })));
      return fallbackAnalysis;
    }
  }

  // Goal parsing logic - extract amount and timeframe from natural language
  private parseGoal(goal: string): GoalAnalysis {
    console.log('🔍 Parsing goal:', goal);

    // Extract monetary amounts (e.g., $200, 200 dollars, 200$)
    const amountRegex = /\$?(\d+(?:,?\d{3})*(?:\.\d{2})?)\s*(?:dollars?|\$)?/i;
    const amountMatch = goal.match(amountRegex);
    const targetAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

    // Extract timeframes
    const timeframeRegex = /(next|this|in|within)\s+(week|month|day|year|(\d+)\s*(weeks?|months?|days?|years?))/i;
    const timeframeMatch = goal.match(timeframeRegex);

    let timeframe = 'this month';
    let timeframeDays = 30;

    if (timeframeMatch) {
      const fullMatch = timeframeMatch[0];
      timeframe = fullMatch;

      if (fullMatch.includes('week')) {
        timeframeDays = 7;
      } else if (fullMatch.includes('day')) {
        timeframeDays = 1;
      } else if (fullMatch.includes('month')) {
        timeframeDays = 30;
      } else if (fullMatch.includes('year')) {
        timeframeDays = 365;
      }

      // Handle numbered timeframes (e.g., "in 2 weeks")
      const numberMatch = fullMatch.match(/(\d+)/);
      if (numberMatch) {
        const multiplier = parseInt(numberMatch[1]);
        if (fullMatch.includes('week')) timeframeDays = multiplier * 7;
        else if (fullMatch.includes('month')) timeframeDays = multiplier * 30;
        else if (fullMatch.includes('day')) timeframeDays = multiplier;
        else if (fullMatch.includes('year')) timeframeDays = multiplier * 365;
      }
    }

    // Basic reality check - will be enhanced by AI analysis
    const dailyTarget = targetAmount / timeframeDays;
    const isRealistic = dailyTarget <= 500; // Basic threshold
    const realityScore = Math.min(10, Math.max(1, 10 - Math.floor(dailyTarget / 50)));

    return {
      targetAmount,
      timeframe,
      timeframeDays,
      isRealistic,
      realityScore
    };
  }

  // Build AI prompt for agentic mode analysis
  private buildAgenticPrompt(
    goal: string,
    goalAnalysis: GoalAnalysis,
    portfolioData: PortfolioData,
    userAnswers: UserAnswers
  ): string {
    const projects = portfolioData?.projectRecommendations || [];
    const userName = userAnswers?.name || 'User';
    const userExperience = userAnswers?.experience || 'intermediate';

    return `
You are an expert TokenizeAgent specialized in goal-driven token bundle creation with educational guidance. Your role is to help users achieve realistic income goals through strategic time tokenization.

USER PROFILE:
Name: ${userName}
Experience Level: ${userExperience}
Skills: ${userAnswers?.skills?.join(', ') || 'Not specified'}
Available Time: ${userAnswers?.timeAvailable || 'Not specified'} hours/week

USER GOAL: "${goal}"
Parsed Analysis:
- Target Amount: $${goalAnalysis.targetAmount}
- Timeframe: ${goalAnalysis.timeframe} (${goalAnalysis.timeframeDays} days)
- Daily Target: $${(goalAnalysis.targetAmount / goalAnalysis.timeframeDays).toFixed(2)}
- Initial Reality Score: ${goalAnalysis.realityScore}/10

AI-GENERATED PORTFOLIO:
${projects.map((service: any) => `
- ${service?.name || 'Service'}: ${service?.description || 'Professional service'}
  Estimated Budget: ${service?.estimatedBudget || '$5,000-10,000'}
  Duration: ${service?.duration || '4-6 weeks'}
  Required Skills: ${(service?.requiredSkills || []).join(', ')}
`).join('\n')}

MISSION - Create 3 Token Bundles:
1. CONSERVATIVE: Lower risk, achievable rates, higher success probability
2. BALANCED: Market-rate pricing, moderate risk/reward
3. AGGRESSIVE: Higher rates, requires strong positioning, higher risk

For each bundle, consider:
- User's experience level vs. proposed rates (be realistic!)
- Market demand for their skills
- Time constraints and availability
- Educational guidance for unrealistic expectations

RESPONSE FORMAT (JSON):
{
  "goalAnalysis": {
    "isRealistic": boolean,
    "realityScore": number (1-10),
    "educationalMessage": "Guidance if unrealistic",
    "adjustedGoal": {
      "amount": number,
      "timeframe": "string",
      "reasoning": "why adjusted"
    }
  },
  "bundles": [
    {
      "id": "conservative|balanced|aggressive",
      "bundleName": "Descriptive name",
      "description": "Strategy explanation",
      "strategy": "conservative|balanced|aggressive",
      "tokens": [
        {
          "id": "token-1",
          "serviceName": "Service name from portfolio",
          "description": "Service description",
          "suggestedPricePerHour": number,
          "suggestedTotalHours": number,
          "suggestedValidityDays": number,
          "reasoning": "Why these parameters",
          "marketDemand": "high|medium|low",
          "competitiveness": number (1-10),
          "estimatedRevenue": number,
          "priority": "high|medium|low",
          "category": "category",
          "tags": ["tag1", "tag2"]
        }
      ],
      "totalRevenue": number,
      "totalHours": number,
      "averageHourlyRate": number,
      "successProbability": number (1-10),
      "pros": ["advantage 1", "advantage 2"],
      "cons": ["limitation 1", "limitation 2"],
      "timeToComplete": "estimated time"
    }
  ],
  "recommendation": "Which bundle to choose and why",
  "educationalInsights": [
    "Learning point 1",
    "Market insight 2",
    "Growth advice 3"
  ]
}

IMPORTANT GUIDELINES:
- If user is "beginner" wanting $500/hour, educate about realistic rates ($25-50/hour)
- If goal is too aggressive, provide adjusted realistic alternative
- Focus on achievable outcomes that build towards larger goals
- Include specific educational messages for skill/rate mismatches
`;
  }

  private buildTokenizationPrompt(portfolioData: PortfolioData, userAnswers: UserAnswers): string {
    // Safely handle potentially undefined data
    const services = portfolioData?.projectRecommendations || [];
    const userName = userAnswers?.name || 'User';
    const userExperience = userAnswers?.experience || 'intermediate';
    const userGoals = userAnswers?.goals || 'Professional growth';

    return `
You are TokenizeAgent, an AI specialized in analyzing professional portfolios and creating optimal time token strategies for blockchain-based service marketplaces.

PORTFOLIO ANALYSIS:
User: ${userName}
Experience: ${userExperience}
Goals: ${userGoals}

AI-Generated Portfolio:
${services.map((service: any) => `
- ${service?.name || 'Service'}: ${service?.description || 'Professional service'}
  Required Skills: ${(service?.requiredSkills || []).join(', ')}
  Estimated Budget: ${service?.estimatedBudget || '$5,000-10,000'}
  Duration: ${service?.duration || '4-6 weeks'}
`).join('\n')}

TOKENIZATION MISSION:
1. Analyze each service for tokenization potential
2. Suggest optimal pricing, hours, and validity periods
3. Provide market-aware recommendations
4. Create a strategic launch order
5. Include revenue projections and risk assessment

RESPONSE FORMAT (JSON):
{
  "tokenSuggestions": [
    {
      "id": "unique-id",
      "serviceName": "Service Name",
      "description": "Clear service description",
      "suggestedPricePerHour": 150,
      "suggestedTotalHours": 40,
      "suggestedValidityDays": 90,
      "reasoning": "Why these parameters are optimal",
      "marketDemand": "high|medium|low",
      "competitiveness": 8,
      "estimatedRevenue": 6000,
      "priority": "high|medium|low",
      "category": "Service category",
      "tags": ["tag1", "tag2"]
    }
  ],
  "marketAnalysis": {
    "totalPotentialMarket": 50000,
    "averageHourlyRate": 125,
    "competitorCount": 15,
    "marketTrends": ["AI automation demand rising", "Remote work normalization"]
  },
  "aiInsights": [
    "Package consulting hours in 20-40 hour blocks for best conversion",
    "Price premium services 15-20% above market for exclusivity"
  ],
  "riskFactors": [
    "Market saturation in basic services",
    "Economic downturn affecting consulting budgets"
  ],
  "optimizationTips": [
    "Bundle complementary services for higher value",
    "Offer early-bird pricing for first 50 tokens"
  ]
}

Focus on creating 3-5 high-quality token suggestions that maximize revenue while maintaining market competitiveness. Consider seasonality, market trends, and the user's experience level.
    `;
  }

  private async callOpenAIAPI(prompt: string, task: 'tokenization' | 'agentic'): Promise<string> {
    const response = await fetch('/api/ai/tokenization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        prompt,
      })
    });

    console.log('📡 GPT API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ GPT API error details:', errorText);
      throw new Error(`GPT API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ GPT API response received');
    return data.text;
  }

  private parseTokenizationResponse(response: string): TokenizationPlan {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Transform to our TokenizationPlan structure
      const plan: TokenizationPlan = {
        totalServices: parsed.tokenSuggestions?.length || 0,
        estimatedTotalRevenue: parsed.tokenSuggestions?.reduce((sum: number, token: any) => sum + (token.estimatedRevenue || 0), 0) || 0,
        recommendedStartOrder: parsed.tokenSuggestions?.sort((a: any, b: any) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        }) || [],
        marketAnalysis: parsed.marketAnalysis || {
          totalPotentialMarket: 25000,
          averageHourlyRate: 100,
          competitorCount: 10,
          marketTrends: ['Remote work growth', 'AI integration demand']
        },
        aiInsights: parsed.aiInsights || ['Focus on high-value services first'],
        riskFactors: parsed.riskFactors || ['Market competition'],
        optimizationTips: parsed.optimizationTips || ['Test pricing with small batches']
      };

      return plan;
    } catch (error) {
      console.error('❌ Failed to parse tokenization response:', error);
      throw error;
    }
  }

  private getFallbackTokenizationPlan(portfolioData: PortfolioData, userAnswers: UserAnswers): TokenizationPlan {
    console.log('🔄 Using fallback tokenization plan...');

    // Safely handle potentially undefined services
    const services = portfolioData?.projectRecommendations || [];
    const fallbackSuggestions: TokenSuggestion[] = services.slice(0, 3).map((service: any, index: number) => ({
      id: `fallback-${index}`,
      serviceName: service?.name || `Service ${index + 1}`,
      description: service?.description || 'Professional service offering',
      suggestedPricePerHour: Math.round(this.extractHourlyRateFromBudget(service?.estimatedBudget) || 50) * 0.9, // 10% discount for tokens
      suggestedTotalHours: 20,
      suggestedValidityDays: 60,
      reasoning: `Based on project budget ${service?.estimatedBudget || '$5,000-10,000'} and duration ${service?.duration || '4-6 weeks'}`,
      marketDemand: 'medium' as 'high' | 'medium' | 'low',
      competitiveness: 7,
      estimatedRevenue: Math.round((this.extractHourlyRateFromBudget(service?.estimatedBudget) || 50) * 0.9 * 20),
      priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      category: (service?.requiredSkills && service.requiredSkills[0]) || 'Professional Services',
      tags: (service?.requiredSkills || ['Professional']).slice(0, 3)
    }));

    // If no services exist, create default ones
    if (fallbackSuggestions.length === 0) {
      fallbackSuggestions.push({
        id: 'default-1',
        serviceName: 'Consultation Service',
        description: 'Professional consultation and advisory services',
        suggestedPricePerHour: 75,
        suggestedTotalHours: 20,
        suggestedValidityDays: 60,
        reasoning: 'Standard consultation service based on market rates',
        marketDemand: 'medium',
        competitiveness: 7,
        estimatedRevenue: 1500,
        priority: 'high',
        category: 'Consulting',
        tags: ['Consulting', 'Advisory', 'Strategy']
      });
    }

    return {
      totalServices: fallbackSuggestions.length,
      estimatedTotalRevenue: fallbackSuggestions.reduce((sum, token) => sum + token.estimatedRevenue, 0),
      recommendedStartOrder: fallbackSuggestions,
      marketAnalysis: {
        totalPotentialMarket: 30000,
        averageHourlyRate: 85,
        competitorCount: 12,
        marketTrends: ['Digital transformation', 'Remote collaboration tools']
      },
      aiInsights: [
        'Start with your highest-demand service for best initial traction',
        'Price tokens 10-15% below hourly rate to encourage bulk purchases'
      ],
      riskFactors: [
        'Limited market data available',
        'Economic uncertainty affecting service demand'
      ],
      optimizationTips: [
        'Monitor token performance and adjust pricing',
        'Gather user feedback to refine service offerings'
      ]
    };
  }

  // Utility method to calculate token economics
  static calculateTokenEconomics(suggestion: TokenSuggestion) {
    const totalValue = suggestion.suggestedPricePerHour * suggestion.suggestedTotalHours;
    const discountFromHourly = ((100 - suggestion.suggestedPricePerHour) / 100) * suggestion.suggestedTotalHours;
    const breakEvenHours = Math.ceil(totalValue / suggestion.suggestedPricePerHour);

    return {
      totalTokenValue: totalValue,
      discountOffered: discountFromHourly,
      breakEvenPoint: breakEvenHours,
      profitMargin: (suggestion.estimatedRevenue / totalValue) * 100,
      dailyUtilization: suggestion.suggestedTotalHours / suggestion.suggestedValidityDays
    };
  }

  // Method to suggest optimal token pricing based on market conditions
  static suggestPricingStrategy(marketDemand: 'high' | 'medium' | 'low', hourlyRate: number) {
    const strategies = {
      high: {
        discountPercent: 5, // Minimal discount for high demand
        bulkMultiplier: 1.1,
        validityDays: 45 // Shorter validity for urgency
      },
      medium: {
        discountPercent: 10, // Moderate discount
        bulkMultiplier: 1.0,
        validityDays: 60
      },
      low: {
        discountPercent: 15, // Higher discount to attract buyers
        bulkMultiplier: 0.9,
        validityDays: 90 // Longer validity for flexibility
      }
    };

    const strategy = strategies[marketDemand];
    const tokenPrice = Math.round(hourlyRate * (100 - strategy.discountPercent) / 100);

    return {
      suggestedTokenPrice: tokenPrice,
      discountFromHourly: strategy.discountPercent,
      recommendedValidity: strategy.validityDays,
      bulkPricingMultiplier: strategy.bulkMultiplier
    };
  }

  // Parse AI response for agentic analysis
  private parseAgenticResponse(response: string, goalAnalysis: GoalAnalysis): AgenticAnalysis {
    try {
      console.log('📝 Parsing agentic AI response...');

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in agentic response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Enhance goal analysis with AI insights
      const enhancedGoalAnalysis: GoalAnalysis = {
        ...goalAnalysis,
        isRealistic: parsed.goalAnalysis?.isRealistic ?? goalAnalysis.isRealistic,
        realityScore: parsed.goalAnalysis?.realityScore ?? goalAnalysis.realityScore,
        educationalMessage: parsed.goalAnalysis?.educationalMessage,
        adjustedGoal: parsed.goalAnalysis?.adjustedGoal
      };

      const analysis: AgenticAnalysis = {
        goalAnalysis: enhancedGoalAnalysis,
        bundles: parsed.bundles || [],
        recommendation: parsed.recommendation || 'Choose the bundle that best fits your risk tolerance and timeline.',
        educationalInsights: parsed.educationalInsights || []
      };

      return analysis;
    } catch (error) {
      console.error('❌ Failed to parse agentic response:', error);
      throw error;
    }
  }

  // Fallback agentic analysis when AI fails
  private getFallbackAgenticAnalysis(
    goal: string,
    portfolioData: PortfolioData,
    userAnswers: UserAnswers
  ): AgenticAnalysis {
    console.log('🔄 Using fallback agentic analysis...');

    const goalAnalysis = this.parseGoal(goal);
    const services = portfolioData?.projectRecommendations || [];
    const userExperience = userAnswers?.experience || 'intermediate';

    // Create realistic bundles based on portfolio
    const bundles: TokenBundle[] = [];

    if (services.length > 0) {
      const baseService = services[0];
      const baseRate = this.extractHourlyRateFromBudget(baseService?.estimatedBudget) || 50;

      // Conservative bundle
      bundles.push({
        id: 'conservative',
        bundleName: 'Steady Growth Strategy',
        description: 'Lower risk approach with achievable rates',
        strategy: 'conservative',
        tokens: [{
          id: 'conservative-1',
          serviceName: baseService?.name || 'Professional Service',
          description: baseService?.description || 'Core service offering',
          suggestedPricePerHour: Math.round(baseRate * 0.8),
          suggestedTotalHours: Math.min(goalAnalysis.targetAmount / (baseRate * 0.8), 40),
          suggestedValidityDays: Math.max(goalAnalysis.timeframeDays, 30),
          reasoning: 'Conservative pricing to ensure market acceptance',
          marketDemand: 'medium',
          competitiveness: 7,
          estimatedRevenue: Math.round(baseRate * 0.8 * Math.min(goalAnalysis.targetAmount / (baseRate * 0.8), 40)),
          priority: 'high',
          category: baseService?.requiredSkills?.[0] || 'Professional',
          tags: baseService?.requiredSkills || ['Service']
        }],
        totalRevenue: Math.round(baseRate * 0.8 * Math.min(goalAnalysis.targetAmount / (baseRate * 0.8), 40)),
        totalHours: Math.min(goalAnalysis.targetAmount / (baseRate * 0.8), 40),
        averageHourlyRate: Math.round(baseRate * 0.8),
        successProbability: 8,
        pros: ['Lower risk', 'Easier to sell', 'Builds reputation'],
        cons: ['Lower revenue per hour', 'May take longer to reach goal'],
        timeToComplete: `${Math.ceil(Math.min(goalAnalysis.targetAmount / (baseRate * 0.8), 40) / 8)} working days`
      });

      // Balanced bundle with multiple tokens
      const balancedTokens: TokenSuggestion[] = [
        {
          id: 'balanced-1',
          serviceName: 'Full-Stack Development',
          description: 'Complete web application development',
          suggestedPricePerHour: baseRate,
          suggestedTotalHours: 15,
          suggestedValidityDays: goalAnalysis.timeframeDays,
          reasoning: 'Market-competitive pricing for full-stack work',
          marketDemand: 'high',
          competitiveness: 6,
          estimatedRevenue: Math.round(baseRate * 15),
          priority: 'high',
          category: 'Development',
          tags: ['Full-Stack', 'Web Development', 'Backend']
        },
        {
          id: 'balanced-2',
          serviceName: 'Technical Consulting',
          description: 'Provide technical guidance and architecture advice',
          suggestedPricePerHour: Math.round(baseRate * 1.1),
          suggestedTotalHours: 5,
          suggestedValidityDays: goalAnalysis.timeframeDays,
          reasoning: 'Premium pricing for consulting expertise',
          marketDemand: 'medium',
          competitiveness: 5,
          estimatedRevenue: Math.round(baseRate * 1.1 * 5),
          priority: 'medium',
          category: 'Consulting',
          tags: ['Consulting', 'Architecture', 'Strategy']
        }
      ];

      bundles.push({
        id: 'balanced',
        bundleName: 'Market Rate Strategy',
        description: 'Competitive market pricing',
        strategy: 'balanced',
        tokens: balancedTokens,
        totalRevenue: balancedTokens.reduce((sum, token) => sum + token.estimatedRevenue, 0),
        totalHours: balancedTokens.reduce((sum, token) => sum + token.suggestedTotalHours, 0),
        averageHourlyRate: Math.round(balancedTokens.reduce((sum, token) => sum + token.suggestedPricePerHour, 0) / balancedTokens.length),
        successProbability: 6,
        pros: ['Market competitive', 'Good balance of risk/reward'],
        cons: ['Moderate competition', 'Requires good positioning'],
        timeToComplete: `${Math.ceil(Math.min(goalAnalysis.targetAmount / baseRate, 35) / 8)} working days`
      });

      // Aggressive bundle with multiple tokens
      const aggressiveTokens: TokenSuggestion[] = [
        {
          id: 'aggressive-1',
          serviceName: 'Enterprise Architecture Design',
          description: 'Design scalable enterprise-level system architecture',
          suggestedPricePerHour: Math.round(baseRate * 1.5),
          suggestedTotalHours: 8,
          suggestedValidityDays: Math.max(goalAnalysis.timeframeDays - 7, 14),
          reasoning: 'Premium pricing for enterprise expertise',
          marketDemand: 'medium',
          competitiveness: 4,
          estimatedRevenue: Math.round(baseRate * 1.5 * 8),
          priority: 'high',
          category: 'Architecture',
          tags: ['Enterprise', 'Architecture', 'Premium']
        },
        {
          id: 'aggressive-2',
          serviceName: 'DevOps Implementation',
          description: 'Set up CI/CD pipelines and infrastructure automation',
          suggestedPricePerHour: Math.round(baseRate * 1.3),
          suggestedTotalHours: 6,
          suggestedValidityDays: Math.max(goalAnalysis.timeframeDays - 7, 14),
          reasoning: 'High-demand DevOps skills command premium rates',
          marketDemand: 'high',
          competitiveness: 5,
          estimatedRevenue: Math.round(baseRate * 1.3 * 6),
          priority: 'medium',
          category: 'DevOps',
          tags: ['DevOps', 'CI/CD', 'Infrastructure']
        }
      ];

      bundles.push({
        id: 'aggressive',
        bundleName: 'Premium Positioning Strategy',
        description: 'Higher rates requiring strong market position',
        strategy: 'aggressive',
        tokens: aggressiveTokens,
        totalRevenue: aggressiveTokens.reduce((sum, token) => sum + token.estimatedRevenue, 0),
        totalHours: aggressiveTokens.reduce((sum, token) => sum + token.suggestedTotalHours, 0),
        averageHourlyRate: Math.round(aggressiveTokens.reduce((sum, token) => sum + token.suggestedPricePerHour, 0) / aggressiveTokens.length),
        successProbability: 4,
        pros: ['Higher revenue per hour', 'Faster goal achievement'],
        cons: ['Higher risk', 'Requires strong portfolio', 'May be harder to sell'],
        timeToComplete: `${Math.ceil(Math.min(goalAnalysis.targetAmount / (baseRate * 1.3), 25) / 8)} working days`
      });
    }

    // Educational message for unrealistic goals
    let educationalMessage;
    if (goalAnalysis.realityScore < 5) {
      if (userExperience === 'beginner' && goalAnalysis.targetAmount / goalAnalysis.timeframeDays > 100) {
        educationalMessage = `As a beginner, aiming for $${(goalAnalysis.targetAmount / goalAnalysis.timeframeDays).toFixed(0)}/day is quite ambitious. Consider starting with smaller, achievable goals to build your reputation and gradually increase your rates.`;
      } else {
        educationalMessage = `Your goal of $${goalAnalysis.targetAmount} in ${goalAnalysis.timeframe} is ambitious. Consider extending the timeframe or reducing the target to increase success probability.`;
      }
    }

    return {
      goalAnalysis: {
        ...goalAnalysis,
        educationalMessage,
        adjustedGoal: goalAnalysis.realityScore < 5 ? {
          amount: Math.round(goalAnalysis.targetAmount * 0.6),
          timeframe: `${goalAnalysis.timeframeDays + 14} days`,
          reasoning: 'Adjusted for more realistic timeline and market conditions'
        } : undefined
      },
      bundles,
      recommendation: goalAnalysis.realityScore >= 7 ?
        'Your goal appears achievable. Consider the Balanced strategy for the best risk/reward ratio.' :
        'Your goal is ambitious. Start with the Conservative strategy to build momentum.',
      educationalInsights: [
        'Start with lower rates to build reputation, then gradually increase',
        'Focus on delivering excellent results to justify higher future rates',
        'Consider the time required for client acquisition and project completion'
      ]
    };
  }

  // Helper method to extract hourly rate from budget string
  private extractHourlyRateFromBudget(budgetString?: string): number | null {
    if (!budgetString) return null;

    // Extract numbers from budget string like "$5,000-10,000" or "$85,000-120,000"
    const numbers = budgetString.match(/\d+,?\d+/g);
    if (!numbers || numbers.length === 0) return null;

    // Get the average of the range or use single value
    const amounts = numbers.map(n => parseInt(n.replace(',', '')));
    const avgBudget = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;

    // Estimate hourly rate based on typical project duration (assume 4-8 weeks, 20-40 hours/week)
    const estimatedHours = 120; // Conservative estimate: 6 weeks * 20 hours/week
    return Math.round(avgBudget / estimatedHours);
  }
}

export default TokenizeAgent;
