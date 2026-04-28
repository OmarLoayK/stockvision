'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Star, Bell, ShoppingCart } from 'lucide-react';
import { StockChart } from '@/components/charts/StockChart';
import { AIInsights } from '@/components/ai/AIInsights';
import { AISummary } from '@/components/ai/AISummary';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatNumber, formatPercent, cn } from '@/lib/utils';
import { useStockStore } from '@/lib/store/useStockStore';
import { useFinnhubSocket } from '@/lib/hooks/useFinnhubSocket';
import type { Candle, NewsArticle, TimeFrame } from '@/types';

interface Props {
  symbol: string;
  initialQuote: Record<string, unknown> | null;
  initialCandles: Candle[];
  initialNews: NewsArticle[];
}

export function StockDetailClient({ symbol, initialQuote, initialCandles, initialNews }: Props) {
  const [candles, setCandles] = useState<Candle[]>(initialCandles);
  const [timeframe, setTimeframe] = useState<TimeFrame>('1M');
  const [loadingCandles, setLoadingCandles] = useState(false);
  const [tradeShares, setTradeShares] = useState('');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState('');

  useFinnhubSocket([symbol]);
  const livePrice = useStockStore((s) => s.prices[symbol]);
  const quote = { ...initialQuote, ...livePrice };

  const price = (quote.price as number) || 0;
  const change = (quote.change as number) || 0;
  const changePercent = (quote.changePercent as number) || 0;
  const positive = changePercent >= 0;

  const handleTimeframeChange = async (tf: TimeFrame) => {
    setTimeframe(tf);
    setLoadingCandles(true);
    try {
      const res = await fetch(`/api/stocks/candles?symbol=${symbol}&timeframe=${tf}`);
      const data = await res.json();
      setCandles(data);
    } finally {
      setLoadingCandles(false);
    }
  };

  const handleTrade = async () => {
    const shares = parseFloat(tradeShares);
    if (!shares || shares <= 0) return;
    setTradeLoading(true);
    setTradeMsg('');
    try {
      const res = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, type: tradeType, shares }),
      });
      const data = await res.json();
      if (data.error) {
        setTradeMsg(`Error: ${data.error}`);
      } else {
        setTradeMsg(`${tradeType} ${shares} shares at ${formatCurrency(data.price)} — Total: ${formatCurrency(data.total)}`);
        setTradeShares('');
      }
    } finally {
      setTradeLoading(false);
    }
  };

  const stats = [
    { label: 'Open', value: formatCurrency((quote.open as number) || 0) },
    { label: 'Prev Close', value: formatCurrency((quote.previousClose as number) || 0) },
    { label: '52W High', value: formatCurrency((quote.high52Week as number) || 0) },
    { label: '52W Low', value: formatCurrency((quote.low52Week as number) || 0) },
    { label: 'Volume', value: formatNumber((quote.volume as number) || 0) },
    { label: 'Mkt Cap', value: formatNumber((quote.marketCap as number) || 0) },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{symbol}</h1>
            <Badge variant="default">{(quote.name as string) || symbol}</Badge>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-4xl font-bold text-white">{formatCurrency(price)}</span>
            <div className={cn('flex items-center gap-1', positive ? 'text-emerald-400' : 'text-red-400')}>
              {positive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
              <span className="text-lg font-semibold">
                {formatCurrency(change)} ({formatPercent(changePercent)})
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Star className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Chart */}
          <Card>
            <CardContent className="pt-6">
              <StockChart
                symbol={symbol}
                candles={candles}
                loading={loadingCandles}
                timeframe={timeframe}
                onTimeframeChange={handleTimeframeChange}
              />
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle>Key Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {stats.map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* AI News Summary */}
          <AISummary
            articles={initialNews.slice(0, 5).map((a) => ({
              headline: a.headline,
              summary: a.summary,
              source: a.source,
            }))}
            symbol={symbol}
          />

          {/* News */}
          <Card>
            <CardHeader><CardTitle>Latest News</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {initialNews.slice(0, 5).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-zinc-800 rounded-lg p-3 -mx-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white line-clamp-2">{article.headline}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-zinc-500">{article.source}</span>
                        <Badge variant={article.sentiment}>{article.sentiment}</Badge>
                      </div>
                    </div>
                    {article.image && (
                      <img src={article.image} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                    )}
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right column: AI Insights + Trade Panel */}
        <div className="space-y-4">
          <AIInsights
            symbol={symbol}
            quote={{
              price,
              changePercent,
              high52Week: (quote.high52Week as number) || undefined,
              low52Week: (quote.low52Week as number) || undefined,
              volume: (quote.volume as number) || undefined,
              marketCap: (quote.marketCap as number) || undefined,
            }}
            candles={candles}
          />

          <Card>
            <CardHeader><CardTitle>Paper Trade</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={tradeType === 'BUY' ? 'success' : 'ghost'}
                  className="flex-1"
                  onClick={() => setTradeType('BUY')}
                >
                  Buy
                </Button>
                <Button
                  variant={tradeType === 'SELL' ? 'destructive' : 'ghost'}
                  className="flex-1"
                  onClick={() => setTradeType('SELL')}
                >
                  Sell
                </Button>
              </div>
              <Input
                label="Shares"
                type="number"
                placeholder="0"
                min="0.01"
                step="0.01"
                value={tradeShares}
                onChange={(e) => setTradeShares(e.target.value)}
              />
              {tradeShares && parseFloat(tradeShares) > 0 && (
                <div className="bg-zinc-800 rounded-lg p-3 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Est. Total</span>
                    <span className="text-white font-medium">
                      {formatCurrency(parseFloat(tradeShares) * price)}
                    </span>
                  </div>
                </div>
              )}
              <Button
                className="w-full"
                variant={tradeType === 'BUY' ? 'success' : 'destructive'}
                onClick={handleTrade}
                disabled={tradeLoading || !tradeShares}
              >
                <ShoppingCart className="w-4 h-4" />
                {tradeLoading ? 'Processing...' : `${tradeType} ${symbol}`}
              </Button>
              {tradeMsg && (
                <p className={cn('text-xs', tradeMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400')}>
                  {tradeMsg}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AIChatWidget context={{ symbol, price, change: changePercent }} />
    </div>
  );
}
