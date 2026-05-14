import { NextResponse } from 'next/server';
import { completeJson } from '../_lib/openai';

export const runtime = 'nodejs';

const systemPrompt = `You are the Time TokenAIzer assistant. Help users understand tokenized time, booking-aware marketplace flows, wallet state, KYC, Uniswap v4 liquidity, and safe next steps. Keep responses concise, practical, and product-specific.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = body.prompt as string | undefined;

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 });
    }

    const content = await completeJson(
      systemPrompt,
      `${prompt}\n\nReturn JSON in this shape: {"text":"concise assistant response"}`
    );
    const parsed = JSON.parse(content);

    return NextResponse.json({
      text: typeof parsed.text === 'string' ? parsed.text : 'I can help with portfolio, booking, and token marketplace flows.',
    });
  } catch (error) {
    console.error('Assistant AI route failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Assistant AI route failed.' },
      { status: 500 }
    );
  }
}
