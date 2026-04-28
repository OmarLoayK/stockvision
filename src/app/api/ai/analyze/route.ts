import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { parseSymbol } from '@/lib/auth-guard';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM = `You are a portfolio risk analyst AI with deep expertise in modern portfolio theory,
risk management, and investment strategy. Analyze portfolios objectively and provide actionable recommendations.
Always output valid JSON matching the requested schema exactly.`;

const MAX_HOLDINGS = 50;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // 10 portfolio analyses per minute per user (expensive call)
  const rl = rateLimit(`ai:analyze:${auth.userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait before re-analyzing.' },
      { status: 429, headers: rateLimitHeaders(rl, 10) }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { holdings, balance, totalValue } = (body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(holdings) || holdings.length === 0) {
    return NextResponse.json({ error: 'No holdings to analyze' }, { status: 400 });
  }

  const safeBalance = typeof balance === 'number' && isFinite(balance) && balance >= 0 ? balance : 0;
  const safeTotalValue = typeof totalValue === 'number' && isFinite(totalValue) && totalValue > 0 ? totalValue : 1;

  // Validate and sanitise holdings
  const safeHoldings = (holdings as unknown[])
    .slice(0, MAX_HOLDINGS)
    .map((h: unknown) => {
      if (!h || typeof h !== 'object') return null;
      const item = h as Record<string, unknown>;
      const symbol = parseSymbol(item.symbol);
      if (!symbol) return null;

      const num = (k: string) => {
        const v = item[k];
        return typeof v === 'number' && isFinite(v) ? v : null;
      };

      const shares = num('shares');
      const avgCost = num('avgCost');
      const currentPrice = num('currentPrice');
      const totalVal = num('totalValue');
      const gainLossPercent = num('gainLossPercent');

      if (shares === null || shares <= 0) return null;
      if (avgCost === null || avgCost < 0) return null;
      if (currentPrice === null || currentPrice < 0) return null;

      return {
        symbol,
        shares,
        avgCost,
        currentPrice,
        totalValue: totalVal ?? currentPrice * shares,
        gainLossPercent: gainLossPercent ?? 0,
        weight: (((totalVal ?? currentPrice * shares) / safeTotalValue) * 100).toFixed(1) + '%',
      };
    })
    .filter(Boolean);

  if (safeHoldings.length === 0) {
    return NextResponse.json({ error: 'No valid holdings provided' }, { status: 400 });
  }

  const holdingsValue = safeHoldings.reduce((s, h) => s + (h!.totalValue ?? 0), 0);

  const prompt = `Analyze this paper trading portfolio and return a risk assessment as JSON.

Portfolio overview:
- Cash balance: $${safeBalance.toLocaleString()}
- Holdings value: $${holdingsValue.toLocaleString()}
- Total portfolio value: $${safeTotalValue.toLocaleString()}
- Cash allocation: ${((safeBalance / safeTotalValue) * 100).toFixed(1)}%

Holdings:
${JSON.stringify(safeHoldings, null, 2)}

Return ONLY this JSON (no markdown):
{
  "overallRisk": "high" | "medium" | "low",
  "diversificationScore": number (0-100),
  "summary": "3-4 sentence portfolio assessment",
  "strengths": ["strength 1", "strength 2"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "concentrationRisk": "high" | "medium" | "low",
  "cashAllocationComment": "brief comment on cash position",
  "topRiskyHolding": "SYMBOL or null",
  "suggestedActions": [
    { "action": "buy" | "sell" | "hold" | "reduce", "symbol": "SYMBOL", "reason": "brief reason" }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: ANALYSIS_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';

  try {
    const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(analysis, { headers: rateLimitHeaders(rl, 10) });
  } catch {
    return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
  }
}
