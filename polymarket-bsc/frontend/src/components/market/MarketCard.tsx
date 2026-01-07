'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface MarketCardProps {
  market: {
    id: string;
    title: string;
    category: string;
    yesPrice: number | null;
    noPrice: number | null;
    totalVolume: number;
    settlementTime: string;
  };
}

export function MarketCard({ market }: MarketCardProps) {
  const yesPercent = market.yesPrice ? (market.yesPrice * 100).toFixed(1) : '50.0';
  const noPercent = market.noPrice ? (market.noPrice * 100).toFixed(1) : '50.0';

  return (
    <Link href={`/markets/${market.id}`}>
      <div className="rounded-lg border bg-card p-6 transition-shadow hover:shadow-lg">
        {/* Category Badge */}
        <div className="mb-3">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {market.category}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-4 line-clamp-2 text-lg font-semibold">
          {market.title}
        </h3>

        {/* Prices */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded bg-green-50 p-3 dark:bg-green-950">
            <div className="text-sm text-muted-foreground">YES</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {yesPercent}%
            </div>
          </div>
          <div className="rounded bg-red-50 p-3 dark:bg-red-950">
            <div className="text-sm text-muted-foreground">NO</div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {noPercent}%
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            Volume: ${(market.totalVolume || 0).toLocaleString()}
          </div>
          <div>
            Ends {formatDistanceToNow(new Date(market.settlementTime), { addSuffix: true })}
          </div>
        </div>
      </div>
    </Link>
  );
}
