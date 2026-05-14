// Client-side portfolio agent facade. GPT execution happens in Next API routes.
import type { PortfolioData, UserAnswers } from '../types/portfolio';

const portfolioMakerConfig = {
  name: "GPT Portfolio Maker",
  identity: "An expert AI agent specialized in creating personalized time tokenization portfolios and booking-aware time market strategies.",
  expertise: [
    "Expert in freelance market analysis and career optimization",
    "Specialized in Web3, blockchain, and emerging technology careers", 
    "15+ years experience in talent assessment and portfolio development",
    "AI-powered insights for maximizing earning potential",
    "Proven track record in matching skills to high-value projects"
  ],
  knowledge: [
    "Current freelance market rates across all major skills",
    "Emerging technology trends and their impact on careers",
    "Web3 and blockchain project requirements and compensation",
    "Time management and productivity optimization techniques",
    "Portfolio presentation and personal branding strategies"
  ]
};

class PortfolioAgent {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🤖 Initializing GPT Portfolio Maker Agent...');
      console.log(`Agent Identity: ${portfolioMakerConfig.identity}`);
      console.log(`Agent Expertise: ${portfolioMakerConfig.expertise.length} areas`);
      this.isInitialized = true;
      console.log('✅ GPT Portfolio Maker Agent initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize portfolio agent:', error);
      throw error;
    }
  }

  async generatePortfolio(userAnswers: UserAnswers): Promise<PortfolioData> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔍 GPT Portfolio Agent analyzing user profile...');
    console.log(`Analyzing ${userAnswers.name}'s skills: ${userAnswers.skills.join(', ')}`);
    
    try {
      return await this.generateAIPortfolio(userAnswers);
    } catch (error) {
      console.error('❌ Error generating portfolio with GPT:', error);
      console.log('🔄 Falling back to intelligent simulation...');
      return this.generateFallbackPortfolio(userAnswers);
    }
  }

  private async generateAIPortfolio(userAnswers: UserAnswers): Promise<PortfolioData> {
    const prompt = `
You are the Portfolio Maker, an expert GPT agent specialized in creating personalized time tokenization portfolios and career optimization strategies.

Your identity: ${portfolioMakerConfig.identity}

Your expertise includes:
${portfolioMakerConfig.expertise.map(item => `- ${item}`).join('\n')}

Your knowledge covers:
${portfolioMakerConfig.knowledge.map(item => `- ${item}`).join('\n')}

Analyze the following user profile and create a comprehensive time tokenization portfolio:

User Profile:
- Name: ${userAnswers.name}
- Experience Level: ${userAnswers.experience}
- Skills: ${userAnswers.skills.join(', ')}
- Time Available: ${userAnswers.timeAvailable} hours/week
- Goals: ${userAnswers.goals}
- Preferred Projects: ${userAnswers.preferredProjects.join(', ')}
- Desired Hourly Rate: $${userAnswers.hourlyRate}/hour

Generate a detailed portfolio analysis in JSON format with these exact fields:
{
  "profileSummary": "A comprehensive professional summary (2-3 sentences)",
  "skillAssessment": [
    {
      "skill": "skill name",
      "level": number (70-98),
      "marketDemand": number (80-100),
      "insights": "specific market insight for this skill"
    }
  ],
  "projectRecommendations": [
    {
      "name": "project name",
      "description": "detailed project description",
      "match": number (85-98),
      "estimatedBudget": "$X,XXX-XX,XXX",
      "duration": "X-X weeks",
      "requiredSkills": ["skill1", "skill2", "skill3"]
    }
  ],
  "earningsProjection": {
    "weekly": number,
    "monthly": number,
    "yearly": number,
    "optimizationTips": ["tip1", "tip2", "tip3"]
  },
  "timeOptimization": {
    "bestWorkingHours": "optimal working schedule",
    "productivityTips": ["tip1", "tip2", "tip3"],
    "timeManagementAdvice": "comprehensive time management guidance"
  },
  "careerRoadmap": {
    "shortTerm": ["goal1", "goal2", "goal3"],
    "mediumTerm": ["goal1", "goal2", "goal3"],
    "longTerm": ["goal1", "goal2", "goal3"]
  }
}

Focus on:
- Current market rates and trends (especially Web3/AI if relevant)
- Realistic but optimistic projections
- Actionable, specific advice
- Premium opportunities matching their skill level
- Emerging technology integration opportunities

Provide detailed, market-aware insights based on 2024 freelance market conditions.
`;

    try {
      console.log('🤖 Portfolio Agent requesting server-side GPT analysis...');
      const response = await fetch('/api/ai/portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userAnswers, prompt }),
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Portfolio API error: ${response.status} - ${details}`);
      }

      const portfolioData = await response.json();
      console.log('✅ GPT-generated portfolio parsed successfully');
      return portfolioData;
    } catch (error) {
      console.error('❌ Error with GPT portfolio generation:', error);
      console.log('🔄 Switching to intelligent simulation...');
      return this.generateIntelligentPortfolio(userAnswers);
    }
  }

  private generateIntelligentPortfolio(userAnswers: UserAnswers): PortfolioData {
    // Local deterministic analysis keeps the demo usable without server AI credentials.
    const isWeb3Focused = userAnswers.skills.some(skill => 
      ['blockchain', 'ai', 'fullstack', 'frontend'].includes(skill)
    );
    
    const experienceMultiplier = {
      'beginner': 1.0,
      'intermediate': 1.3,
      'advanced': 1.6,
      'expert': 2.0
    }[userAnswers.experience] || 1.0;

    const skillAssessment = userAnswers.skills.map(skill => ({
      skill,
      level: Math.min(Math.floor(Math.random() * 25 + 70) * experienceMultiplier, 98),
      marketDemand: Math.floor(Math.random() * 15 + 85),
      insights: this.generateSkillInsight(skill, isWeb3Focused)
    }));

    const timeMap: { [key: string]: number } = {
      '5-10': 7.5, '10-20': 15, '20-30': 25, '30+': 35
    };
    
    const rateMap: { [key: string]: number } = {
      '10-25': 17.5, '25-50': 37.5, '50-100': 75, '100+': 125
    };
    
    const hours = timeMap[userAnswers.timeAvailable] || 15;
    const baseRate = rateMap[userAnswers.hourlyRate] || 37.5;
    const adjustedRate = isWeb3Focused ? baseRate * 1.4 : baseRate;
    const weeklyEarnings = Math.round(hours * adjustedRate * experienceMultiplier);

    return {
      profileSummary: this.generateProfileSummary(userAnswers, isWeb3Focused),
      skillAssessment,
      projectRecommendations: this.generateProjects(userAnswers, isWeb3Focused),
      earningsProjection: {
        weekly: weeklyEarnings,
        monthly: Math.round(weeklyEarnings * 4.33),
        yearly: Math.round(weeklyEarnings * 4.33 * 12),
        optimizationTips: this.generateOptimizationTips(isWeb3Focused, userAnswers.skills)
      },
      timeOptimization: {
        bestWorkingHours: "9 AM - 1 PM for deep work, 2 PM - 6 PM for collaboration",
        productivityTips: [
          "Use time-blocking for focused development sessions",
          "Batch similar tasks to maintain flow state",
          "Schedule client communications during specific hours"
        ],
        timeManagementAdvice: "Prioritize high-value tasks during peak energy hours and automate routine processes to maximize billable time efficiency."
      },
      careerRoadmap: {
        shortTerm: [
          "Complete 2-3 high-quality projects to build portfolio",
          `Increase hourly rate by ${isWeb3Focused ? '40%' : '25%'} within 3 months`,
          "Establish presence in relevant tech communities"
        ],
        mediumTerm: [
          "Develop specialized expertise in emerging technologies",
          "Build recurring client relationships",
          "Launch personal brand and thought leadership"
        ],
        longTerm: [
          "Transition to premium consulting rates ($150-300/hour)",
          "Create passive income through products/courses",
          "Mentor others and scale through team building"
        ]
      }
    };
  }

  private generateSkillInsight(skill: string, isWeb3Focused: boolean): string {
    const insights: { [key: string]: string } = {
      frontend: isWeb3Focused ? "Frontend + Web3 integration skills are commanding 60% higher rates in the current market." : "React and modern frontend frameworks remain in high demand across all industries.",
      backend: "Backend development with cloud expertise is essential for scalable applications.",
      blockchain: "Blockchain development is experiencing explosive growth with average rates of $100-200/hour.",
      ai: "AI/ML integration skills are becoming must-have capabilities across all tech sectors.",
      fullstack: "Full-stack developers with Web3 experience are among the highest-paid freelancers currently.",
      mobile: "Mobile development continues strong demand, especially with cross-platform expertise.",
      design: "UI/UX design with Web3 experience is highly sought after in the crypto space.",
      marketing: "Digital marketing with blockchain/crypto expertise offers premium positioning opportunities."
    };
    
    return insights[skill] || `${skill} expertise positions you well for diverse project opportunities.`;
  }

  private generateProfileSummary(userAnswers: UserAnswers, isWeb3Focused: boolean): string {
    const web3Mention = isWeb3Focused ? " with strong Web3 and blockchain capabilities" : "";
    const experienceDesc = {
      'beginner': 'emerging',
      'intermediate': 'skilled',
      'advanced': 'seasoned',
      'expert': 'highly experienced'
    }[userAnswers.experience] || 'talented';

    return `${userAnswers.name} is a ${experienceDesc} professional${web3Mention}, specializing in ${userAnswers.skills.slice(0, 3).join(', ')}. With ${userAnswers.timeAvailable} hours available weekly and clear goals around ${userAnswers.goals.slice(0, 80)}..., they are exceptionally well-positioned for high-value project opportunities in the current market. Their skill combination and experience level indicate strong potential for ${isWeb3Focused ? 'premium Web3' : 'competitive tech'} project rates.`;
  }

  private generateProjects(userAnswers: UserAnswers, isWeb3Focused: boolean): Array<{
    name: string;
    description: string;
    match: number;
    estimatedBudget: string;
    duration: string;
    requiredSkills: string[];
  }> {
    if (isWeb3Focused) {
      return [
        {
          name: "DeFi Yield Farming Platform",
          description: "Build next-generation decentralized finance applications with advanced yield optimization and smart contract security",
          match: 96,
          estimatedBudget: "$25,000-40,000",
          duration: "8-12 weeks",
          requiredSkills: userAnswers.skills.slice(0, 3)
        },
        {
          name: "NFT Marketplace with AI Integration",
          description: "Create intelligent NFT platform with recommendation engine, social features, and dynamic pricing algorithms",
          match: 92,
          estimatedBudget: "$30,000-50,000", 
          duration: "10-14 weeks",
          requiredSkills: userAnswers.skills.slice(0, 4)
        },
        {
          name: "Cross-Chain Bridge Protocol",
          description: "Develop secure cross-chain asset transfer protocol with user-friendly interface and real-time liquidity optimization",
          match: 88,
          estimatedBudget: "$35,000-60,000",
          duration: "12-16 weeks",
          requiredSkills: userAnswers.skills.slice(0, 3)
        },
        {
          name: "Decentralized Social Media DApp",
          description: "Build a Web3 social platform with token incentives, decentralized storage, and community governance features",
          match: 93,
          estimatedBudget: "$22,000-38,000",
          duration: "9-13 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 2), "React", "IPFS"]
        },
        {
          name: "GameFi P2E Trading Platform",
          description: "Create play-to-earn gaming ecosystem with NFT assets, token economics, and tournament management system",
          match: 87,
          estimatedBudget: "$28,000-45,000",
          duration: "11-15 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 3), "Gaming APIs"]
        },
        {
          name: "DAO Governance & Treasury Management",
          description: "Develop comprehensive DAO platform with proposal voting, treasury tracking, and member analytics dashboard",
          match: 91,
          estimatedBudget: "$20,000-32,000",
          duration: "7-10 weeks",
          requiredSkills: userAnswers.skills.slice(0, 4)
        }
      ];
    } else {
      return [
        {
          name: "Enterprise SaaS Dashboard",
          description: "Build comprehensive analytics platform for enterprise clients with real-time data visualization and advanced reporting",
          match: 94,
          estimatedBudget: "$15,000-25,000",
          duration: "6-8 weeks",
          requiredSkills: userAnswers.skills.slice(0, 3)
        },
        {
          name: "AI-Powered E-commerce Platform",
          description: "Create intelligent e-commerce solution with personalization engine, inventory optimization, and predictive analytics",
          match: 89,
          estimatedBudget: "$20,000-35,000", 
          duration: "8-12 weeks",
          requiredSkills: userAnswers.skills.slice(0, 4)
        },
        {
          name: "Healthcare Management System",
          description: "Develop HIPAA-compliant patient management platform with telemedicine features and appointment scheduling",
          match: 86,
          estimatedBudget: "$18,000-28,000",
          duration: "7-10 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 2), "Security", "Compliance"]
        },
        {
          name: "FinTech Mobile Banking App",
          description: "Build secure mobile banking solution with biometric authentication, expense tracking, and investment portfolio management",
          match: 92,
          estimatedBudget: "$25,000-40,000",
          duration: "10-14 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 3), "Mobile Security"]
        },
        {
          name: "IoT Fleet Management Platform",
          description: "Create comprehensive IoT dashboard for vehicle tracking, maintenance scheduling, and driver performance analytics",
          match: 88,
          estimatedBudget: "$22,000-35,000",
          duration: "9-12 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 2), "IoT", "Data Analytics"]
        },
        {
          name: "EdTech Learning Management System",
          description: "Develop interactive online learning platform with video streaming, progress tracking, and AI-powered personalized learning paths",
          match: 85,
          estimatedBudget: "$16,000-26,000",
          duration: "8-11 weeks",
          requiredSkills: [...userAnswers.skills.slice(0, 3), "Video APIs"]
        }
      ];
    }
  }

  private generateOptimizationTips(isWeb3Focused: boolean, _skills: string[]): string[] {
    const baseTips = [
      "Build a strong GitHub portfolio showcasing your best work",
      "Develop case studies highlighting project outcomes and ROI"
    ];
    
    if (isWeb3Focused) {
      return [
        "Focus on Web3 projects for 40-60% higher rates than traditional tech",
        "Build expertise in emerging protocols for premium positioning",
        ...baseTips
      ];
    }
    
    return [
      "Consider adding AI/ML integration to existing skill set",
      "Explore blockchain integration opportunities in your domain",
      ...baseTips
    ];
  }

  private generateFallbackPortfolio(userAnswers: UserAnswers): PortfolioData {
    // Fallback portfolio generation logic
    const skillAssessment = userAnswers.skills.map(skill => ({
      skill,
      level: Math.floor(Math.random() * 30) + 70,
      marketDemand: Math.floor(Math.random() * 20) + 80,
      insights: `${skill} is currently in high demand with strong market growth projected.`
    }));

    const timeMap: { [key: string]: number } = {
      '5-10': 7.5, '10-20': 15, '20-30': 25, '30+': 35
    };
    
    const rateMap: { [key: string]: number } = {
      '10-25': 17.5, '25-50': 37.5, '50-100': 75, '100+': 125
    };
    
    const hours = timeMap[userAnswers.timeAvailable] || 15;
    const rate = rateMap[userAnswers.hourlyRate] || 37.5;
    const weeklyEarnings = Math.round(hours * rate);

    return {
      profileSummary: `${userAnswers.name} is a ${userAnswers.experience} professional with expertise in ${userAnswers.skills.slice(0, 3).join(', ')}. With ${userAnswers.timeAvailable} hours available weekly and goals focused on ${userAnswers.goals.slice(0, 100)}..., they are well-positioned for high-value project opportunities.`,
      skillAssessment,
      projectRecommendations: [
        {
          name: "DeFi Protocol Development",
          description: "Build next-generation decentralized finance applications",
          match: 94,
          estimatedBudget: "$15,000-25,000",
          duration: "6-8 weeks",
          requiredSkills: userAnswers.skills.slice(0, 3)
        },
        {
          name: "AI-Powered Web3 Platform",
          description: "Create intelligent blockchain-based solutions",
          match: 89,
          estimatedBudget: "$20,000-35,000", 
          duration: "8-12 weeks",
          requiredSkills: userAnswers.skills.slice(0, 4)
        }
      ],
      earningsProjection: {
        weekly: weeklyEarnings,
        monthly: Math.round(weeklyEarnings * 4.33),
        yearly: Math.round(weeklyEarnings * 4.33 * 12),
        optimizationTips: [
          "Focus on Web3 projects for 40% higher rates",
          "Build a portfolio showcasing AI integration",
          "Consider retainer-based agreements for steady income"
        ]
      },
      timeOptimization: {
        bestWorkingHours: "9 AM - 1 PM for deep work, 2 PM - 6 PM for collaboration",
        productivityTips: [
          "Use time-blocking for focused development sessions",
          "Batch similar tasks to maintain flow state",
          "Schedule client communications during specific hours"
        ],
        timeManagementAdvice: "Prioritize high-value tasks during peak energy hours and automate routine processes to maximize billable time efficiency."
      },
      careerRoadmap: {
        shortTerm: [
          "Complete 2-3 high-quality projects to build portfolio",
          "Increase hourly rate by 25% within 3 months",
          "Establish presence in Web3 communities"
        ],
        mediumTerm: [
          "Develop specialized expertise in emerging tech",
          "Build recurring client relationships",
          "Launch personal brand and thought leadership"
        ],
        longTerm: [
          "Transition to premium consulting rates",
          "Create passive income through products/courses",
          "Mentor others and scale through team building"
        ]
      }
    };
  }
}

export const portfolioAgent = new PortfolioAgent();
export type { PortfolioData, UserAnswers };
