'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

interface LeaderboardEntry {
  rank: number;
  address: string;
  totalVolume: number;
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  marketsTraded: number;
}

type LeaderboardType = 'volume' | 'pnl' | 'trades' | 'winRate';

export default function LeaderboardPage() {
  const [activeType, setActiveType] = useState<LeaderboardType>('volume');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d' | 'all'>('all');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard', activeType, timeframe],
    queryFn: async () => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(
        `${API_URL}/leaderboard?type=${activeType}&timeframe=${timeframe}`
      );
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return response.json();
    },
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-500 text-white">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-400 text-white">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-700 text-white">
          🥉
        </div>
      );
    }
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
        {rank}
      </div>
    );
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <h1 className="mb-2 text-4xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">
            Top traders on Polymarket BSC
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Type Tabs */}
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveType('volume')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeType === 'volume'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              By Volume
            </button>
            <button
              onClick={() => setActiveType('pnl')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeType === 'pnl'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              By P&L
            </button>
            <button
              onClick={() => setActiveType('trades')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeType === 'trades'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              By Trades
            </button>
            <button
              onClick={() => setActiveType('winRate')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                activeType === 'winRate'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              By Win Rate
            </button>
          </div>

          {/* Timeframe Filter */}
          <div className="flex gap-2">
            {(['24h', '7d', '30d', 'all'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {tf === 'all' ? 'All Time' : tf}
              </button>
            ))}
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold">Rank</th>
                  <th className="p-4 text-left text-sm font-semibold">Trader</th>
                  <th className="p-4 text-right text-sm font-semibold">Volume</th>
                  <th className="p-4 text-right text-sm font-semibold">Trades</th>
                  <th className="p-4 text-right text-sm font-semibold">P&L</th>
                  <th className="p-4 text-right text-sm font-semibold">Win Rate</th>
                  <th className="p-4 text-right text-sm font-semibold">Markets</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading leaderboard...
                      </div>
                    </td>
                  </tr>
                ) : leaderboard && leaderboard.length > 0 ? (
                  leaderboard.map((entry: LeaderboardEntry) => (
                    <tr
                      key={entry.address}
                      className="border-b transition-colors hover:bg-muted/30"
                    >
                      <td className="p-4">
                        {getRankBadge(entry.rank)}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/traders/${entry.address}`}
                          className="font-mono text-sm font-medium hover:text-primary"
                        >
                          {formatAddress(entry.address)}
                        </Link>
                      </td>
                      <td className="p-4 text-right font-mono text-sm">
                        ${entry.totalVolume.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-sm">
                        {entry.totalTrades.toLocaleString()}
                      </td>
                      <td className="p-4 text-right">
                        <span
                          className={`font-mono text-sm font-semibold ${
                            entry.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          ${entry.totalPnl >= 0 ? '+' : ''}
                          {entry.totalPnl.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-sm">
                        {entry.winRate.toFixed(1)}%
                      </td>
                      <td className="p-4 text-right font-mono text-sm">
                        {entry.marketsTraded}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-muted-foreground">
                      No data available for the selected timeframe
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 rounded-lg border bg-muted/30 p-6">
          <h2 className="mb-4 text-lg font-semibold">How Rankings Work</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="mb-1 font-semibold text-primary">Volume</h3>
              <p className="text-sm text-muted-foreground">
                Total trading volume in USDC across all markets
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-primary">P&L</h3>
              <p className="text-sm text-muted-foreground">
                Total profit and loss from all closed positions
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-primary">Trades</h3>
              <p className="text-sm text-muted-foreground">
                Total number of trades executed
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-primary">Win Rate</h3>
              <p className="text-sm text-muted-foreground">
                Percentage of profitable positions
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
