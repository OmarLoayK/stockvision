import { NextRequest, NextResponse } from 'next/server';
import { getCandles } from '@/lib/api/finnhub';
import type { TimeFrame } from '@/types';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  const timeframe = (req.nextUrl.searchParams.get('timeframe') || '1M') as TimeFrame;
  if (!symbol) return NextResponse.json({ error: 'Missing symbol' }, { status: 400 });

  try {
    const candles = await getCandles(symbol, timeframe);
    return NextResponse.json(candles);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
