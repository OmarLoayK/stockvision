import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getQuote } from '@/lib/api/finnhub';
import { parseSymbol } from '@/lib/auth-guard';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [holdingsRes, profileRes] = await Promise.all([
    supabase.from('holdings').select('*').eq('user_id', user.id),
    supabase.from('profiles').select('balance').eq('id', user.id).single(),
  ]);

  const holdings = holdingsRes.data || [];

  const enriched = await Promise.all(
    holdings.map(async (h: { symbol: string; shares: number; avg_cost: number; name: string; id: string }) => {
      try {
        const quote = await getQuote(h.symbol);
        const currentPrice = quote.price || 0;
        const totalValue = currentPrice * h.shares;
        const totalCost = h.avg_cost * h.shares;
        return {
          id: h.id,
          symbol: h.symbol,
          name: h.name || h.symbol,
          shares: h.shares,
          avgCost: h.avg_cost,
          currentPrice,
          totalValue,
          totalCost,
          gainLoss: totalValue - totalCost,
          gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
        };
      } catch {
        return null;
      }
    })
  );

  return NextResponse.json({
    holdings: enriched.filter(Boolean),
    balance: profileRes.data?.balance ?? 100000,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { symbol: rawSymbol, type, shares: rawShares } = (body ?? {}) as Record<string, unknown>;

  const symbol = parseSymbol(rawSymbol);
  if (!symbol) return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });

  if (type !== 'BUY' && type !== 'SELL') {
    return NextResponse.json({ error: 'type must be BUY or SELL' }, { status: 400 });
  }

  const shares = typeof rawShares === 'number' && isFinite(rawShares) && rawShares > 0 && rawShares <= 1_000_000
    ? rawShares
    : null;
  if (!shares) return NextResponse.json({ error: 'shares must be a positive number' }, { status: 400 });

  const quote = await getQuote(symbol);
  const price = quote.price!;
  const total = price * shares;

  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', user.id)
    .single();

  const balance = profile?.balance ?? 100000;

  if (type === 'BUY' && balance < total) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
  }

  // Upsert holding
  const { data: existing } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', user.id)
    .eq('symbol', symbol)
    .single();

  if (type === 'BUY') {
    if (existing) {
      const newShares = existing.shares + shares;
      const newAvgCost = (existing.avg_cost * existing.shares + price * shares) / newShares;
      await supabase.from('holdings').update({ shares: newShares, avg_cost: newAvgCost }).eq('id', existing.id);
    } else {
      await supabase.from('holdings').insert({
        user_id: user.id,
        symbol,
        name: quote.name || symbol,
        shares,
        avg_cost: price,
      });
    }
    await supabase.from('profiles').update({ balance: balance - total }).eq('id', user.id);
  } else {
    if (!existing || existing.shares < shares) {
      return NextResponse.json({ error: 'Insufficient shares' }, { status: 400 });
    }
    const newShares = existing.shares - shares;
    if (newShares === 0) {
      await supabase.from('holdings').delete().eq('id', existing.id);
    } else {
      await supabase.from('holdings').update({ shares: newShares }).eq('id', existing.id);
    }
    await supabase.from('profiles').update({ balance: balance + total }).eq('id', user.id);
  }

  await supabase.from('transactions').insert({
    user_id: user.id,
    symbol,
    type,
    shares,
    price,
    total,
  });

  return NextResponse.json({ success: true, price, total });
}
