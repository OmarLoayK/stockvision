'use client';

import { useEffect, useRef } from 'react';
import { useStockStore } from '@/lib/store/useStockStore';

export function useFinnhubSocket(symbols: string[]) {
  const ws = useRef<WebSocket | null>(null);
  const setPrices = useStockStore((s) => s.setPrices);

  useEffect(() => {
    if (!symbols.length) return;

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY;
    ws.current = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);

    ws.current.onopen = () => {
      symbols.forEach((symbol) => {
        ws.current?.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade' && data.data) {
        data.data.forEach((trade: { s: string; p: number; v: number; t: number }) => {
          setPrices(trade.s, { price: trade.p, volume: trade.v });
        });
      }
    };

    ws.current.onerror = () => {
      // Silently handle WebSocket errors (e.g., API key not set yet)
    };

    return () => {
      symbols.forEach((symbol) => {
        ws.current?.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      });
      ws.current?.close();
    };
  }, [symbols.join(',')]);
}
