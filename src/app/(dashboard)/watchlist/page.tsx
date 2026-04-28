'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Star } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';

interface WatchlistItem { id: string; symbol: string; name: string; }
interface Watchlist { id: string; name: string; watchlist_items: WatchlistItem[]; }

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [addSymbol, setAddSymbol] = useState('');
  const [activeList, setActiveList] = useState<string | null>(null);

  const fetchWatchlists = () =>
    fetch('/api/watchlist').then((r) => r.json()).then((data) => {
      setWatchlists(data || []);
      if (!activeList && data?.[0]) setActiveList(data[0].id);
    }).finally(() => setLoading(false));

  useEffect(() => { fetchWatchlists(); }, []);

  const createList = async () => {
    if (!newListName.trim()) return;
    await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName }),
    });
    setNewListName('');
    fetchWatchlists();
  };

  const addItem = async () => {
    if (!addSymbol.trim() || !activeList) return;
    await fetch('/api/watchlist/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ watchlistId: activeList, symbol: addSymbol.toUpperCase(), name: addSymbol.toUpperCase() }),
    });
    setAddSymbol('');
    fetchWatchlists();
  };

  const removeItem = async (id: string) => {
    await fetch('/api/watchlist/items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    fetchWatchlists();
  };

  const current = watchlists.find((w) => w.id === activeList);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Watchlist</h1>
        <p className="text-zinc-400 text-sm mt-1">Track your favorite stocks</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Lists sidebar */}
        <Card>
          <CardHeader><CardTitle>My Lists</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-3">
            {loading ? <Skeleton className="h-8" /> : watchlists.map((w) => (
              <button
                key={w.id}
                onClick={() => setActiveList(w.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${activeList === w.id ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-400 hover:bg-zinc-800'}`}
              >
                <Star className="w-3 h-3 inline mr-2" />{w.name}
                <span className="float-right text-xs opacity-60">{w.watchlist_items?.length || 0}</span>
              </button>
            ))}
            <div className="flex gap-2 pt-2">
              <input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="New list name"
                className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyDown={(e) => e.key === 'Enter' && createList()}
              />
              <Button size="icon" onClick={createList}><Plus className="w-3 h-3" /></Button>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{current?.name || 'Select a list'}</CardTitle>
                {activeList && (
                  <div className="flex gap-2">
                    <input
                      value={addSymbol}
                      onChange={(e) => setAddSymbol(e.target.value)}
                      placeholder="Add ticker (e.g. AAPL)"
                      className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                      onKeyDown={(e) => e.key === 'Enter' && addItem()}
                    />
                    <Button size="sm" onClick={addItem}><Plus className="w-4 h-4" />Add</Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!current || current.watchlist_items?.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Add stocks to track them here</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {current.watchlist_items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-6 py-3 hover:bg-zinc-800/50 transition-colors">
                      <Link href={`/stocks/${item.symbol}`} className="flex items-center gap-3 flex-1">
                        <span className="text-sm font-bold text-white">{item.symbol}</span>
                        <span className="text-sm text-zinc-500">{item.name}</span>
                      </Link>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.id)}>
                        <Trash2 className="w-4 h-4 text-zinc-500 hover:text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
