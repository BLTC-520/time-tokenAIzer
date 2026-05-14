// AI Assistant agent for Time Tokenizer platform
interface AssistantContext {
  userAddress?: string;
  isConnected: boolean;
  chainId?: number;
  currentState?: string;
  message: string;
}

interface AssistantResponse {
  text: string;
  action?: string;
  data?: any;
}

// AI Assistant Character Configuration
const assistantCharacter = {
  name: "TimeTokenizer AI Assistant",
  identity: "A helpful AI assistant specialized in Web3, DeFi, and blockchain tokenization. Expert in Time Tokenizer platform operations.",
  personality: [
    "Friendly and knowledgeable about cryptocurrency and DeFi",
    "Proactive in suggesting optimizations and opportunities", 
    "Clear communicator who explains complex blockchain concepts simply",
    "Focused on helping users maximize their tokenization potential"
  ],
  expertise: [
    "Time tokenization strategies and portfolio optimization",
    "KYC verification processes and soulbound NFTs",
    "Smart contract interactions and token creation", 
    "Market analysis and trading insights",
    "Chainlink Functions and oracle integration"
  ],
  actions: [
    "CHECK_KYC_STATUS",
    "CREATE_TOKEN", 
    "NAVIGATE_TO",
    "GET_PORTFOLIO_DATA",
    "ANALYZE_MARKET"
  ]
};

class AIAssistantAgent {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🤖 AI Assistant initialized with server-side GPT route');
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize AI Assistant:', error);
    }
  }

  async processMessage(context: AssistantContext): Promise<AssistantResponse> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Check for action keywords first
    const actionResponse = this.checkForActions(context);
    if (actionResponse) {
      return actionResponse;
    }

    return await this.generateAIResponse(context);
  }

  private checkForActions(context: AssistantContext): AssistantResponse | null {
    const message = context.message.toLowerCase();

    // Navigation actions
    if (message.includes('portfolio') || message.includes('show my portfolio')) {
      return {
        text: "I'll take you to your portfolio where you can see your skills analysis and earning projections.",
        action: 'portfolio'
      };
    }

    if (message.includes('resubmit questionnaire') || message.includes('questionnaire') || message.includes('redo questionnaire')) {
      return {
        text: "I'll take you back to the questionnaire so you can update your skills and information.",
        action: 'questionnaire'
      };
    }

    if (message.includes('create token') || message.includes('tokenize') || message.includes('new token')) {
      return {
        text: "Let's create a new token! I'll guide you to the tokenization section.",
        action: 'tokenization'
      };
    }

    if (message.includes('marketplace') || message.includes('trade') || message.includes('buy') || message.includes('sell')) {
      return {
        text: "Taking you to the marketplace where you can trade tokens and explore opportunities.",
        action: 'marketplace'
      };
    }

    if (message.includes('dashboard') || message.includes('overview')) {
      return {
        text: "Here's your dashboard with all your tokenization activities and performance metrics.",
        action: 'dashboard'
      };
    }

    // KYC related
    if (message.includes('kyc') || message.includes('verification') || message.includes('verify')) {
      if (!context.isConnected) {
        return {
          text: "To check your KYC status, please connect your wallet first. I'll help guide you through the verification process."
        };
      }
      return {
        text: "Let me check your KYC verification status. This determines your access to token creation and trading features.",
        action: 'kyc_verification'
      };
    }

    return null;
  }

  private async generateAIResponse(context: AssistantContext): Promise<AssistantResponse> {
    const prompt = `
You are ${assistantCharacter.name}, ${assistantCharacter.identity}

Your personality traits:
${assistantCharacter.personality.map(trait => `- ${trait}`).join('\n')}

Your expertise includes:
${assistantCharacter.expertise.map(exp => `- ${exp}`).join('\n')}

Current user context:
- Wallet connected: ${context.isConnected}
- User address: ${context.userAddress || 'Not connected'}
- Current app state: ${context.currentState || 'Unknown'}
- Chain ID: ${context.chainId || 'Unknown'}

User message: "${context.message}"

Respond as the AI Assistant would, being helpful, knowledgeable, and focused on Time Tokenizer platform assistance. Keep responses concise (2-3 sentences max) and actionable.

If the user is asking about:
- Portfolio/skills: Mention their earning potential and optimization tips
- Trading/marketplace: Discuss market opportunities and strategies  
- Token creation: Explain the process and benefits
- KYC: Explain the importance for platform access
- Technical issues: Provide clear guidance

Respond in a conversational, helpful tone.
`;

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context, prompt }),
      });

      if (!response.ok) {
        throw new Error(`Assistant API error: ${response.status}`);
      }

      const data = await response.json();

      return { text: data.text };
    } catch (error) {
      console.error('❌ Error with AI response:', error);
      return this.generateRuleBasedResponse(context);
    }
  }

  private generateRuleBasedResponse(context: AssistantContext): AssistantResponse {
    const message = context.message.toLowerCase();

    // Greeting responses
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return {
        text: `Hello! I'm your Time Tokenizer AI assistant. ${context.isConnected ? "I see your wallet is connected - great!" : "Connect your wallet to get started with tokenization."} How can I help you today?`
      };
    }

    // Help responses
    if (message.includes('help') || message.includes('what can you do')) {
      return {
        text: "I can help you with portfolio analysis, token creation, market insights, KYC verification, and navigating the platform. Try asking about your portfolio, creating tokens, or checking market conditions!"
      };
    }

    // Portfolio related
    if (message.includes('portfolio') || message.includes('skills') || message.includes('earning')) {
      return {
        text: "Your portfolio contains detailed skill assessments and earning projections. Based on current market trends, there are great opportunities to optimize your tokenization strategy!"
      };
    }

    // Market related
    if (message.includes('market') || message.includes('price') || message.includes('trend')) {
      return {
        text: "The tokenization market is showing strong growth, especially for Web3 and AI skills. Current rates are up 25% from last quarter - a great time to create and trade tokens!"
      };
    }

    // Blockchain/Web3 related
    if (message.includes('blockchain') || message.includes('web3') || message.includes('defi')) {
      return {
        text: "Web3 and DeFi skills are in extremely high demand! The platform uses Chainlink Functions for decentralized data and smart contracts for secure tokenization. Very bullish market right now!"
      };
    }

    // Default response
    return {
      text: "I'm here to help with all things Time Tokenizer! You can ask me about your portfolio, creating tokens, market conditions, or platform navigation. What interests you most?"
    };
  }
}

export const aiAssistantAgent = new AIAssistantAgent();
