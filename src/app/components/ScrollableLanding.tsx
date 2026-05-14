'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import ChainSwitcher from './ChainSwitcher';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';

interface ScrollableLandingProps {
  onGetStarted?: () => void;
}

const CodeBlock = ({ children, className = "", language = "javascript", animate = true }: {
  children: string;
  className?: string;
  language?: string;
  animate?: boolean;
}) => {
  const codeRef = useRef<HTMLElement>(null);
  const [displayedCode, setDisplayedCode] = useState('');
  const [isAnimating, setIsAnimating] = useState(animate);

  // Glitch characters for the animation
  const glitchChars = '!@#$%^&*()_+-=[]{}|;:,.<>?~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  useEffect(() => {
    if (!animate) {
      setDisplayedCode(children);
      return;
    }

    setIsAnimating(true);
    const targetCode = children;
    const animationDuration = 2000; // 2 seconds
    const updateInterval = 50; // Update every 50ms
    const totalSteps = animationDuration / updateInterval;
    let currentStep = 0;

    const animationInterval = setInterval(() => {
      currentStep++;
      const progress = currentStep / totalSteps;

      // Calculate how many characters should be "resolved" at this point
      const resolvedLength = Math.floor(targetCode.length * progress);

      let newCode = '';

      for (let i = 0; i < targetCode.length; i++) {
        if (i < resolvedLength) {
          // Character is resolved - show the actual character
          newCode += targetCode[i];
        } else if (targetCode[i] === ' ' || targetCode[i] === '\n' || targetCode[i] === '\t') {
          // Preserve whitespace and newlines
          newCode += targetCode[i];
        } else {
          // Character is still glitching - show random character
          newCode += glitchChars[Math.floor(Math.random() * glitchChars.length)];
        }
      }

      setDisplayedCode(newCode);

      if (currentStep >= totalSteps) {
        clearInterval(animationInterval);
        setDisplayedCode(targetCode);
        setIsAnimating(false);
      }
    }, updateInterval);

    return () => clearInterval(animationInterval);
  }, [children, animate]);

  useEffect(() => {
    if (codeRef.current && !isAnimating) {
      Prism.highlightElement(codeRef.current);
    }
  }, [displayedCode, language, isAnimating]);

  useEffect(() => {
    // Override Prism CSS for pure black background
    const style = document.createElement('style');
    style.textContent = `
      .language-javascript,
      .language-typescript,
      pre[class*="language-"],
      code[class*="language-"] {
        background: transparent !important;
      }
      pre[class*="language-"]::-moz-selection,
      pre[class*="language-"] ::-moz-selection,
      code[class*="language-"]::-moz-selection,
      code[class*="language-"] ::-moz-selection {
        background: rgba(255, 255, 255, 0.2) !important;
      }
      pre[class*="language-"]::selection,
      pre[class*="language-"] ::selection,
      code[class*="language-"]::selection,
      code[class*="language-"] ::selection {
        background: rgba(255, 255, 255, 0.2) !important;
      }
      .glitch-animation {
        color: #00ff00;
        text-shadow: 0 0 5px #00ff00;
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className={`bg-black/90 rounded-lg p-6 border border-green-500/30 font-mono text-sm overflow-x-auto ${className}`}>
      <pre style={{ background: 'transparent', margin: 0, padding: 0 }}>
        <code
          ref={codeRef}
          className={`language-${language} ${isAnimating ? 'glitch-animation' : ''}`}
          style={{ background: 'transparent' }}
        >
          {displayedCode}
        </code>
      </pre>
    </div>
  );
};

const TechFeature = ({ icon, title, description, code }: {
  icon: string;
  title: string;
  description: string;
  code: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300"
    >
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
      <p className="text-white/70 mb-6 leading-relaxed">{description}</p>
      <CodeBlock language="javascript" animate={isInView}>{code}</CodeBlock>
    </motion.div>
  );
};

const CallToActionCode = () => {
  const codeRef = useRef(null);
  const codeInView = useInView(codeRef, { once: true, margin: "-100px" });

  return (
    <div ref={codeRef}>
      <CodeBlock className="mb-12" language="javascript" animate={codeInView}>
        {`// Your journey starts here
const future = await tokenizeTime({
  you: "skilled_professional",
  liquidity: "uniswap_v4",
  ai: "gpt_5_5",
  result: "financial_freedom"
});

console.log("Welcome to the future of work! 🚀");`}
      </CodeBlock>
    </div>
  );
};

const WorkflowStep = ({ item, index }: { item: any; index: number }) => {
  const stepRef = useRef(null);
  const stepInView = useInView(stepRef, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={stepRef}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.2 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 border border-white/20">
        <span className="text-2xl font-bold text-white font-mono">{item.step}</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
      <p className="text-white/70 mb-6">{item.description}</p>
      <CodeBlock className="text-xs" language="javascript" animate={stepInView}>
        {`// Step ${item.step}\n${item.code}`}
      </CodeBlock>
    </motion.div>
  );
};

export default function ScrollableLanding({ onGetStarted }: ScrollableLandingProps) {
  const { isConnected, address } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Parallax transforms
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  // Pre-define workflow steps to avoid recreation
  const workflowSteps = [
    {
      step: "01",
      title: "Profile Creation",
      description: "AI analyzes your skills and creates a personalized profile",
      code: "await createProfile(skills)"
    },
    {
      step: "02",
      title: "Token Generation",
      description: "Smart contracts deploy your time tokens to the blockchain",
      code: "const token = mint(profile)"
    },
    {
      step: "03",
      title: "Marketplace",
      description: "Start earning as clients purchase your tokenized time",
      code: "earnings += token.sales()"
    }
  ];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0">
          {/* Grid Pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `radial-gradient(circle at ${mousePosition.x / 10}px ${mousePosition.y / 10}px, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
            }}
          />

          {/* Floating Orbs */}
          <motion.div
            className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, 100, 0],
              y: [0, 50, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div
            className="absolute top-3/4 right-1/4 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl"
            animate={{
              x: [0, -80, 0],
              y: [0, -60, 0],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <motion.section
          className="min-h-screen flex items-center justify-center px-8"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          <div className="text-center max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-8"
            >
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold text-white mb-6 leading-tight">
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Your time,
                </span>
                <br />
                <span className="text-white">Your token</span>
              </h1>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mb-12"
            >
              <p className="text-xl md:text-2xl text-white/80 mb-8 leading-relaxed max-w-3xl mx-auto">
                Transform your expertise into tradeable time tokens. Built on blockchain,
                powered by AI, designed for the future of work.
              </p>

              <CodeBlock className="max-w-2xl mx-auto text-left" language="javascript" animate={true}>
                {`// Initialize your time tokenization
const timeToken = await createToken({
  service: "AI Development",
  hourlyRate: 100,
  availability: "20 hours/week",
  blockchain: "Avalanche",
  expires: "30 days"
});

console.log(\`Token created: \${timeToken.id}\`);
// → Token created: TT-2024-0001`}
              </CodeBlock>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center items-center"
            >
              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => (
                    <button
                      onClick={openConnectModal}
                      disabled={!mounted}
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-12 py-4 rounded-xl text-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-purple-500/25"
                    >
                      🚀 Start Tokenizing
                    </button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <ChainSwitcher />
                  <button
                    onClick={onGetStarted}
                    className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300"
                  >
                    Continue to App
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </motion.section>

        {/* Features Section */}
        <section className="py-32 px-8">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                Powered by <span className="font-mono text-green-400">Code</span>
              </h2>
              <p className="text-xl text-white/70 max-w-3xl mx-auto">
                Advanced technology stack enabling seamless time tokenization
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <TechFeature
                icon="🤖"
                title="AI-Powered Portfolio"
                description="Advanced AI agents analyze your skills and create personalized tokenization strategies using LLM technology."
                code={`// AI Agent analyzing your profile
const agent = new GPTPortfolioAgent({
  model: "gpt-5.5",
  expertise: userAnswers.skills,
  goal: "optimize_tokenization"
});

const strategy = await agent.generateStrategy({
  experience: "5+ years",
  skills: ["React", "AI", "Blockchain"],
  availability: "20h/week"
});`}
              />

              <TechFeature
                icon="⛓️"
                title="Uniswap v4 Liquidity"
                description="Use ERC-20 TIME credits, BookingManager inventory, and v4 TIME/USDC liquidity as separate protocol layers."
                code={`// Route through the credit market
const bookingIntent = {
  providerId,
  hoursWad,
  quoteId,
  buyer
};

await swapAndBookRouter.swapThenBook({
  pool: "TIME/USDC",
  hookData: encodeHookData(bookingIntent)
});`}
              />

              <TechFeature
                icon="📊"
                title="Real-time Analytics"
                description="Track token performance, earnings, and market trends with comprehensive dashboard analytics."
                code={`// Real-time token analytics
const analytics = await getTokenAnalytics({
  tokenId: "TT-2024-0001",
  metrics: [
    "earnings", "sold_hours", 
    "completion_rate", "reviews"
  ]
});

console.log(analytics);
// → { earnings: 2500, sold_hours: 25, ... }`}
              />

              <TechFeature
                icon="🔒"
                title="Smart Contracts"
                description="Secure, audited smart contracts handle all token transactions with built-in escrow and dispute resolution."
                code={`// Smart contract interaction
contract TimeToken is ERC1155 {
  function purchaseHours(
    uint256 tokenId,
    uint256 hours
  ) external payable {
    require(isActive[tokenId], "Token inactive");
    require(hours <= available[tokenId], "Insufficient hours");
    
    _transfer(hours, msg.sender, tokenId);
    emit HoursPurchased(tokenId, hours, msg.sender);
  }
}`}
              />
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-32 px-8 bg-black/20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
                <span className="font-mono text-blue-400">process</span>.workflow()
              </h2>
              <p className="text-xl text-white/70">
                Simple steps to tokenize your expertise
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {workflowSteps.map((item, index) => (
                <WorkflowStep key={`workflow-step-${index}`} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-32 px-8">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
                Ready to <span className="font-mono text-green-400">deploy</span>?
              </h2>
              <p className="text-xl text-white/70 mb-12">
                Join the future of work. Start tokenizing your time today.
              </p>

              <CallToActionCode />

              {!isConnected ? (
                <ConnectButton.Custom>
                  {({ openConnectModal, mounted }) => (
                    <button
                      onClick={openConnectModal}
                      disabled={!mounted}
                      className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-16 py-5 rounded-xl text-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-green-500/25"
                    >
                      Initialize Token 🚀
                    </button>
                  )}
                </ConnectButton.Custom>
              ) : (
                <button
                  onClick={onGetStarted}
                  className="bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white px-16 py-5 rounded-xl text-2xl font-bold transition-all duration-300 transform hover:scale-105 shadow-2xl hover:shadow-green-500/25"
                >
                  Launch App 🚀
                </button>
              )}
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
