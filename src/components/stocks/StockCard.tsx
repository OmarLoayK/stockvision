'use client';

import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';
import { useStockStore } from '@/lib/store/useStockStore';
import type { Stock } from '@/types';

interface StockCardProps {
  stock: Partial<Stock>;
  symbol: string;
}

export function StockCard({ stock: initialStock, symbol }: StockCardProps) {
  const livePrice = useStockStore((s) => s.prices[symbol]);
  const stock = { ...initialStock, ...livePrice };

  const positive = (stock.changePercent ?? 0) >= 0;

  return (
    <Link href={`/stocks/${symbol}`}>
      <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
        <CardContent className="py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-white">{symbol}</p>
              <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[120px]">{stock.name}</p>
            </div>
            <div className={cn('flex items-center gap-1 rounded-md px-2 py-1', positive ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
              {positive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={cn('text-xs font-medium', positive ? 'text-emerald-400' : 'text-red-400')}>
                {formatPercent(stock.changePercent ?? 0)}
              </span>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-bold text-white">{formatCurrency(stock.price ?? 0)}</p>
            <p className={cn('text-xs mt-0.5', positive ? 'text-emerald-400' : 'text-red-400')}>
              {positive ? '+' : ''}{formatCurrency(stock.change ?? 0)} today
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
