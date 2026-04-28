import { create } from 'zustand';
import type { Stock, Watchlist, PortfolioHolding, Transaction, Alert } from '@/types';

interface StockStore {
  // Real-time prices
  prices: Record<string, Partial<Stock>>;
  setPrices: (symbol: string, data: Partial<Stock>) => void;

  // Watchlists
  watchlists: Watchlist[];
  setWatchlists: (watchlists: Watchlist[]) => void;
  addWatchlist: (watchlist: Watchlist) => void;
  removeWatchlist: (id: string) => void;

  // Portfolio
  holdings: PortfolioHolding[];
  setHoldings: (holdings: PortfolioHolding[]) => void;
  balance: number;
  setBalance: (balance: number) => void;
  transactions: Transaction[];
  setTransactions: (transactions: Transaction[]) => void;

  // Alerts
  alerts: Alert[];
  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;

  // UI
  subscribedSymbols: Set<string>;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
}

export const useStockStore = create<StockStore>((set) => ({
  prices: {},
  setPrices: (symbol, data) =>
    set((state) => ({
      prices: { ...state.prices, [symbol]: { ...state.prices[symbol], ...data } },
    })),

  watchlists: [],
  setWatchlists: (watchlists) => set({ watchlists }),
  addWatchlist: (watchlist) =>
    set((state) => ({ watchlists: [...state.watchlists, watchlist] })),
  removeWatchlist: (id) =>
    set((state) => ({ watchlists: state.watchlists.filter((w) => w.id !== id) })),

  holdings: [],
  setHoldings: (holdings) => set({ holdings }),
  balance: 100000,
  setBalance: (balance) => set({ balance }),
  transactions: [],
  setTransactions: (transactions) => set({ transactions }),

  alerts: [],
  setAlerts: (alerts) => set({ alerts }),
  addAlert: (alert) => set((state) => ({ alerts: [...state.alerts, alert] })),
  removeAlert: (id) =>
    set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  subscribedSymbols: new Set(),
  subscribeToSymbol: (symbol) =>
    set((state) => ({
      subscribedSymbols: new Set([...state.subscribedSymbols, symbol]),
    })),
  unsubscribeFromSymbol: (symbol) =>
    set((state) => {
      const next = new Set(state.subscribedSymbols);
      next.delete(symbol);
      return { subscribedSymbols: next };
    }),
}));
