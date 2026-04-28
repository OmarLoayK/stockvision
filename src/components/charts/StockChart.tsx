'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type HistogramData,
} from 'lightweight-charts';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Candle, TimeFrame, ChartType } from '@/types';

interface StockChartProps {
  symbol: string;
  candles: Candle[];
  loading?: boolean;
  onTimeframeChange?: (tf: TimeFrame) => void;
  timeframe?: TimeFrame;
}

const TIMEFRAMES: TimeFrame[] = ['1D', '1W', '1M', '3M', '1Y', '5Y'];

export function StockChart({
  symbol,
  candles,
  loading,
  onTimeframeChange,
  timeframe = '1M',
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [chartType, setChartType] = useState<ChartType>('candlestick');

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#09090b' },
        textColor: '#a1a1aa',
      },
      grid: {
        vertLines: { color: '#27272a' },
        horzLines: { color: '#27272a' },
      },
      crosshair: { mode: 1 },
      rightPriceScale: { borderColor: '#3f3f46' },
      timeScale: { borderColor: '#3f3f46', timeVisible: true },
      width: containerRef.current.clientWidth,
      height: 380,
    });

    chartRef.current = chart;

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#3b82f620',
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    volumeSeriesRef.current = volumeSeries;

    if (chartType === 'candlestick') {
      const cs = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      });
      candleSeriesRef.current = cs;
    } else {
      const ls = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
      lineSeriesRef.current = ls;
    }

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [chartType]);

  useEffect(() => {
    if (!candles.length) return;

    const sorted = [...candles].sort((a, b) => a.time - b.time);

    if (candleSeriesRef.current) {
      candleSeriesRef.current.setData(
        sorted.map((c) => ({
          time: c.time as CandlestickData['time'],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    }

    if (lineSeriesRef.current) {
      lineSeriesRef.current.setData(
        sorted.map((c) => ({
          time: c.time as LineData['time'],
          value: c.close,
        }))
      );
    }

    if (volumeSeriesRef.current) {
      volumeSeriesRef.current.setData(
        sorted.map((c) => ({
          time: c.time as HistogramData['time'],
          value: c.volume || 0,
          color: c.close >= c.open ? '#10b98130' : '#ef444430',
        }))
      );
    }

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  if (loading) return <Skeleton className="w-full h-[380px]" />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {TIMEFRAMES.map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? 'default' : 'ghost'}
              onClick={() => onTimeframeChange?.(tf)}
            >
              {tf}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={chartType === 'candlestick' ? 'default' : 'ghost'}
            onClick={() => setChartType('candlestick')}
          >
            Candle
          </Button>
          <Button
            size="sm"
            variant={chartType === 'line' ? 'default' : 'ghost'}
            onClick={() => setChartType('line')}
          >
            Line
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="rounded-lg overflow-hidden" />
    </div>
  );
}
