import { NextRequest, NextResponse } from 'next/server';
import { searchStocks } from '@/lib/api/finnhub';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json([]);

  try {
    const results = await searchStocks(q);
    return NextResponse.json(results);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
