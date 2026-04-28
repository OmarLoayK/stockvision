import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface AuthResult {
  userId: string;
  error: null;
}
interface AuthError {
  userId: null;
  error: NextResponse;
}

export async function requireAuth(): Promise<AuthResult | AuthError> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      userId: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { userId: user.id, error: null };
}

// Extract the best available identifier for rate-limiting unauthenticated routes.
// Vercel sets x-forwarded-for; fall back to a constant so we never crash.
export function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

// Simple symbol validator — only uppercase letters, 1–10 chars
export function isValidSymbol(symbol: unknown): symbol is string {
  return typeof symbol === 'string' && /^[A-Z]{1,10}$/.test(symbol.toUpperCase());
}

// Normalise a symbol to uppercase and validate it
export function parseSymbol(symbol: unknown): string | null {
  if (typeof symbol !== 'string') return null;
  const upper = symbol.trim().toUpperCase();
  return isValidSymbol(upper) ? upper : null;
}
