import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSIGHTS_SYSTEM = `You are a financial analyst AI. Given stock data, generate concise, actionable insights.
Always structure your response as valid JSON matching the requested schema exactly.
Base insights on the data provided — never fabricate numbers.`;

export async function POST(req: NextRequest) {
  const { symbol, quote, candles } = await req.json();

  // Compute basic technicals from candle data
  const closes = (candles || []).map((c: { close: number }) => c.close);
  const sma20 = closes.length >= 20
    ? closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20
    : null;
  const sma50 = closes.length >= 50
    ? closes.slice(-50).reduce((a: number, b: number) => a + b, 0) / 50
    : null;

  const recentCloses = closes.slice(-14);
  const gains = recentCloses.filter((_: number, i: number) => i > 0 && recentCloses[i] > recentCloses[i - 1]);
  const losses = recentCloses.filter((_: number, i: number) => i > 0 && recentCloses[i] < recentCloses[i - 1]);
  const avgGain = gains.length ? gains.reduce((a: number, b: number) => a + b, 0) / gains.length : 0;
  const avgLoss = losses.length ? losses.reduce((a: number, b: number) => a + b, 0) / losses.length : 0;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  const prompt = `Analyze ${symbol} stock and return insights as JSON.

Stock data:
- Current price: $${quote?.price?.toFixed(2)}
- Daily change: ${quote?.changePercent?.toFixed(2)}%
- 52-week high: $${quote?.high52Week?.toFixed(2)}
- 52-week low: $${quote?.low52Week?.toFixed(2)}
- Volume: ${quote?.volume?.toLocaleString()}
- Market cap: $${quote?.marketCap ? (quote.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}
- 20-day SMA: ${sma20 ? '$' + sma20.toFixed(2) : 'N/A'}
- 50-day SMA: ${sma50 ? '$' + sma50.toFixed(2) : 'N/A'}
- 14-day RSI: ${rsi ? rsi.toFixed(1) : 'N/A'}

Return ONLY this JSON structure (no markdown, no explanation):
{
  "signal": "bullish" | "bearish" | "neutral",
  "strength": "strong" | "moderate" | "weak",
  "summary": "2-3 sentence analysis",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "support": number or null,
  "resistance": number or null,
  "rsiSignal": "overbought" | "oversold" | "neutral",
  "trendSignal": "uptrend" | "downtrend" | "sideways",
  "risk": "high" | "medium" | "low"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: INSIGHTS_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';

  try {
    const insights = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(insights);
  } catch {
    return NextResponse.json({ error: 'Failed to parse insights' }, { status: 500 });
  }
}
