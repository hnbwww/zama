'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { useMarketPriceUpdates } from '@/hooks/useWebSocket';

interface TradingViewChartProps {
  marketId: string;
  height?: number;
}

export function TradingViewChart({ marketId, height = 400 }: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

  // Subscribe to real-time price updates
  const priceUpdate = useMarketPriceUpdates(marketId);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1f2937',
      },
      crosshair: {
        mode: 1,
      },
    });

    // Create price line series
    const lineSeries = chart.addLineSeries({
      color: selectedOutcome === 'YES' ? '#22c55e' : '#ef4444',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    // Create volume histogram series
    const volumeSeries = chart.addHistogramSeries({
      color: '#3b82f6',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
    });

    chart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    lineSeriesRef.current = lineSeries;
    volumeSeriesRef.current = volumeSeries;

    // Generate initial mock data
    const now = Math.floor(Date.now() / 1000);
    const data = [];
    const volumeData = [];
    let price = 0.5;

    for (let i = -100; i < 0; i++) {
      price += (Math.random() - 0.5) * 0.02;
      price = Math.max(0.1, Math.min(0.9, price));

      const time = now + i * 60;
      data.push({
        time,
        value: price,
      });

      volumeData.push({
        time,
        value: Math.random() * 10000,
        color: Math.random() > 0.5 ? '#22c55e80' : '#ef444480',
      });
    }

    lineSeries.setData(data);
    volumeSeries.setData(volumeData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [height, selectedOutcome]);

  // Update chart with real-time data
  useEffect(() => {
    if (priceUpdate && lineSeriesRef.current && volumeSeriesRef.current) {
      const price = selectedOutcome === 'YES' ? priceUpdate.yesPrice : priceUpdate.noPrice;
      const time = Math.floor(new Date(priceUpdate.timestamp).getTime() / 1000);

      lineSeriesRef.current.update({
        time,
        value: price,
      });

      volumeSeriesRef.current.update({
        time,
        value: priceUpdate.volume || 0,
        color: price > 0.5 ? '#22c55e80' : '#ef444480',
      });
    }
  }, [priceUpdate, selectedOutcome]);

  // Update line color when outcome changes
  useEffect(() => {
    if (lineSeriesRef.current) {
      lineSeriesRef.current.applyOptions({
        color: selectedOutcome === 'YES' ? '#22c55e' : '#ef4444',
      });
    }
  }, [selectedOutcome]);

  return (
    <div className="rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold">Price Chart</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedOutcome('YES')}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                selectedOutcome === 'YES'
                  ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSelectedOutcome('NO')}
              className={`rounded-lg px-3 py-1 text-sm font-semibold ${
                selectedOutcome === 'NO'
                  ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              NO
            </button>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex gap-2 text-sm">
          <button className="rounded px-2 py-1 hover:bg-muted">1H</button>
          <button className="rounded bg-muted px-2 py-1">24H</button>
          <button className="rounded px-2 py-1 hover:bg-muted">7D</button>
          <button className="rounded px-2 py-1 hover:bg-muted">30D</button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="relative" />

      {/* Footer */}
      <div className="border-t p-4">
        <div className="text-xs text-muted-foreground">
          Powered by TradingView Lightweight Charts • Real-time data via WebSocket
        </div>
      </div>
    </div>
  );
}
