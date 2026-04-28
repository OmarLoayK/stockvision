export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  high52Week?: number;
  low52Week?: number;
  bidPrice?: number;
  askPrice?: number;
  open?: number;
  previousClose?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  addedAt: string;
}

export interface Watchlist {
  id: string;
  name: string;
  userId: string;
  items: WatchlistItem[];
  createdAt: string;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  totalCost: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  total: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  symbol: string;
  type: 'PRICE_ABOVE' | 'PRICE_BELOW' | 'PERCENT_CHANGE' | 'VOLUME_SPIKE';
  threshold: number;
  triggered: boolean;
  createdAt: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  image?: string;
  datetime: number;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  related: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  balance: number;
  createdAt: string;
}

export type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y';
export type ChartType = 'candlestick' | 'line';
export type Indicator = 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BB';
