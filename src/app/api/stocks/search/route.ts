import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/lib/api/finnhub';
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit';
import { getClientId } from '@/lib/auth-guard';

const MAX_QUERY_LENGTH = 50;
// Only allow alphanumeric, spaces, dots, and hyphens
const SAFE_QUERY = /^[a-zA-Z0-9 .\-]+$/;

export async function GET(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`stocks:search:${ip}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: rateLimitHeaders(rl, 30) }
    );
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json([]);

  if (q.length > MAX_QUERY_LENGTH || !SAFE_QUERY.test(q)) {
    return NextResponse.json({ error: 'Invalid search query' }, { status: 400 });
  }

  try {
    const results = await searchStocks(q);
    return NextResponse.json(results, { headers: rateLimitHeaders(rl, 30) });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
