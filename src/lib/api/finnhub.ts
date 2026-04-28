import axios from 'axios';
import type { Stock, Candle, NewsArticle, TimeFrame } from '@/types';

const BASE_URL = 'https://finnhub.io/api/v1';
const API_KEY = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  params: { token: API_KEY },
  timeout: 10000,
});

export async function getQuote(symbol: string): Promise<Partial<Stock>> {
  const [quoteRes, profileRes] = await Promise.all([
    client.get('/quote', { params: { symbol } }),
    client.get('/stock/profile2', { params: { symbol } }),
  ]);

  const q = quoteRes.data;
  const p = profileRes.data;

  return {
    symbol,
    name: p.name || symbol,
    price: q.c,
    change: q.d,
    changePercent: q.dp,
    volume: q.v,
    high52Week: q['52WeekHigh'],
    low52Week: q['52WeekLow'],
    open: q.o,
    previousClose: q.pc,
    marketCap: p.marketCapitalization ? p.marketCapitalization * 1e6 : undefined,
  };
}

export async function searchStocks(query: string) {
  const res = await client.get('/search', { params: { q: query } });
  return (res.data.result || []).slice(0, 10).map((item: { symbol: string; description: string }) => ({
    symbol: item.symbol,
    name: item.description,
  }));
}

const timeFrameToResolution: Record<TimeFrame, string> = {
  '1D': '5',
  '1W': '15',
  '1M': '60',
  '3M': 'D',
  '1Y': 'D',
  '5Y': 'W',
};

const timeFrameToDays: Record<TimeFrame, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 365,
  '5Y': 1825,
};

export async function getCandles(symbol: string, timeframe: TimeFrame): Promise<Candle[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - timeFrameToDays[timeframe] * 86400;
  const resolution = timeFrameToResolution[timeframe];

  const res = await client.get('/stock/candle', {
    params: { symbol, resolution, from, to: now },
  });

  if (res.data.s !== 'ok') return [];

  const { t, o, h, l, c, v } = res.data;
  return t.map((time: number, i: number) => ({
    time,
    open: o[i],
    high: h[i],
    low: l[i],
    close: c[i],
    volume: v[i],
  }));
}

export async function getNews(symbol: string): Promise<NewsArticle[]> {
  const to = new Date().toISOString().split('T')[0];
  const from = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const res = await client.get('/company-news', {
    params: { symbol, from, to },
  });

  return (res.data || []).slice(0, 20).map((article: {
    id: number;
    headline: string;
    summary: string;
    source: string;
    url: string;
    image: string;
    datetime: number;
    related: string;
  }) => ({
    id: String(article.id),
    headline: article.headline,
    summary: article.summary,
    source: article.source,
    url: article.url,
    image: article.image,
    datetime: article.datetime,
    sentiment: getSentiment(article.headline),
    related: article.related,
  }));
}

export async function getMarketNews(): Promise<NewsArticle[]> {
  const res = await client.get('/news', { params: { category: 'general' } });
  return (res.data || []).slice(0, 20).map((article: {
    id: number;
    headline: string;
    summary: string;
    source: string;
    url: string;
    image: string;
    datetime: number;
    related: string;
  }) => ({
    id: String(article.id),
    headline: article.headline,
    summary: article.summary,
    source: article.source,
    url: article.url,
    image: article.image,
    datetime: article.datetime,
    sentiment: getSentiment(article.headline),
    related: article.related || 'general',
  }));
}

function getSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
  const bullishWords = ['surge', 'rally', 'gain', 'rise', 'up', 'high', 'beat', 'profit', 'growth', 'bullish'];
  const bearishWords = ['fall', 'drop', 'decline', 'loss', 'down', 'low', 'miss', 'crash', 'bearish', 'cut'];
  const lower = text.toLowerCase();
  const bullScore = bullishWords.filter(w => lower.includes(w)).length;
  const bearScore = bearishWords.filter(w => lower.includes(w)).length;
  if (bullScore > bearScore) return 'bullish';
  if (bearScore > bullScore) return 'bearish';
  return 'neutral';
}
