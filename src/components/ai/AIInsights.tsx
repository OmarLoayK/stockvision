'use client';

import { useState } from 'react';
import { Brain, TrendingUp, TrendingDown, Minus, AlertTriangle, Zap, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsProps {
  symbol: string;
  quote: {
    price?: number;
    changePercent?: number;
    high52Week?: number;
    low52Week?: number;
    volume?: number;
    marketCap?: number;
  };
  candles?: { close: number }[];
}

interface InsightsData {
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  summary: string;
  keyPoints: string[];
  support: number | null;
  resistance: number | null;
  rsiSignal: 'overbought' | 'oversold' | 'neutral';
  trendSignal: 'uptrend' | 'downtrend' | 'sideways';
  risk: 'high' | 'medium' | 'low';
}

const signalConfig = {
  bullish: { label: 'Bullish', color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20', Icon: TrendingUp },
  bearish: { label: 'Bearish', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', Icon: TrendingDown },
  neutral: { label: 'Neutral', color: 'text-zinc-400', bg: 'bg-zinc-400/10 border-zinc-400/20', Icon: Minus },
};

const riskConfig = {
  high: 'text-red-400 bg-red-400/10',
  medium: 'text-yellow-400 bg-yellow-400/10',
  low: 'text-emerald-400 bg-emerald-400/10',
};

export function AIInsights({ symbol, quote, candles }: AIInsightsProps) {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, quote, candles }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch {
      setError('Failed to generate insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const signal = data ? signalConfig[data.signal] : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-purple-600/20 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-sm font-semibold text-white">AI Insights</span>
          {data && signal && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', signal.bg, signal.color)}>
              {signal.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!data && !loading && (
            <button
              onClick={analyze}
              className="flex items-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap className="w-3 h-3" />
              Analyze
            </button>
          )}
          {data && (
            <>
              <button
                onClick={analyze}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Refresh
              </button>
              <button onClick={() => setExpanded(!expanded)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-5">
          <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-zinc-400">Analyzing {symbol} with AI...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-2 px-4 py-4 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Idle state */}
      {!data && !loading && !error && (
        <div className="px-4 py-4 text-sm text-zinc-500">
          Click Analyze to get AI-powered technical insights for {symbol}.
        </div>
      )}

      {/* Results */}
      {data && expanded && !loading && (
        <div className="p-4 space-y-4">
          {/* Signal + Strength row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Signal</p>
              <div className="flex items-center gap-1.5">
                {signal && <signal.Icon className={cn('w-4 h-4', signal.color)} />}
                <span className={cn('text-sm font-semibold capitalize', signal?.color)}>{data.signal}</span>
              </div>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Trend</p>
              <span className="text-sm font-medium text-white capitalize">{data.trendSignal.replace('trend', '')}</span>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Risk</p>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full capitalize', riskConfig[data.risk])}>
                {data.risk}
              </span>
            </div>
          </div>

          {/* RSI + Support/Resistance */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">RSI Signal</p>
              <span className={cn(
                'text-xs font-medium capitalize',
                data.rsiSignal === 'overbought' ? 'text-red-400' : data.rsiSignal === 'oversold' ? 'text-emerald-400' : 'text-zinc-300'
              )}>
                {data.rsiSignal}
              </span>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Support</p>
              <span className="text-sm font-medium text-emerald-400">
                {data.support ? `$${data.support.toFixed(2)}` : 'N/A'}
              </span>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Resistance</p>
              <span className="text-sm font-medium text-red-400">
                {data.resistance ? `$${data.resistance.toFixed(2)}` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1.5">Analysis</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
          </div>

          {/* Key Points */}
          <div>
            <p className="text-xs text-zinc-500 mb-2">Key Points</p>
            <ul className="space-y-1.5">
              {data.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span>
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
