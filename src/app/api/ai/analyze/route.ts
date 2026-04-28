import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ANALYSIS_SYSTEM = `You are a portfolio risk analyst AI with deep expertise in modern portfolio theory,
risk management, and investment strategy. Analyze portfolios objectively and provide actionable recommendations.
Always output valid JSON matching the requested schema exactly.`;

export async function POST(req: NextRequest) {
  const { holdings, balance, totalValue } = await req.json();

  if (!holdings || holdings.length === 0) {
    return NextResponse.json({ error: 'No holdings to analyze' }, { status: 400 });
  }

  const holdingsSummary = holdings.map((h: {
    symbol: string;
    shares: number;
    avgCost: number;
    currentPrice: number;
    totalValue: number;
    gainLossPercent: number;
  }) => ({
    symbol: h.symbol,
    shares: h.shares,
    avgCost: h.avgCost,
    currentPrice: h.currentPrice,
    totalValue: h.totalValue,
    gainLossPercent: h.gainLossPercent,
    weight: ((h.totalValue / totalValue) * 100).toFixed(1) + '%',
  }));

  const prompt = `Analyze this paper trading portfolio and return a risk assessment as JSON.

Portfolio overview:
- Cash balance: $${balance?.toLocaleString()}
- Holdings value: $${holdings.reduce((s: number, h: { totalValue: number }) => s + h.totalValue, 0).toLocaleString()}
- Total portfolio value: $${totalValue?.toLocaleString()}
- Cash allocation: ${((balance / totalValue) * 100).toFixed(1)}%

Holdings:
${JSON.stringify(holdingsSummary, null, 2)}

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
    return NextResponse.json(analysis);
  } catch {
    return NextResponse.json({ error: 'Failed to parse analysis' }, { status: 500 });
  }
}
