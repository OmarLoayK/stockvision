'use client';

import { useFinnhubSocket } from '@/lib/hooks/useFinnhubSocket';

export function DashboardClient({ symbols }: { symbols: string[] }) {
  useFinnhubSocket(symbols);
  return null;
}
