import { createClient } from '@/lib/supabase/server';
import { getQuote } from '@/lib/api/finnhub';
import { StockCard } from '@/components/stocks/StockCard';
import { DashboardClient } from './DashboardClient';

const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'SPY'];

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, balance')
    .eq('id', user!.id)
    .single();

  type StockWithSymbol = Awaited<ReturnType<typeof getQuote>> & { symbol: string };

  const quotes = await Promise.allSettled(
    DEFAULT_SYMBOLS.map((s) => getQuote(s).then((q): StockWithSymbol => ({ ...q, symbol: s })))
  );

  const stocks = quotes
    .filter((r): r is PromiseFulfilledResult<StockWithSymbol> => r.status === 'fulfilled')
    .map((r) => r.value);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good morning, {profile?.name || user?.email?.split('@')[0]}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Here&apos;s the market overview</p>
      </div>

      <DashboardClient symbols={DEFAULT_SYMBOLS} />

      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Market Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stocks.map((stock) => (
            <StockCard key={stock.symbol!} symbol={stock.symbol!} stock={stock} />
          ))}
        </div>
      </div>
    </div>
  );
}
