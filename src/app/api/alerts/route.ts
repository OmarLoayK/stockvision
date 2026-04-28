import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseSymbol } from '@/lib/auth-guard';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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

  const { symbol: rawSymbol, type, threshold: rawThreshold } = (body ?? {}) as Record<string, unknown>;

  const symbol = parseSymbol(rawSymbol);
  if (!symbol) return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 });

  if (type !== 'above' && type !== 'below') {
    return NextResponse.json({ error: 'type must be above or below' }, { status: 400 });
  }

  const threshold = typeof rawThreshold === 'number' && isFinite(rawThreshold) && rawThreshold > 0
    ? rawThreshold
    : null;
  if (!threshold) return NextResponse.json({ error: 'threshold must be a positive number' }, { status: 400 });

  const { data, error } = await supabase
    .from('alerts')
    .insert({ user_id: user.id, symbol, type, threshold, triggered: false })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  const { error } = await supabase.from('alerts').delete().eq('id', id).eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
