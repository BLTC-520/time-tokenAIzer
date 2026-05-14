'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { portfolioAgent } from '../services/openaiPortfolioAgent';
import type { PortfolioData } from '../types/portfolio';

interface UserAnswers {
  name: string;
  experience: string;
  skills: string[];
  timeAvailable: string;
  goals: string;
  preferredProjects: string[];
  hourlyRate: string;
}

interface ProcessingStateProps {
  userAnswers: UserAnswers;
  onComplete: (portfolioData: PortfolioData) => void;
}

const processingSteps = [
  { id: 1, title: 'Analyzing your skills', description: 'Understanding your unique capabilities', duration: 2000 },
  { id: 2, title: 'Matching opportunities', description: 'Finding projects that align with your goals', duration: 3000 },
  { id: 3, title: 'Calculating time value', description: 'Determining optimal tokenization strategies', duration: 2500 },
  { id: 4, title: 'Generating portfolio', description: 'Creating your personalized time portfolio', duration: 3500 },
  { id: 5, title: 'Finalizing recommendations', description: 'Polishing your smart portfolio with AI', duration: 2000 },
];

export default function ProcessingState({ userAnswers, onComplete }: ProcessingStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isGeneratingPortfolio, setIsGeneratingPortfolio] = useState(false);

  useEffect(() => {
    const processSteps = async () => {
      // Step through the visual processing steps
      for (let i = 0; i < processingSteps.length - 1; i++) {
        setCurrentStep(i);
        await new Promise(resolve => setTimeout(resolve, processingSteps[i].duration));
        setCompletedSteps(prev => [...prev, i]);
      }
      
      // Final step: generate portfolio through the server-side GPT route.
      setCurrentStep(processingSteps.length - 1);
      setIsGeneratingPortfolio(true);
      
      try {
        console.log('🤖 Initializing GPT Portfolio Agent...');
        const portfolioData = await portfolioAgent.generatePortfolio(userAnswers);
        console.log('✅ Portfolio generated successfully:', portfolioData);
        
        setCompletedSteps(prev => [...prev, processingSteps.length - 1]);
        
        setTimeout(() => {
          onComplete(portfolioData);
        }, 1000);
      } catch (error) {
        console.error('❌ Error generating portfolio:', error);
        // Still complete the process even if there's an error (fallback will be used)
        setCompletedSteps(prev => [...prev, processingSteps.length - 1]);
        setTimeout(() => {
          onComplete({} as PortfolioData); // Will trigger fallback in Portfolio component
        }, 1000);
      }
    };

    processSteps();
  }, [userAnswers, onComplete]);

  return (
    <motion.div 
      className="min-h-screen flex items-center justify-center p-4"
      animate={{
        background: [
          "linear-gradient(45deg, #667eea 0%, #764ba2 100%)",
          "linear-gradient(45deg, #f093fb 0%, #f5576c 100%)",
          "linear-gradient(45deg, #4facfe 0%, #00f2fe 100%)",
          "linear-gradient(45deg, #43e97b 0%, #38f9d7 100%)",
          "linear-gradient(45deg, #fa709a 0%, #fee140 100%)",
          "linear-gradient(45deg, #667eea 0%, #764ba2 100%)"
        ]
      }}
      transition={{
        duration: 15,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <div className="w-full max-w-2xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-white/90 backdrop-blur-sm border border-white/20 rounded-lg p-8 shadow-2xl"
        >
          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold text-gray-800 mb-4"
          >
            Creating Your Smart Portfolio
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-gray-600 text-xl mb-12"
          >
            Our AI is working hard to tokenize your time perfectly
          </motion.p>

          {/* AI Brain Animation */}
          <div className="mb-12">
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="w-32 h-32 mx-auto mb-8 relative"
            >
              <motion.div 
                className="w-full h-full rounded-full flex items-center justify-center"
                animate={{
                  background: [
                    "linear-gradient(45deg, #667eea, #764ba2)",
                    "linear-gradient(45deg, #f093fb, #f5576c)",
                    "linear-gradient(45deg, #4facfe, #00f2fe)",
                    "linear-gradient(45deg, #43e97b, #38f9d7)",
                    "linear-gradient(45deg, #fa709a, #fee140)",
                    "linear-gradient(45deg, #667eea, #764ba2)"
                  ]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className="text-5xl text-white">🤖</span>
              </motion.div>
              
              {/* Orbiting dots */}
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="absolute w-4 h-4 bg-white/80 rounded-full shadow-lg"
                  style={{
                    top: '50%',
                    left: '50%',
                    marginTop: '-8px',
                    marginLeft: '-8px',
                  }}
                  animate={{
                    x: [0, 60, 0, -60, 0],
                    y: [0, -60, 0, 60, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    delay: index * 1,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </motion.div>
          </div>

          {/* Processing Steps */}
          <div className="space-y-6">
            {processingSteps.map((step, index) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.3 }}
                className={`flex items-center p-4 rounded-lg border transition-all duration-500 ${
                  completedSteps.includes(index)
                    ? 'bg-gray-100 border-black'
                    : currentStep === index
                    ? 'bg-gray-50 border-gray-400'
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex-shrink-0 mr-4">
                  {completedSteps.includes(index) ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-8 h-8 bg-black rounded-full flex items-center justify-center"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </motion.div>
                  ) : currentStep === index ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-8 h-8 border-2 border-black border-t-transparent rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 border border-gray-300 rounded-full flex items-center justify-center text-black font-semibold">
                      {step.id}
                    </div>
                  )}
                </div>
                
                <div className="flex-1 text-left">
                  <h3 className={`font-semibold text-lg ${
                    completedSteps.includes(index) ? 'text-black' : 'text-black'
                  }`}>
                    {step.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress Information */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 p-4 bg-white/60 backdrop-blur-sm border border-white/30 rounded-lg"
          >
            <div className="flex items-center justify-center space-x-2 text-gray-700">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                ⚡
              </motion.div>
              <span>
                {isGeneratingPortfolio
                  ? "GPT Portfolio Agent is analyzing your profile..."
                  : "AI Portfolio Agent is working..."
                }
              </span>
              <motion.div
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <span className="text-2xl">🧠</span>
              </motion.div>
            </div>
            
            {isGeneratingPortfolio && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-center"
              >
                <div className="text-black font-semibold mb-2">
                  Real AI Portfolio Generation in Progress
                </div>
                <div className="text-gray-600 text-sm">
                  Using advanced language models to create your personalized portfolio...
                </div>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
