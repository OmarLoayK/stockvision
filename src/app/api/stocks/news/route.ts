import { NextRequest, NextResponse } from 'next/server';
import { getNews, getMarketNews } from '@/lib/api/finnhub';

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');

  try {
    const news = symbol ? await getNews(symbol) : await getMarketNews();
    return NextResponse.json(news);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
