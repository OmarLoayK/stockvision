'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { AIPortfolioAnalysis } from '@/components/ai/AIPortfolioAnalysis';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import { formatCurrency, formatPercent, formatNumber, cn } from '@/lib/utils';
import type { PortfolioHolding } from '@/types';

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portfolio')
      .then((r) => r.json())
      .then((data) => {
        setHoldings(data.holdings || []);
        setBalance(data.balance || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
  const totalGainLoss = totalValue - totalCost;
  const totalGainLossPct = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
  const portfolioTotal = balance + totalValue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Portfolio</h1>
        <p className="text-zinc-400 text-sm mt-1">Your paper trading performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Value', value: formatCurrency(portfolioTotal), sub: 'Cash + Holdings' },
          { label: 'Cash Balance', value: formatCurrency(balance), sub: 'Available to trade' },
          { label: 'Holdings Value', value: formatCurrency(totalValue), sub: `${holdings.length} positions` },
          {
            label: 'Total P&L',
            value: formatCurrency(totalGainLoss),
            sub: formatPercent(totalGainLossPct),
            positive: totalGainLoss >= 0,
          },
        ].map(({ label, value, sub, positive }) => (
          <Card key={label}>
            <CardContent className="py-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className={cn('text-xl font-bold mt-1', positive !== undefined ? (positive ? 'text-emerald-400' : 'text-red-400') : 'text-white')}>
                {value}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Portfolio Analysis */}
      {!loading && (
        <AIPortfolioAnalysis
          holdings={holdings.map((h) => ({
            symbol: h.symbol,
            shares: h.shares,
            avgCost: h.avgCost,
            currentPrice: h.currentPrice,
            totalValue: h.totalValue,
            gainLossPercent: h.gainLossPercent,
          }))}
          balance={balance}
          totalValue={portfolioTotal}
        />
      )}

      {/* Holdings Table */}
      <Card>
        <CardHeader><CardTitle>Holdings</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : holdings.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No holdings yet. Start trading from a stock page.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {['Symbol', 'Shares', 'Avg Cost', 'Current Price', 'Total Value', 'P&L', 'P&L %'].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {holdings.map((h) => (
                    <tr key={h.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-white">{h.symbol}</p>
                        <p className="text-xs text-zinc-500 truncate max-w-[120px]">{h.name}</p>
                      </td>
                      <td className="px-6 py-4 text-zinc-300">{h.shares}</td>
                      <td className="px-6 py-4 text-zinc-300">{formatCurrency(h.avgCost)}</td>
                      <td className="px-6 py-4 text-white font-medium">{formatCurrency(h.currentPrice)}</td>
                      <td className="px-6 py-4 text-white font-medium">{formatCurrency(h.totalValue)}</td>
                      <td className={cn('px-6 py-4 font-medium', h.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(h.gainLoss)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={h.gainLoss >= 0 ? 'positive' : 'negative'}>
                          {h.gainLoss >= 0 ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                          {formatPercent(h.gainLossPercent)}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      <AIChatWidget />
    </div>
  );
}
