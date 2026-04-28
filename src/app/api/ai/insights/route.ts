import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { parseSymbol } from '@/lib/auth-guard';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const INSIGHTS_SYSTEM = `You are a financial analyst AI. Given stock data, generate concise, actionable insights.
Always structure your response as valid JSON matching the requested schema exactly.
Base insights on the data provided — never fabricate numbers.`;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // 20 insight requests per minute per user
  const rl = rateLimit(`ai:insights:${auth.userId}`, 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: rateLimitHeaders(rl, 20) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { symbol, quote, candles } = (body ?? {}) as Record<string, unknown>;

  const safeSymbol = parseSymbol(symbol);
  if (!safeSymbol) {
    return NextResponse.json({ error: 'Invalid or missing symbol' }, { status: 400 });
  }

  // Validate quote fields — accept only finite numbers
  const safeQuote = (() => {
    if (!quote || typeof quote !== 'object') return {};
    const q = quote as Record<string, unknown>;
    const pick = (k: string) => (typeof q[k] === 'number' && isFinite(q[k] as number) ? q[k] : undefined);
    return {
      price: pick('price'),
      changePercent: pick('changePercent'),
      high52Week: pick('high52Week'),
      low52Week: pick('low52Week'),
      volume: pick('volume'),
      marketCap: pick('marketCap'),
    };
  })();

  // Validate candles — array of objects with a numeric close
  const safeCandles = Array.isArray(candles)
    ? (candles as unknown[])
        .filter((c): c is { close: number } =>
          typeof c === 'object' && c !== null && 'close' in c &&
          typeof (c as Record<string, unknown>).close === 'number' &&
          isFinite((c as Record<string, unknown>).close as number)
        )
        .slice(0, 300) // cap history length
    : [];

  // Compute basic technicals from candle data
  const closes = safeCandles.map((c) => c.close);
  const sma20 = closes.length >= 20
    ? closes.slice(-20).reduce((a, b) => a + b, 0) / 20
    : null;
  const sma50 = closes.length >= 50
    ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50
    : null;

  const recentCloses = closes.slice(-14);
  const gains = recentCloses.filter((_, i) => i > 0 && recentCloses[i] > recentCloses[i - 1]);
  const losses = recentCloses.filter((_, i) => i > 0 && recentCloses[i] < recentCloses[i - 1]);
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  const q = safeQuote as Record<string, number | undefined>;

  const prompt = `Analyze ${safeSymbol} stock and return insights as JSON.

Stock data:
- Current price: $${q.price?.toFixed(2) ?? 'N/A'}
- Daily change: ${q.changePercent?.toFixed(2) ?? 'N/A'}%
- 52-week high: $${q.high52Week?.toFixed(2) ?? 'N/A'}
- 52-week low: $${q.low52Week?.toFixed(2) ?? 'N/A'}
- Volume: ${q.volume?.toLocaleString() ?? 'N/A'}
- Market cap: ${q.marketCap ? '$' + (q.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}
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
    return NextResponse.json(insights, { headers: rateLimitHeaders(rl, 20) });
  } catch {
    return NextResponse.json({ error: 'Failed to parse insights' }, { status: 500 });
  }
}
