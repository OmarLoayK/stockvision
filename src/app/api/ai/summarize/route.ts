import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-guard';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { parseSymbol } from '@/lib/auth-guard';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUMMARIZE_SYSTEM = `You are a financial news analyst. Summarize news articles concisely for investors.
Focus on market impact, key facts, and what it means for traders. Output valid JSON only.`;

const MAX_ARTICLES = 5;
const MAX_TEXT_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // 20 summarize requests per minute per user
  const rl = rateLimit(`ai:summarize:${auth.userId}`, 20, 60_000);
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

  const { articles, symbol } = (body ?? {}) as Record<string, unknown>;

  if (!Array.isArray(articles) || articles.length === 0) {
    return NextResponse.json({ error: 'No articles to summarize' }, { status: 400 });
  }

  // Validate and sanitise articles
  const safeArticles = (articles as unknown[])
    .slice(0, MAX_ARTICLES)
    .map((a: unknown) => {
      if (!a || typeof a !== 'object') return null;
      const article = a as Record<string, unknown>;
      const headline = typeof article.headline === 'string'
        ? article.headline.slice(0, MAX_TEXT_LENGTH)
        : null;
      const summary = typeof article.summary === 'string'
        ? article.summary.slice(0, MAX_TEXT_LENGTH)
        : '';
      const source = typeof article.source === 'string'
        ? article.source.slice(0, 100)
        : 'Unknown';
      if (!headline) return null;
      return { headline, summary, source };
    })
    .filter(Boolean) as Array<{ headline: string; summary: string; source: string }>;

  if (safeArticles.length === 0) {
    return NextResponse.json({ error: 'No valid articles provided' }, { status: 400 });
  }

  const safeSymbol = symbol ? parseSymbol(symbol) : null;

  const articleText = safeArticles
    .map((a, i) => `Article ${i + 1}: "${a.headline}"\nSummary: ${a.summary}\nSource: ${a.source}`)
    .join('\n\n');

  const prompt = `Summarize these ${safeSymbol ? safeSymbol + ' ' : ''}news articles for an investor. Return ONLY this JSON:
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
    return NextResponse.json(summary, { headers: rateLimitHeaders(rl, 20) });
  } catch {
    return NextResponse.json({ error: 'Failed to parse summary' }, { status: 500 });
  }
}
