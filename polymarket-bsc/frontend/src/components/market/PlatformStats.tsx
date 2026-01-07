'use client';

import { useMarketStats } from '@/hooks/useMarkets';

export function PlatformStats() {
  const { data: stats, isLoading } = useMarketStats();

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Markets"
        value={stats?.totalMarkets || 0}
      />
      <StatCard
        title="Active Markets"
        value={stats?.activeMarkets || 0}
      />
      <StatCard
        title="Total Volume"
        value={`$${((stats?.totalVolume || 0) / 1000000).toFixed(1)}M`}
      />
      <StatCard
        title="Total Users"
        value={stats?.totalUsers || 0}
      />
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}
