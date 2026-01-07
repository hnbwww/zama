'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface Position {
  id: string;
  market: {
    id: string;
    title: string;
  };
  yesBalance: number;
  noBalance: number;
  realizedPnl: number;
}

interface PositionPieChartProps {
  positions: Position[];
}

const COLORS = [
  '#22c55e', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function PositionPieChart({ positions }: PositionPieChartProps) {
  const chartData = useMemo(() => {
    // Group by market and calculate total shares per market
    const marketMap = new Map<string, { title: string; shares: number }>();

    positions.forEach((position) => {
      const totalShares = position.yesBalance + position.noBalance;
      const existing = marketMap.get(position.market.id);
      if (existing) {
        existing.shares += totalShares;
      } else {
        marketMap.set(position.market.id, {
          title: position.market.title,
          shares: totalShares,
        });
      }
    });

    // Convert to array and sort by shares
    return Array.from(marketMap.entries())
      .map(([marketId, data]) => ({
        marketId,
        name: data.title.length > 40 ? data.title.slice(0, 37) + '...' : data.title,
        fullName: data.title,
        value: data.shares,
      }))
      .sort((a, b) => b.value - a.value);
  }, [positions]);

  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">No positions to display</p>
      </div>
    );
  }

  const renderCustomLabel = (entry: any) => {
    const percentage = ((entry.value / totalValue) * 100).toFixed(1);
    return `${percentage}%`;
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => `${value.toFixed(2)} shares`}
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry: any) => {
              const percentage = ((entry.payload.value / totalValue) * 100).toFixed(1);
              return `${value} (${percentage}%)`;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Summary */}
      <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total Shares</p>
          <p className="mt-1 text-lg font-semibold">{totalValue.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Markets</p>
          <p className="mt-1 text-lg font-semibold">{chartData.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Positions</p>
          <p className="mt-1 text-lg font-semibold">{positions.length}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Avg per Market</p>
          <p className="mt-1 text-lg font-semibold">
            {chartData.length > 0 ? (totalValue / chartData.length).toFixed(2) : '0.00'}
          </p>
        </div>
      </div>
    </div>
  );
}
