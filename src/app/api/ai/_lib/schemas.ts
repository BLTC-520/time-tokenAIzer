export const portfolioResponseSchema = {
  type: 'object',
  required: [
    'profileSummary',
    'skillAssessment',
    'projectRecommendations',
    'earningsProjection',
    'timeOptimization',
    'careerRoadmap',
  ],
  additionalProperties: true,
  properties: {
    profileSummary: { type: 'string' },
    skillAssessment: { type: 'array' },
    projectRecommendations: { type: 'array' },
    earningsProjection: { type: 'object' },
    timeOptimization: { type: 'object' },
    careerRoadmap: { type: 'object' },
  },
} as const;

export const tokenizationResponseSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    tokenSuggestions: { type: 'array' },
    marketAnalysis: { type: 'object' },
    aiInsights: { type: 'array' },
    riskFactors: { type: 'array' },
    optimizationTips: { type: 'array' },
  },
} as const;

export const assistantResponseSchema = {
  type: 'object',
  required: ['text'],
  additionalProperties: false,
  properties: {
    text: { type: 'string' },
  },
} as const;
