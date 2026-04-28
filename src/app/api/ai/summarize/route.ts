import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARIZE_SYSTEM = `You are a financial news analyst. Summarize news articles concisely for investors.
Focus on market impact, key facts, and what it means for traders. Output valid JSON only.`;

export async function POST(req: NextRequest) {
  const { articles, symbol } = await req.json();

  if (!articles || articles.length === 0) {
    return NextResponse.json({ error: 'No articles to summarize' }, { status: 400 });
  }

  const articleText = articles
    .slice(0, 5)
    .map((a: { headline: string; summary: string; source: string }, i: number) =>
      `Article ${i + 1}: "${a.headline}"\nSummary: ${a.summary}\nSource: ${a.source}`
    )
    .join('\n\n');

  const prompt = `Summarize these ${symbol ? symbol + ' ' : ''}news articles for an investor. Return ONLY this JSON:
{
  "headline": "one compelling sentence summarizing the overall news story",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "marketImpact": "bullish" | "bearish" | "neutral",
  "impactReasoning": "1-2 sentences on why",
  "timeframe": "short-term" | "long-term" | "both"
}

Articles:
${articleText}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text: SUMMARIZE_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content.find((b) => b.type === 'text')?.text || '{}';

  try {
    const summary = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim());
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ error: 'Failed to parse summary' }, { status: 500 });
  }
}
