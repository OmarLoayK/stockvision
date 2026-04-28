import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/api/finnhub';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getClientId, parseSymbol } from '@/lib/auth-guard';

export async function GET(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`stocks:quote:${ip}`, 60, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, 60) }
    );
  }

  const raw = req.nextUrl.searchParams.get('symbol');
  const symbol = parseSymbol(raw);
  if (!symbol) {
    return NextResponse.json({ error: 'Invalid or missing symbol' }, { status: 400 });
  }

  try {
    const quote = await getQuote(symbol);
    return NextResponse.json(quote, { headers: rateLimitHeaders(rl, 60) });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}
