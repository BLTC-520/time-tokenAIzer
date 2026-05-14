import { NextResponse } from 'next/server';
import { completeJson } from '../_lib/openai';
import type { UserAnswers } from '../../../types/portfolio';

export const runtime = 'nodejs';

const systemPrompt = `You are GPT Portfolio Maker for Time TokenAIzer, a booking-aware time marketplace. Create realistic professional portfolio recommendations for a user who may later tokenize fungible TIME credits and redeem them through a BookingManager contract. Keep the advice market-aware, practical, and compatible with a tokenized services marketplace.`;

const buildPortfolioPrompt = (userAnswers: UserAnswers) => `
User profile:
- Name: ${userAnswers.name}
- Experience level: ${userAnswers.experience}
- Skills: ${(userAnswers.skills || []).join(', ')}
- Time available: ${userAnswers.timeAvailable} hours/week
- Goals: ${userAnswers.goals}
- Preferred projects: ${(userAnswers.preferredProjects || []).join(', ')}
- Desired hourly rate band: ${userAnswers.hourlyRate}

Return this exact JSON shape:
{
  "profileSummary": "2-3 sentence professional summary",
  "skillAssessment": [
    {
      "skill": "skill name",
      "level": 70,
      "marketDemand": 85,
      "insights": "specific market insight"
    }
  ],
  "projectRecommendations": [
    {
      "name": "booking-ready service package",
      "description": "specific service description",
      "match": 90,
      "estimatedBudget": "$X,XXX-X,XXX",
      "duration": "X-X weeks",
      "requiredSkills": ["skill"]
    }
  ],
  "earningsProjection": {
    "weekly": 1000,
    "monthly": 4330,
    "yearly": 51960,
    "optimizationTips": ["tip"]
  },
  "timeOptimization": {
    "bestWorkingHours": "schedule",
    "productivityTips": ["tip"],
    "timeManagementAdvice": "advice"
  },
  "careerRoadmap": {
    "shortTerm": ["goal"],
    "mediumTerm": ["goal"],
    "longTerm": ["goal"]
  }
}
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userAnswers = body.userAnswers as UserAnswers | undefined;

    if (!userAnswers) {
      return NextResponse.json({ error: 'Missing userAnswers.' }, { status: 400 });
    }

    const content = await completeJson(systemPrompt, buildPortfolioPrompt(userAnswers));
    return NextResponse.json(JSON.parse(content));
  } catch (error) {
    console.error('Portfolio AI route failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Portfolio AI route failed.' },
      { status: 500 }
    );
  }
}
