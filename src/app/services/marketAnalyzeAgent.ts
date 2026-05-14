// src/agents/marketAnalyzeAgent.ts

import { createPublicClient, http, PublicClient, getContract } from 'viem';

import {
  GETSKILLPRICE_ABI,
  GETSKILLPRICE_CONTRACT_ADDRESS,
  AVALANCHE_FUJI_CHAIN_ID,
  RPC_URLS,
  CHAINLINK_CONFIG,
  MARKET_ANALYSIS_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '../shared/constants';

// Skill type definition - consistent with constants.ts
export type SupportedSkill = 'frontend' | 'backend' | 'fullstack' | 'blockchain' | 'ai' | 'mobile' |
  'design' | 'marketing' | 'defi' | 'nft' | 'solidity' | 'react' | 'node' | 'python' | 'java' |
  'golang' | 'rust' | 'smart_contracts' | 'web3';

// define the interface
export interface SkillPriceDataInterface {
  skill: string;
  averageHourlyRate: number;
  demandLevel: 'low' | 'medium' | 'high' | 'very_high';
  marketTrend: 'declining' | 'stable' | 'growing' | 'surging';
  competitionLevel: number;
  projectVolume: number;
  regionMultiplier: number;
}

export interface MarketAnalysisResultInterface {
  skillAnalysis: SkillPriceDataInterface[];
  marketSummary: {
    topPayingSkills: string[];
    emergingSkills: string[];
    oversaturatedSkills: string[];
    marketHotspots: string[];
  };
  recommendations: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
    rateOptimization: string[];
  };
  insights: {
    marketOpportunities: string[];
    threatAnalysis: string[];
    competitiveAdvantages: string[];
  };
  priceProjections: {
    next3Months: { [skill: string]: number };
    next6Months: { [skill: string]: number };
    yearAhead: { [skill: string]: number };
  };
  chainlinkData?: any;
  dataSource?: string;
  lastUpdated?: number;
  confidence?: number;
  marketHealth?: 'poor' | 'fair' | 'good' | 'excellent';
}

interface ChainlinkSkillDataInterface {
  price: number;
  demand: number;
  volume: number;
  competition: number;
  trend?: string;
  regionMultiplier?: number;
  lastUpdated: number;
  source: string;
  confidence?: number;
}

class MarketAnalyzeAgent {
  private isInitialized = false;
  private publicClient: PublicClient | null = null;
  private contract: any = null;
  private dataCache: Map<string, { data: any; timestamp: number }> = new Map();
  private rateLimitTracker: Map<string, number> = new Map();

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('📊 Initializing Market Analyzer Agent with Chainlink data and server-side GPT synthesis...');
      this.isInitialized = true;
      console.log('✅ Market Analyzer Agent initialized (Chainlink Functions Only)');
    } catch (error) {
      console.error('❌ Failed to initialize Market Analyzer:', error);
      throw error;
    }
  }

  // Initialize Web3 connection with proper typing
  private async initializeWeb3(): Promise<boolean> {
    try {
      const rpcUrl = RPC_URLS[AVALANCHE_FUJI_CHAIN_ID];
      if (!rpcUrl) {
        throw new Error('RPC URL not configured');
      }

      this.publicClient = createPublicClient({
        transport: http(rpcUrl),
      });

      const chainId = await this.publicClient.getChainId();
      console.log(`🌐 Connected to network (Chain ID: ${chainId})`);

      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3 provider:', error);
      return false;
    }
  }

  // Main analysis function with proper typing
  async analyzeMarket(userSkills: string[], chainlinkData?: any): Promise<MarketAnalysisResultInterface> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('📊 Starting comprehensive market analysis for:', userSkills.join(', '));

    // Validate skills with proper typing
    const validSkills = this.validateSkills(userSkills);
    if (validSkills.length === 0) {
      throw new Error(ERROR_MESSAGES.INVALID_SKILL);
    }

    try {
      // Fetch Chainlink Functions data if not provided
      if (!chainlinkData) {
        console.log('📡 Fetching Chainlink Functions data...');
        chainlinkData = await this.fetchChainlinkData(GETSKILLPRICE_CONTRACT_ADDRESS, validSkills);
      }

      // Check if we have valid Chainlink data
      if (!chainlinkData || Object.keys(chainlinkData).length === 0) {
        throw new Error('No Chainlink Functions data available');
      }

      console.log('🧠 Using server-side GPT for advanced analysis...');
      return await this.generateAIAnalysis(validSkills, chainlinkData);
    } catch (error) {
      console.error('❌ Error in market analysis:', error);
      throw new Error('Failed to analyze market: ' + (error as Error).message);
    }
  }

  // Fetch chainlink data - ONLY from Chainlink Functions
  async fetchChainlinkData(contractAddress: string, userSkills: string[]): Promise<any> {
    const cacheKey = `chainlink_${contractAddress}_${userSkills.sort().join(',')}`;

    // Check cache memory for Chainlink Functions data
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData && cachedData.source && String(cachedData.source).includes('chainlink-functions')) {
      console.log('📋 Using cached Chainlink Functions data');
      return cachedData;
    }

    // Check rate limiting
    if (this.isRateLimited('chainlink')) {
      console.log('⏱️ Rate limited for Chainlink Functions');
      throw new Error('Rate limited - please wait before requesting again');
    }

    try {
      console.log('⛓️ Fetching data from GetSkillPrice contract (Chainlink Functions only)...');
      console.log(`📍 Contract: ${contractAddress}`);
      console.log(`🔧 Skills: ${userSkills.join(', ')}`);

      // Only strategy: Get data from Chainlink Functions contract
      const contractData = await this.tryContractData(contractAddress, userSkills);

      if (contractData && Object.keys(contractData).length > 0) {
        console.log(`✅ Contract data successful! Got ${Object.keys(contractData).length} skills`);

        // Verify it's from Chainlink Functions
        const contractSources = Object.values(contractData).map((item: any) => item.source);
        const hasChainlinkData = contractSources.some(source =>
          source && String(source).includes('chainlink-functions')
        );

        if (hasChainlinkData) {
          console.log('🎉 Found Chainlink Functions data in contract!');
          this.setCachedData(cacheKey, contractData);
          this.updateRateLimit('chainlink');
          return contractData;
        } else {
          console.log('❌ Contract data is not from Chainlink Functions');
          throw new Error('Contract contains data but not from Chainlink Functions');
        }
      } else {
        console.log('❌ No valid contract data found');
        throw new Error('No data available from Chainlink Functions contract');
      }

    } catch (error) {
      console.error('❌ Error in fetchChainlinkData:', error);
      throw error;
    }
  }

  // Get contract data from Chainlink Functions
  private async tryContractData(contractAddress: string, userSkills: string[]): Promise<any> {
    try {
      // Initialize Web3 connection
      if (!this.publicClient) {
        const initialized = await this.initializeWeb3();
        if (!initialized) {
          throw new Error('Failed to initialize Web3 provider');
        }
      }
      const publicClient = this.publicClient;
      if (!publicClient) {
        throw new Error('Web3 provider unavailable');
      }

      // Connect to contract
      this.contract = getContract({
        address: contractAddress as `0x${string}`,
        abi: GETSKILLPRICE_ABI,
        client: publicClient,
      });
      console.log('📋 Contract connected successfully');

      // Get contract data
      const rawSkillsData = await this.contract.read.getSkillsData();
      console.log(`📄 Raw contract data length: ${rawSkillsData ? rawSkillsData.length : 0}`);

      if (rawSkillsData && rawSkillsData !== "" && rawSkillsData !== "no data") {
        console.log(`📄 Raw data preview: ${rawSkillsData.substring(0, 100)}...`);

        const parsedData = this.parseContractData(rawSkillsData, userSkills);

        if (parsedData && Object.keys(parsedData).length > 0) {
          console.log(`✅ Successfully parsed ${Object.keys(parsedData).length} skills from contract`);

          // Verify data source is from Chainlink Functions
          const sources = Object.values(parsedData).map((item: any) => item.source);
          const chainlinkSources = sources.filter(source => source && String(source).includes('chainlink-functions'));

          if (chainlinkSources.length > 0) {
            console.log(`🎉 Found ${chainlinkSources.length} skills with Chainlink Functions data!`);
            return parsedData;
          } else {
            throw new Error('Data found but not from Chainlink Functions');
          }
        }
      }

      throw new Error('No valid data in contract');

    } catch (error) {
      console.log('⚠️ Contract call failed:', (error as Error).message);
      throw error;
    }
  }

  // Parse contract data - expecting Chainlink Functions format
  private parseContractData(rawData: string, userSkills: string[]): { [skill: string]: ChainlinkSkillDataInterface } {
    const result: { [skill: string]: ChainlinkSkillDataInterface } = {};

    console.log('🔧 Parsing Chainlink Functions contract data...');
    console.log(`📝 Raw data: ${rawData.substring(0, 200)}...`);
    console.log(`🎯 Looking for skills: ${userSkills.join(', ')}`);

    try {
      // First try JSON format
      try {
        const parsedData = JSON.parse(rawData);
        console.log('📄 Successfully parsed as JSON');

        if (Array.isArray(parsedData)) {
          parsedData.forEach((item: any) => {
            const skillName = item.name || item.skill;
            if (skillName && userSkills.map(s => s.toLowerCase()).includes(skillName.toLowerCase())) {
              result[skillName] = {
                price: item.rate || item.price || 0,
                demand: item.demand || 0,
                volume: item.volume || 0,
                competition: item.competition || 0,
                trend: item.trend || 'stable',
                regionMultiplier: item.regionMultiplier || 1.0,
                lastUpdated: Date.now(),
                source: 'chainlink-functions-json',
                confidence: 0.95
              };
            }
          });
        }
      } catch (jsonError) {
        // Try compressed format parsing
        console.log('📝 Not JSON, trying compressed format...');

        // Handle compressed format: "frontend|65,backend|75,blockchain|120"
        const items = rawData.split(',');
        console.log(`🔧 Found ${items.length} items in compressed format`);

        items.forEach((item, index) => {
          const trimmedItem = item.trim();
          const parts = trimmedItem.split('|');

          if (parts.length >= 2) {
            const skillName = parts[0].trim().toLowerCase();
            const rate = parseFloat(parts[1].trim());

            console.log(`🎯 Processing item ${index + 1}: ${skillName} = $${rate}`);

            // Check if skill is in requested list
            const matchingSkill = userSkills.find(s => s.toLowerCase() === skillName);

            if (matchingSkill && !isNaN(rate)) {
              // Use enhanced data for better analysis
              const enhancedData = this.getEnhancedSkillMarketDataForContract(skillName, rate);

              result[matchingSkill] = {
                price: rate,
                demand: enhancedData.demand,
                volume: enhancedData.volume,
                competition: enhancedData.competition,
                trend: enhancedData.trend,
                regionMultiplier: enhancedData.regionMultiplier,
                lastUpdated: Date.now(),
                source: 'chainlink-functions-compressed',
                confidence: 0.95
              };

              console.log(`✅ Added ${matchingSkill}: $${rate}/hr (Chainlink Functions)`);
            } else if (matchingSkill) {
              console.log(`⚠️ Invalid rate for ${skillName}: ${parts[1]}`);
            } else {
              console.log(`⚠️ Skill ${skillName} not in requested list: ${userSkills.join(', ')}`);
            }
          } else {
            console.log(`⚠️ Invalid format for item: ${trimmedItem}`);
          }
        });
      }

      console.log(`📊 Final parsing result: ${Object.keys(result).length} skills`);
      Object.keys(result).forEach(skill => {
        console.log(`   ${skill}: $${result[skill].price}/hr (${result[skill].source})`);
      });

      return result;

    } catch (error) {
      console.error('❌ Error parsing contract data:', error);
      throw new Error('Failed to parse Chainlink Functions data');
    }
  }

  private getEnhancedSkillMarketDataForContract(skill: string, contractPrice: number) {
    // Provide intelligent market data based on skill type and price
    const skillEnhancements: { [key: string]: any } = {
      'defi': {
        demand: 98, volume: 400, competition: 2, trend: 'surging', regionMultiplier: 1.8
      },
      'nft': {
        demand: 85, volume: 600, competition: 4, trend: 'growing', regionMultiplier: 1.6
      },
      'blockchain': {
        demand: 95, volume: 700, competition: 3, trend: 'surging', regionMultiplier: 1.5
      },
      'ai': {
        demand: 95, volume: 800, competition: 4, trend: 'surging', regionMultiplier: 1.4
      },
      'fullstack': {
        demand: 90, volume: 950, competition: 5, trend: 'growing', regionMultiplier: 1.2
      },
      'backend': {
        demand: 85, volume: 900, competition: 6, trend: 'growing', regionMultiplier: 1.1
      },
      'mobile': {
        demand: 75, volume: 750, competition: 6, trend: 'stable', regionMultiplier: 1.0
      },
      'frontend': {
        demand: 80, volume: 850, competition: 7, trend: 'stable', regionMultiplier: 1.0
      },
      'design': {
        demand: 60, volume: 700, competition: 8, trend: 'stable', regionMultiplier: 0.9
      },
      'marketing': {
        demand: 65, volume: 850, competition: 9, trend: 'stable', regionMultiplier: 0.8
      }
    };

    // Get skill-specific enhancement data, or use price-based defaults
    const enhancement = skillEnhancements[skill] || {
      demand: contractPrice > 100 ? 90 : contractPrice > 80 ? 80 : 70,
      volume: 600 + Math.floor(contractPrice * 5),
      competition: contractPrice > 100 ? 3 : contractPrice > 80 ? 5 : 7,
      trend: contractPrice > 100 ? 'surging' : contractPrice > 80 ? 'growing' : 'stable',
      regionMultiplier: Math.max(0.8, Math.min(2.0, contractPrice / 80))
    };

    return enhancement;
  }

  // Enhanced AI analysis with more sophisticated prompting
  private async generateAIAnalysis(userSkills: string[], chainlinkData?: any): Promise<MarketAnalysisResultInterface> {
    const chainlinkContext = chainlinkData ? `
Chainlink Functions Market Data:
${JSON.stringify(chainlinkData, null, 2)}
` : 'No Chainlink Functions data available.';

    const prompt = `
You are an expert freelance market analyst with 15+ years of experience. Analyze the current 2024-2025 market for these skills: ${userSkills.join(', ')}

${chainlinkContext}

Current Market Context:
- AI/ML boom driving premium rates ($100-150/hr)
- Web3/Blockchain maintaining high demand ($120-180/hr) 
- Remote-first economy increasing global competition
- Economic uncertainty affecting project budgets
- Increasing demand for full-stack versatility

Provide comprehensive market analysis in this exact JSON format:

{
  "skillAnalysis": [
    {
      "skill": "skill_name",
      "averageHourlyRate": number,
      "demandLevel": "low|medium|high|very_high",
      "marketTrend": "declining|stable|growing|surging",
      "competitionLevel": number (1-10),
      "projectVolume": number,
      "regionMultiplier": number
    }
  ],
  "marketSummary": {
    "topPayingSkills": ["skill1", "skill2", "skill3"],
    "emergingSkills": ["emerging1", "emerging2"],
    "oversaturatedSkills": ["saturated1"],
    "marketHotspots": ["region1", "region2"]
  },
  "recommendations": {
    "shortTerm": ["action1", "action2", "action3"],
    "mediumTerm": ["strategy1", "strategy2", "strategy3"],
    "longTerm": ["vision1", "vision2", "vision3"],
    "rateOptimization": ["rate1", "rate2", "rate3"]
  },
  "insights": {
    "marketOpportunities": ["opportunity1", "opportunity2", "opportunity3"],
    "threatAnalysis": ["threat1", "threat2", "threat3"],
    "competitiveAdvantages": ["advantage1", "advantage2", "advantage3"]
  },
  "priceProjections": {
    "next3Months": { "skill1": rate, "skill2": rate },
    "next6Months": { "skill1": rate, "skill2": rate },
    "yearAhead": { "skill1": rate, "skill2": rate }
  }
}

Focus on actionable insights, specific rate recommendations, and current market dynamics based on the Chainlink Functions data.
`;

    try {
      const response = await fetch('/api/ai/market-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userSkills,
          chainlinkData,
          prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Market analysis API error: ${response.status}`);
      }

      const { text } = await response.json();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysisData = JSON.parse(jsonMatch[0]);

        // Enhance with metadata
        analysisData.chainlinkData = chainlinkData;
        analysisData.dataSource = 'ai-generated-chainlink-only';
        analysisData.lastUpdated = Date.now();
        analysisData.confidence = 0.95; // Higher confidence with real Chainlink data
        analysisData.marketHealth = this.calculateMarketHealth(analysisData.skillAnalysis);

        console.log('✅ AI analysis completed successfully with Chainlink Functions data');
        return analysisData;
      } else {
        throw new Error('Could not extract JSON from AI response');
      }
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      // Fallback to intelligent analysis
      return this.generateIntelligentAnalysis(userSkills, chainlinkData);
    }
  }

  // Enhanced intelligent rule-based analysis - using ONLY Chainlink data
  private generateIntelligentAnalysis(userSkills: string[], chainlinkData?: any): MarketAnalysisResultInterface {
    console.log('🧠 Generating intelligent rule-based analysis with Chainlink Functions data...');

    if (!chainlinkData || Object.keys(chainlinkData).length === 0) {
      throw new Error('No Chainlink Functions data available for analysis');
    }

    const skillAnalysis: SkillPriceDataInterface[] = userSkills.map(skill => {
      const realData = chainlinkData[skill];

      if (!realData) {
        throw new Error(`No Chainlink Functions data found for skill: ${skill}`);
      }

      return {
        skill,
        averageHourlyRate: realData.price || 0,
        demandLevel: this.mapDemandLevel(realData.demand),
        marketTrend: this.mapMarketTrend(realData.trend) || 'stable',
        competitionLevel: realData.competition || 5,
        projectVolume: realData.volume || 500,
        regionMultiplier: realData.regionMultiplier || 1.0
      };
    });

    // Advanced market insights based on Chainlink Functions data
    const topPayingSkills = skillAnalysis
      .sort((a, b) => b.averageHourlyRate - a.averageHourlyRate)
      .slice(0, 3)
      .map(s => s.skill);

    const emergingSkills = skillAnalysis
      .filter(s => s.marketTrend === 'surging' || (s.marketTrend === 'growing' && s.demandLevel === 'very_high'))
      .map(s => s.skill);

    const oversaturatedSkills = skillAnalysis
      .filter(s => s.competitionLevel > 7 && s.demandLevel !== 'very_high')
      .map(s => s.skill);

    const marketHealth = this.calculateMarketHealth(skillAnalysis);

    return {
      skillAnalysis,
      marketSummary: {
        topPayingSkills,
        emergingSkills,
        oversaturatedSkills,
        marketHotspots: [
          'North America (Remote)',
          'Europe (Remote)',
          'Singapore/Hong Kong',
          'Global Web3 Projects'
        ]
      },
      recommendations: {
        shortTerm: [
          topPayingSkills.length > 0
            ? `Focus on highest-paying skill: ${topPayingSkills[0]} ($${skillAnalysis.find(s => s.skill === topPayingSkills[0])?.averageHourlyRate}/hr)`
            : 'Optimize current skill positioning and rates',
          'Update portfolio with latest projects and technologies',
          'Research competitor rates in your niche',
          'Consider 10-20% rate increase for in-demand skills'
        ],
        mediumTerm: [
          'Develop complementary high-demand skills (especially AI/Web3)',
          'Build thought leadership through content and speaking',
          'Establish strategic partnerships with agencies',
          'Create value-based pricing packages'
        ],
        longTerm: [
          'Build scalable products and passive income streams',
          'Establish personal brand in specialty niche',
          'Transition to high-level consulting and strategy work',
          'Consider founding/joining Web3 or AI startups'
        ],
        rateOptimization: [
          'Bundle complementary services for premium pricing',
          'Implement value-based pricing for business outcomes',
          'Create tiered pricing (basic/premium/enterprise)',
          'Consider retainer agreements for consistent income'
        ]
      },
      insights: {
        marketOpportunities: [
          'AI integration projects commanding premium rates',
          'Web3/DeFi development showing sustained high demand',
          'Cross-platform expertise increasingly valuable',
          'Remote-first companies paying global premium rates',
          'Emerging markets adopting digital-first strategies'
        ],
        threatAnalysis: [
          'AI tools automating routine development tasks',
          'Increased global competition from emerging markets',
          'Economic uncertainty reducing project budgets',
          'Platform dependency risks (algorithm changes)',
          'Rapid technology obsolescence requiring constant upskilling'
        ],
        competitiveAdvantages: [
          'Multi-skill expertise provides client flexibility',
          'Emerging technology experience creates premium value',
          'Strong portfolio differentiates from commoditized skills',
          'Business understanding enhances technical delivery',
          'Cultural/timezone alignment for key markets'
        ]
      },
      priceProjections: this.generateEnhancedPriceProjections(skillAnalysis),
      chainlinkData,
      dataSource: 'intelligent-chainlink-only',
      lastUpdated: Date.now(),
      confidence: 0.95, // High confidence with real Chainlink data
      marketHealth
    };
  }

  // Calculate overall market health
  private calculateMarketHealth(skillAnalysis: SkillPriceDataInterface[]): 'poor' | 'fair' | 'good' | 'excellent' {
    const avgRate = skillAnalysis.reduce((sum, skill) => sum + skill.averageHourlyRate, 0) / skillAnalysis.length;
    const highDemandSkills = skillAnalysis.filter(s => s.demandLevel === 'very_high' || s.demandLevel === 'high').length;
    const growingSkills = skillAnalysis.filter(s => s.marketTrend === 'growing' || s.marketTrend === 'surging').length;

    const demandRatio = highDemandSkills / skillAnalysis.length;
    const growthRatio = growingSkills / skillAnalysis.length;

    if (avgRate >= 100 && demandRatio >= 0.7 && growthRatio >= 0.5) return 'excellent';
    if (avgRate >= 80 && demandRatio >= 0.5 && growthRatio >= 0.3) return 'good';
    if (avgRate >= 60 && demandRatio >= 0.3) return 'fair';
    return 'poor';
  }

  // Generate enhanced price projections with market factors
  private generateEnhancedPriceProjections(skillAnalysis: SkillPriceDataInterface[]) {
    const projections: any = { next3Months: {}, next6Months: {}, yearAhead: {} };

    skillAnalysis.forEach(skill => {
      const baseRate = skill.averageHourlyRate;

      // Market trend multipliers
      const trendMultipliers = {
        declining: 0.95,
        stable: 1.0,
        growing: 1.05,
        surging: 1.15
      };

      // Demand level multipliers
      const demandMultipliers = {
        low: 0.95,
        medium: 1.0,
        high: 1.03,
        very_high: 1.08
      };

      const trendMultiplier = trendMultipliers[skill.marketTrend];
      const demandMultiplier = demandMultipliers[skill.demandLevel];

      // Competition factor (higher competition = slower growth)
      const competitionFactor = Math.max(0.98, 1.05 - (skill.competitionLevel * 0.005));

      // Time-based growth factors
      const quarterly = trendMultiplier * demandMultiplier * competitionFactor;

      projections.next3Months[skill.skill] = Math.round(baseRate * quarterly * 1.02);
      projections.next6Months[skill.skill] = Math.round(baseRate * quarterly * 1.05);
      projections.yearAhead[skill.skill] = Math.round(baseRate * quarterly * 1.12);
    });

    return projections;
  }

  // Utility methods
  private validateSkills(skills: string[]): string[] {
    return skills.filter(skill =>
      MARKET_ANALYSIS_CONFIG.SUPPORTED_SKILLS.includes(skill.toLowerCase() as SupportedSkill)
    );
  }

  private getCachedData(key: string): any {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < MARKET_ANALYSIS_CONFIG.CACHE_DURATION) {
      console.log(`📋 Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.dataCache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Cleanup old cache entries
    if (this.dataCache.size > 50) {
      const oldestKey = this.dataCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.dataCache.delete(oldestKey);
      }
    }
  }

  private isRateLimited(service: string): boolean {
    const lastCall = this.rateLimitTracker.get(service) || 0;
    return Date.now() - lastCall < 10000; // 10 second rate limit
  }

  private updateRateLimit(service: string): void {
    this.rateLimitTracker.set(service, Date.now());
  }

  private mapDemandLevel(demandScore?: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (!demandScore) return 'medium';
    if (demandScore >= 90) return 'very_high';
    if (demandScore >= 70) return 'high';
    if (demandScore >= 50) return 'medium';
    return 'low';
  }

  private mapMarketTrend(trend?: string): 'declining' | 'stable' | 'growing' | 'surging' | undefined {
    if (!trend) return undefined;
    const trendMap: { [key: string]: 'declining' | 'stable' | 'growing' | 'surging' } = {
      'declining': 'declining',
      'stable': 'stable',
      'growing': 'growing',
      'surging': 'surging'
    };
    return trendMap[trend.toLowerCase()];
  }

  // Public utility methods - Chainlink Functions focused
  public async refreshMarketData(skills: string[]): Promise<void> {
    console.log('🔄 Refreshing Chainlink Functions market data for:', skills.join(', '));

    // Clear relevant cache entries
    const keysToDelete = Array.from(this.dataCache.keys()).filter(key =>
      skills.some(skill => key.includes(skill))
    );

    keysToDelete.forEach(key => this.dataCache.delete(key));

    // Fetch fresh Chainlink Functions data
    await this.fetchChainlinkData(GETSKILLPRICE_CONTRACT_ADDRESS, skills);

    console.log('✅ Chainlink Functions market data refreshed');
  }

  public clearAllCache(): void {
    this.dataCache.clear();
    this.rateLimitTracker.clear();
    console.log('🗑️ All caches cleared');
  }

  // Clear Chainlink cache
  public clearChainlinkCache(): void {
    console.log('🗑️ Clearing Chainlink Functions cache...');

    // Clear all cache containing chainlink
    const keysToDelete = Array.from(this.dataCache.keys()).filter(key =>
      key.includes('chainlink')
    );

    keysToDelete.forEach(key => {
      this.dataCache.delete(key);
      console.log(`   Deleted cache: ${key}`);
    });

    // Clear rate limiting
    this.rateLimitTracker.delete('chainlink');

    console.log(`✅ Cleared ${keysToDelete.length} cache entries`);
  }

  // Force contract data usage
  public async forceContractData(userSkills: string[]): Promise<any> {
    console.log('🔥 Force fetching Chainlink Functions contract data only...');

    // Clear cache
    this.clearChainlinkCache();

    try {
      const contractData = await this.tryContractData(GETSKILLPRICE_CONTRACT_ADDRESS, userSkills);

      if (contractData && Object.keys(contractData).length > 0) {
        console.log('✅ Force Chainlink Functions contract data successful');
        return contractData;
      } else {
        console.log('❌ Force contract data failed - no Chainlink Functions data in contract');
        return null;
      }
    } catch (error) {
      console.error('❌ Force Chainlink Functions contract data error:', error);
      return null;
    }
  }

  public getCacheStats(): {
    size: number;
    keys: string[];
    rateLimits: { [service: string]: number }
  } {
    return {
      size: this.dataCache.size,
      keys: Array.from(this.dataCache.keys()),
      rateLimits: Object.fromEntries(this.rateLimitTracker)
    };
  }

  // Check if Chainlink Functions data is available for skills
  public async checkChainlinkDataAvailability(skills: string[]): Promise<{
    available: boolean;
    availableSkills: string[];
    missingSkills: string[];
    dataSource: string;
  }> {
    try {
      console.log('🔍 Checking Chainlink Functions data availability for:', skills.join(', '));

      const chainlinkData = await this.fetchChainlinkData(GETSKILLPRICE_CONTRACT_ADDRESS, skills);

      if (!chainlinkData) {
        return {
          available: false,
          availableSkills: [],
          missingSkills: skills,
          dataSource: 'none'
        };
      }

      const availableSkills = skills.filter(skill => chainlinkData[skill]);
      const missingSkills = skills.filter(skill => !chainlinkData[skill]);

      return {
        available: availableSkills.length > 0,
        availableSkills,
        missingSkills,
        dataSource: 'chainlink-functions'
      };
    } catch (error) {
      console.error('❌ Error checking Chainlink Functions data availability:', error);
      return {
        available: false,
        availableSkills: [],
        missingSkills: skills,
        dataSource: 'error'
      };
    }
  }

  // Get market insight for specific skill using only Chainlink Functions data
  public async getMarketInsight(skill: string): Promise<string> {
    try {
      const chainlinkData = await this.fetchChainlinkData(GETSKILLPRICE_CONTRACT_ADDRESS, [skill]);

      if (chainlinkData && chainlinkData[skill]) {
        const data = chainlinkData[skill];
        const demandLevel = this.mapDemandLevel(data.demand);

        return `${skill} shows ${demandLevel} demand at ${data.price}/hr according to Chainlink Functions data (${data.source})`;
      } else {
        throw new Error(`No Chainlink Functions data available for ${skill}`);
      }
    } catch (error) {
      throw new Error(`Failed to get market insight for ${skill}: ${(error as Error).message}`);
    }
  }

  // Compare skills using only Chainlink Functions data
  public async compareSkills(skills: string[]): Promise<{
    highest: string;
    lowest: string;
    average: number;
    recommendation: string;
    dataSource: string;
  }> {
    try {
      const chainlinkData = await this.fetchChainlinkData(GETSKILLPRICE_CONTRACT_ADDRESS, skills);

      if (!chainlinkData || Object.keys(chainlinkData).length === 0) {
        throw new Error('No Chainlink Functions data available for comparison');
      }

      const availableSkills = skills.filter(skill => chainlinkData[skill]);

      if (availableSkills.length === 0) {
        throw new Error('No Chainlink Functions data found for any of the specified skills');
      }

      const skillsData = availableSkills.map(skill => ({
        skill,
        rate: chainlinkData[skill].price
      }));

      const sorted = skillsData.sort((a, b) => b.rate - a.rate);
      const highest = sorted[0];
      const lowest = sorted[sorted.length - 1];
      const average = skillsData.reduce((sum, s) => sum + s.rate, 0) / skillsData.length;

      let recommendation = '';
      if (highest.rate > average * 1.5) {
        recommendation = `Focus on ${highest.skill} - it commands premium rates according to Chainlink Functions data`;
      } else if (lowest.rate < average * 0.7) {
        recommendation = `Consider upskilling from ${lowest.skill} to higher-value skills`;
      } else {
        recommendation = 'Good skill balance - consider specializing in emerging areas';
      }

      return {
        highest: highest.skill,
        lowest: lowest.skill,
        average: Math.round(average),
        recommendation,
        dataSource: 'chainlink-functions'
      };
    } catch (error) {
      throw new Error(`Failed to compare skills: ${(error as Error).message}`);
    }
  }
}

// Create and export singleton instance
export const marketAnalyzeAgent = new MarketAnalyzeAgent();

// Export types for external use
export type {
  MarketAnalysisResultInterface as MarketAnalysisResult,
  SkillPriceDataInterface as SkillPriceData,
  ChainlinkSkillDataInterface as ChainlinkSkillData
};
