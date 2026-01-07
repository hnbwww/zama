'use client';

import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useUserPositions, useUserTrades, useUserStats, useUserOrders } from '@/hooks/useTrading';
import Link from 'next/link';

export default function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const { data: positions } = useUserPositions();
  const { data: trades } = useUserTrades(50);
  const { data: stats } = useUserStats();
  const { data: orders } = useUserOrders();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="rounded-lg border p-12 text-center">
            <h1 className="mb-4 text-3xl font-bold">Portfolio</h1>
            <p className="mb-6 text-muted-foreground">
              Connect your wallet to view your portfolio
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <h1 className="mb-4 text-3xl font-bold">Portfolio</h1>
          <div className="text-sm text-muted-foreground">
            {address}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total Trades</div>
            <div className="mt-2 text-3xl font-bold">{stats?.totalTrades || 0}</div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total Volume</div>
            <div className="mt-2 text-3xl font-bold">
              ${(stats?.totalVolume || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Total P&L</div>
            <div className={`mt-2 text-3xl font-bold ${
              (stats?.totalPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${(stats?.totalPnl || 0).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border p-6">
            <div className="text-sm text-muted-foreground">Active Positions</div>
            <div className="mt-2 text-3xl font-bold">{positions?.length || 0}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b">
          <div className="flex gap-4">
            <button className="border-b-2 border-primary px-4 py-2 font-semibold">
              Positions
            </button>
            <button className="px-4 py-2 text-muted-foreground">
              Orders
            </button>
            <button className="px-4 py-2 text-muted-foreground">
              History
            </button>
          </div>
        </div>

        {/* Positions */}
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Your Positions</h2>
          </div>
          <div>
            {positions && positions.length > 0 ? (
              positions.map((position: any) => (
                <div key={position.id} className="border-b p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link
                        href={`/markets/${position.market.id}`}
                        className="font-semibold hover:text-primary"
                      >
                        {position.market.title}
                      </Link>
                      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">YES: </span>
                          <span className="font-mono">{position.yesBalance.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">NO: </span>
                          <span className="font-mono">{position.noBalance.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Realized P&L</div>
                      <div className={`text-lg font-semibold ${
                        position.realizedPnl >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${position.realizedPnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                No positions yet. Start trading to see your positions here.
              </div>
            )}
          </div>
        </div>

        {/* Recent Trades */}
        <div className="mt-8 rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Recent Trades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left text-sm font-medium">Market</th>
                  <th className="p-3 text-left text-sm font-medium">Outcome</th>
                  <th className="p-3 text-right text-sm font-medium">Price</th>
                  <th className="p-3 text-right text-sm font-medium">Size</th>
                  <th className="p-3 text-right text-sm font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {trades && trades.length > 0 ? (
                  trades.slice(0, 10).map((trade: any) => (
                    <tr key={trade.id} className="border-b">
                      <td className="p-3 text-sm">
                        <Link href={`/markets/${trade.market.id}`} className="hover:text-primary">
                          {trade.market.title.substring(0, 50)}...
                        </Link>
                      </td>
                      <td className="p-3">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${
                          trade.outcome === 'YES'
                            ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        }`}>
                          {trade.outcome}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-sm">${trade.price.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-sm">{trade.size.toFixed(0)}</td>
                      <td className="p-3 text-right font-mono text-sm">
                        ${(trade.price * trade.size).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      No trades yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
