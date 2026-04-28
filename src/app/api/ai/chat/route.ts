import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Stable system prompt — cached so repeated questions are ~90% cheaper
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

export async function POST(req: NextRequest) {
  const { messages, context } = await req.json();

  // Build the message list — inject market context if provided
  const userMessages = context
    ? [
        {
          role: 'user' as const,
          content: `[Current market context: ${JSON.stringify(context)}]\n\n${messages[messages.length - 1].content}`,
        },
        ...messages.slice(0, -1).reverse(),
      ].reverse()
    : messages;

  const stream = await client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        // Cache the system prompt — it's large, stable, and reused on every chat turn
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: userMessages,
  });

  // Stream the response as SSE
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
      } catch (err) {
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
      Connection: 'keep-alive',
    },
  });
}
