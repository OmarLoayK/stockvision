import { getQuote, getCandles, getNews } from '@/lib/api/finnhub';
import { StockDetailClient } from './StockDetailClient';

interface Props {
  params: Promise<{ ticker: string }>;
}

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;
  const symbol = ticker.toUpperCase();

  const [quote, candles, news] = await Promise.all([
    getQuote(symbol).catch(() => null),
    getCandles(symbol, '1M').catch(() => []),
    getNews(symbol).catch(() => []),
  ]);

  return (
    <StockDetailClient
      symbol={symbol}
      initialQuote={quote}
      initialCandles={candles}
      initialNews={news}
    />
  );
}
