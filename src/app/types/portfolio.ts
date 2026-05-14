export interface UserAnswers {
  name: string;
  experience: string;
  skills: string[];
  timeAvailable: string;
  goals: string;
  preferredProjects: string[];
  hourlyRate: string;
}

export interface PortfolioData {
  profileSummary: string;
  skillAssessment: Array<{
    skill: string;
    level: number;
    marketDemand: number;
    insights: string;
  }>;
  projectRecommendations: Array<{
    name: string;
    description: string;
    match: number;
    estimatedBudget: string;
    duration: string;
    requiredSkills: string[];
  }>;
  earningsProjection: {
    weekly: number;
    monthly: number;
    yearly: number;
    optimizationTips: string[];
  };
  timeOptimization: {
    bestWorkingHours: string;
    productivityTips: string[];
    timeManagementAdvice: string;
  };
  careerRoadmap: {
    shortTerm: string[];
    mediumTerm: string[];
    longTerm: string[];
  };
}
