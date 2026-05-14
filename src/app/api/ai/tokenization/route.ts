import { NextResponse } from 'next/server';
import { completeJson } from '../_lib/openai';

export const runtime = 'nodejs';

type TokenizeTask = 'tokenization' | 'agentic';

const systemPrompts: Record<TokenizeTask, string> = {
  tokenization:
    'You are GPT TokenizeAgent for Time TokenAIzer. Produce realistic tokenization suggestions for fungible TIME credits, where actual bookings are managed by a separate BookingManager contract and Uniswap v4 only provides liquidity and hook-level checks.',
  agentic:
    'You are GPT TokenizeAgent in goal-planning mode. Build realistic bundles of TIME credit services, explain feasibility, and avoid over-selling hours the provider cannot deliver.',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const task = body.task as TokenizeTask | undefined;
    const prompt = body.prompt as string | undefined;

    if (!task || !systemPrompts[task]) {
      return NextResponse.json({ error: 'Invalid tokenization task.' }, { status: 400 });
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 });
    }

    const content = await completeJson(systemPrompts[task], prompt);
    return NextResponse.json({ text: content });
  } catch (error) {
    console.error('Tokenization AI route failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tokenization AI route failed.' },
      { status: 500 }
    );
  }
}
