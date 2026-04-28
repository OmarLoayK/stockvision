'use client';

import { useState } from 'react';
import { Newspaper, TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Article {
  headline: string;
  summary: string;
  source: string;
}

interface AISummaryProps {
  articles: Article[];
  symbol?: string;
}

interface SummaryData {
  headline: string;
  keyPoints: string[];
  marketImpact: 'bullish' | 'bearish' | 'neutral';
  impactReasoning: string;
  timeframe: 'short-term' | 'long-term' | 'both';
}

const impactConfig = {
  bullish: { label: 'Bullish', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', Icon: TrendingUp },
  bearish: { label: 'Bearish', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', Icon: TrendingDown },
  neutral: { label: 'Neutral', color: 'text-zinc-400', bg: 'bg-zinc-700/50 border-zinc-600/30', Icon: Minus },
};

export function AISummary({ articles, symbol }: AISummaryProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summarize = async () => {
    if (articles.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articles, symbol }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch {
      setError('Failed to summarize news. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const impact = data ? impactConfig[data.marketImpact] : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-amber-600/20 rounded-lg flex items-center justify-center">
            <Newspaper className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-sm font-semibold text-white">AI News Summary</span>
          {data && impact && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium flex items-center gap-1', impact.bg, impact.color)}>
              <impact.Icon className="w-3 h-3" />
              {impact.label}
            </span>
          )}
        </div>
        {articles.length > 0 && (
          <button
            onClick={summarize}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {data ? 'Refresh' : 'Summarize'}
          </button>
        )}
      </div>

      {/* No articles */}
      {articles.length === 0 && (
        <div className="px-4 py-4 text-sm text-zinc-500">No news articles to summarize.</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-5">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-zinc-400">Summarizing {articles.length} articles with AI...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Idle */}
      {!data && !loading && !error && articles.length > 0 && (
        <div className="px-4 py-4 text-sm text-zinc-500">
          {articles.length} article{articles.length !== 1 ? 's' : ''} available — click Summarize for AI digest.
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="p-4 space-y-3">
          {/* Headline */}
          <p className="text-sm font-semibold text-white leading-snug">{data.headline}</p>

          {/* Impact + Timeframe row */}
          <div className="flex items-center gap-3">
            {impact && (
              <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border', impact.bg, impact.color)}>
                <impact.Icon className="w-3 h-3" />
                <span className="font-medium">{impact.label} Impact</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 capitalize">
              {data.timeframe.replace('-', ' ')}
            </div>
          </div>

          {/* Impact reasoning */}
          <p className="text-xs text-zinc-400 leading-relaxed">{data.impactReasoning}</p>

          {/* Key Points */}
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Key Points</p>
            <ul className="space-y-1.5">
              {data.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                  <span className="text-amber-400 mt-0.5 flex-shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-zinc-600">Educational purposes only — not financial advice</p>
        </div>
      )}
    </div>
  );
}
