import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are StockVision AI, an expert financial assistant embedded in a real-time stock analytics platform. You help users understand stocks, market trends, financial concepts, and portfolio strategy.

Your capabilities:
- Explain stock metrics (P/E ratio, EPS, market cap, 52-week highs/lows, bid/ask spreads)
- Interpret technical indicators (RSI, MACD, Bollinger Bands, moving averages)
- Explain candlestick chart patterns and their implications
- Discuss fundamental vs technical analysis approaches
- Help users understand risk management and portfolio diversification
- Explain options, ETFs, index funds, and other instruments
- Discuss market concepts: market cap, volume, volatility, beta, alpha
- Help interpret news and its potential market impact

Important guidelines:
- Always clarify you provide educational information, not personalized financial advice
- Be concise and clear — users are looking at live market data
- Use specific examples when helpful
- If asked about a specific stock, give general educational context about metrics shown
- Never promise returns or guarantee outcomes
- Encourage users to consult a licensed financial advisor for personal investment decisions

Respond in a conversational, knowledgeable tone. Be direct and helpful.`;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(req: NextRequest) {
  // Auth check — every AI call must be authenticated
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // Rate limit: 15 AI chat requests per minute per user
  const rl = rateLimit(`ai:chat:${auth.userId}`, 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before sending another message.' },
      { status: 429, headers: rateLimitHeaders(rl, 15) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || !('messages' in body)) {
    return NextResponse.json({ error: 'Missing messages field' }, { status: 400 });
  }

  const { messages, context } = body as Record<string, unknown>;

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages must be a non-empty array' }, { status: 400 });
  }

  // Validate and sanitise message array
  const sanitised = messages
    .slice(-MAX_MESSAGES) // only keep the last N messages to limit token spend
    .map((m: unknown) => {
      if (!m || typeof m !== 'object' || !('role' in m) || !('content' in m)) return null;
      const msg = m as Record<string, unknown>;
      if (msg.role !== 'user' && msg.role !== 'assistant') return null;
      if (typeof msg.content !== 'string') return null;
      return {
        role: msg.role as 'user' | 'assistant',
        content: msg.content.slice(0, MAX_MESSAGE_LENGTH),
      };
    })
    .filter(Boolean) as Array<{ role: 'user' | 'assistant'; content: string }>;

  if (sanitised.length === 0) {
    return NextResponse.json({ error: 'No valid messages provided' }, { status: 400 });
  }

  // Validate context if provided (must be a plain object with known numeric/string fields)
  let safeContext: { symbol?: string; price?: number; change?: number } | null = null;
  if (context && typeof context === 'object' && !Array.isArray(context)) {
    const c = context as Record<string, unknown>;
    safeContext = {
      ...(typeof c.symbol === 'string' && /^[A-Z]{1,10}$/.test(c.symbol) ? { symbol: c.symbol } : {}),
      ...(typeof c.price === 'number' && isFinite(c.price) ? { price: c.price } : {}),
      ...(typeof c.change === 'number' && isFinite(c.change) ? { change: c.change } : {}),
    };
  }

  const userMessages = safeContext
    ? [
        ...sanitised.slice(0, -1),
        {
          role: 'user' as const,
          content: `[Current market context: ${JSON.stringify(safeContext)}]\n\n${sanitised[sanitised.length - 1].content}`,
        },
      ]
    : sanitised;

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: userMessages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
            );
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      ...rateLimitHeaders(rl, 15),
    },
  });
}
