'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';

interface SearchResult {
  symbol: string;
  name: string;
}

export function TopBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (symbol: string) => {
    setQuery('');
    setOpen(false);
    router.push(`/stocks/${symbol}`);
  };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center px-6 gap-4">
      <div className="relative flex-1 max-w-sm" ref={ref}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search stocks..."
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        )}
        {open && results.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
            {results.map((r) => (
              <button
                key={r.symbol}
                onClick={() => handleSelect(r.symbol)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <span className="text-sm font-semibold text-blue-400 w-16">{r.symbol}</span>
                <span className="text-sm text-zinc-300 truncate">{r.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
