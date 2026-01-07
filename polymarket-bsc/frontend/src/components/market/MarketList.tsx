'use client';

import { useMarkets, useTrendingMarkets } from '@/hooks/useMarkets';
import { MarketCard } from './MarketCard';

interface MarketListProps {
  limit?: number;
  category?: string;
  trending?: boolean;
}

export function MarketList({ limit, category, trending = false }: MarketListProps) {
  const { data: marketsData, isLoading: isLoadingMarkets } = useMarkets({
    category,
    limit,
  });

  const { data: trendingData, isLoading: isLoadingTrending } = useTrendingMarkets(limit);

  const isLoading = trending ? isLoadingTrending : isLoadingMarkets;
  const markets = trending ? trendingData : marketsData?.data;

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(limit || 6)].map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-lg bg-muted"
          />
        ))}
      </div>
    );
  }

  if (!markets || markets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">No markets found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market: any) => (
        <MarketCard key={market.id} market={market} />
      ))}
    </div>
  );
}
