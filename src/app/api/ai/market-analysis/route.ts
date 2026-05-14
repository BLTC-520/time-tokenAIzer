import { NextResponse } from 'next/server';
import { completeJson } from '../_lib/openai';

export const runtime = 'nodejs';

const systemPrompt = `You are GPT Market Analyzer for Time TokenAIzer. Synthesize freelance market analysis from Chainlink Functions skill data. Keep the result useful for booking-aware TIME credit pricing and avoid treating AMM spot price as a fixed service quote.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt as string | undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 });
    }

    const content = await completeJson(systemPrompt, prompt);
    return NextResponse.json({ text: content });
  } catch (error) {
    console.error('Market analysis AI route failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Market analysis AI route failed.' },
      { status: 500 }
    );
  }
}
