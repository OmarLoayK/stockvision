'use client';

import { useState } from 'react';
import { ShieldCheck, TrendingUp, TrendingDown, ArrowRight, Loader2, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Holding {
  symbol: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  totalValue: number;
  gainLossPercent: number;
}

interface AIPortfolioAnalysisProps {
  holdings: Holding[];
  balance: number;
  totalValue: number;
}

interface AnalysisData {
  overallRisk: 'high' | 'medium' | 'low';
  diversificationScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  concentrationRisk: 'high' | 'medium' | 'low';
  cashAllocationComment: string;
  topRiskyHolding: string | null;
  suggestedActions: Array<{
    action: 'buy' | 'sell' | 'hold' | 'reduce';
    symbol: string;
    reason: string;
  }>;
}

const riskColors = {
  high: { text: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20' },
  medium: { text: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20' },
  low: { text: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
};

const actionConfig = {
  buy: { label: 'BUY', color: 'text-emerald-400 bg-emerald-400/10' },
  sell: { label: 'SELL', color: 'text-red-400 bg-red-400/10' },
  hold: { label: 'HOLD', color: 'text-blue-400 bg-blue-400/10' },
  reduce: { label: 'REDUCE', color: 'text-yellow-400 bg-yellow-400/10' },
};

export function AIPortfolioAnalysis({ holdings, balance, totalValue }: AIPortfolioAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const analyze = async () => {
    if (holdings.length === 0) return;
    setLoading(true);
    setError(null);
    setExpanded(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings, balance, totalValue }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch {
      setError('Failed to analyze portfolio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 70 ? 'text-emerald-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600/20 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-sm font-semibold text-white">AI Portfolio Analysis</span>
          {data && (
            <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', riskColors[data.overallRisk].bg, riskColors[data.overallRisk].text)}>
              {data.overallRisk.charAt(0).toUpperCase() + data.overallRisk.slice(1)} Risk
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!data && !loading && holdings.length > 0 && (
            <button
              onClick={analyze}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap className="w-3 h-3" />
              Analyze
            </button>
          )}
          {data && (
            <>
              <button onClick={analyze} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Refresh
              </button>
              <button onClick={() => setExpanded(!expanded)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Empty state */}
      {holdings.length === 0 && (
        <div className="px-4 py-4 text-sm text-zinc-500">Add holdings to your portfolio to get AI analysis.</div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 px-4 py-5">
          <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
          <p className="text-sm text-zinc-400">Analyzing your portfolio with AI...</p>
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
      {!data && !loading && !error && holdings.length > 0 && (
        <div className="px-4 py-4 text-sm text-zinc-500">
          Click Analyze to get AI-powered risk assessment and recommendations.
        </div>
      )}

      {/* Results */}
      {data && expanded && !loading && (
        <div className="p-4 space-y-4">
          {/* Score row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Overall Risk</p>
              <span className={cn('text-sm font-semibold capitalize', riskColors[data.overallRisk].text)}>
                {data.overallRisk}
              </span>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Diversification</p>
              <span className={cn('text-sm font-semibold', scoreColor(data.diversificationScore))}>
                {data.diversificationScore}/100
              </span>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Concentration</p>
              <span className={cn('text-sm font-semibold capitalize', riskColors[data.concentrationRisk].text)}>
                {data.concentrationRisk}
              </span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-zinc-800 rounded-lg p-3">
            <p className="text-xs text-zinc-500 mb-1.5">Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed">{data.summary}</p>
          </div>

          {/* Strengths + Risks */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" /> Strengths
              </p>
              <ul className="space-y-1.5">
                {data.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                    <span className="text-emerald-400 flex-shrink-0">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
                <TrendingDown className="w-3 h-3 text-red-400" /> Risks
              </p>
              <ul className="space-y-1.5">
                {data.risks.map((r, i) => (
                  <li key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                    <span className="text-red-400 flex-shrink-0">!</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Suggested Actions */}
          {data.suggestedActions.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 mb-2">Suggested Actions</p>
              <div className="space-y-2">
                {data.suggestedActions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', actionConfig[a.action].color)}>
                      {actionConfig[a.action].label}
                    </span>
                    <span className="text-xs font-semibold text-white">{a.symbol}</span>
                    <ArrowRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    <span className="text-xs text-zinc-400">{a.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cash comment */}
          <div className="bg-zinc-800/50 rounded-lg px-3 py-2">
            <p className="text-xs text-zinc-500 mb-0.5">Cash Position</p>
            <p className="text-xs text-zinc-300">{data.cashAllocationComment}</p>
          </div>

          <p className="text-xs text-zinc-600">Educational purposes only — not financial advice</p>
        </div>
      )}
    </div>
  );
}
