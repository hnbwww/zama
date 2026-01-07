'use client';

import { useEffect, useState } from 'react';
import { useMarketPriceUpdates } from '@/hooks/useWebSocket';

interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
}

interface PriceChartProps {
  marketId: string;
  height?: number;
}

export function PriceChart({ marketId, height = 300 }: PriceChartProps) {
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [selectedOutcome, setSelectedOutcome] = useState<'YES' | 'NO'>('YES');

  // Subscribe to real-time price updates
  const priceUpdate = useMarketPriceUpdates(marketId);

  // Add new price point when update is received
  useEffect(() => {
    if (priceUpdate) {
      setPriceHistory((prev) => {
        const newPoint: PricePoint = {
          timestamp: Date.now(),
          yesPrice: priceUpdate.yesPrice,
          noPrice: priceUpdate.noPrice,
        };

        // Keep last 50 points
        const updated = [...prev, newPoint].slice(-50);
        return updated;
      });
    }
  }, [priceUpdate]);

  // Generate mock data for initial load
  useEffect(() => {
    if (priceHistory.length === 0) {
      const now = Date.now();
      const mockData: PricePoint[] = [];
      let yesPrice = 0.5;

      for (let i = 0; i < 20; i++) {
        yesPrice += (Math.random() - 0.5) * 0.05;
        yesPrice = Math.max(0.1, Math.min(0.9, yesPrice));

        mockData.push({
          timestamp: now - (20 - i) * 60000, // 1 minute intervals
          yesPrice,
          noPrice: 1 - yesPrice,
        });
      }

      setPriceHistory(mockData);
    }
  }, [priceHistory.length]);

  if (priceHistory.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border bg-muted"
        style={{ height }}
      >
        <p className="text-muted-foreground">Loading price data...</p>
      </div>
    );
  }

  const width = 800;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const prices = priceHistory.map((p) =>
    selectedOutcome === 'YES' ? p.yesPrice : p.noPrice
  );
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const priceRange = maxPrice - minPrice || 0.1;

  // Generate SVG path
  const points = priceHistory.map((point, index) => {
    const x = padding + (index / (priceHistory.length - 1)) * chartWidth;
    const price = selectedOutcome === 'YES' ? point.yesPrice : point.noPrice;
    const y = padding + chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  // Generate area fill path
  const areaPoints = [
    `${padding},${padding + chartHeight}`,
    ...points,
    `${padding + chartWidth},${padding + chartHeight}`,
  ];
  const areaPathData = `M ${areaPoints.join(' L ')} Z`;

  const currentPrice = prices[prices.length - 1];
  const priceChange = prices.length > 1 ? currentPrice - prices[0] : 0;
  const priceChangePercent = prices.length > 1 ? (priceChange / prices[0]) * 100 : 0;

  return (
    <div className="rounded-lg border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {(currentPrice * 100).toFixed(1)}¢
            </span>
            <span
              className={`text-sm font-semibold ${
                priceChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {priceChange >= 0 ? '+' : ''}
              {(priceChangePercent).toFixed(2)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedOutcome} Outcome
          </p>
        </div>

        {/* Outcome Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedOutcome('YES')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              selectedOutcome === 'YES'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => setSelectedOutcome('NO')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              selectedOutcome === 'NO'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          style={{ maxHeight: height }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((value) => {
            const y =
              padding +
              chartHeight -
              ((value - minPrice) / priceRange) * chartHeight;
            return (
              <g key={value}>
                <line
                  x1={padding}
                  y1={y}
                  x2={padding + chartWidth}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 10}
                  y={y}
                  textAnchor="end"
                  alignmentBaseline="middle"
                  className="fill-muted-foreground text-xs"
                >
                  {(value * 100).toFixed(0)}¢
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaPathData}
            fill={selectedOutcome === 'YES' ? '#22c55e' : '#ef4444'}
            fillOpacity="0.1"
          />

          {/* Price line */}
          <path
            d={pathData}
            fill="none"
            stroke={selectedOutcome === 'YES' ? '#22c55e' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Current price point */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].split(',')[0]}
              cy={points[points.length - 1].split(',')[1]}
              r="4"
              fill={selectedOutcome === 'YES' ? '#22c55e' : '#ef4444'}
            />
          )}
        </svg>
      </div>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>24h High: {(maxPrice * 100).toFixed(1)}¢</span>
          <span>24h Low: {(minPrice * 100).toFixed(1)}¢</span>
          <span>Data Points: {priceHistory.length}</span>
        </div>
      </div>
    </div>
  );
}
