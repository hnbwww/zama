'use client';

import { use } from 'react';
import { useMarket } from '@/hooks/useMarkets';
import { useMarketTrades } from '@/hooks/useTrading';
import { OrderBook } from '@/components/trading/OrderBook';
import { TradeForm } from '@/components/trading/TradeForm';
import { formatDistanceToNow } from 'date-fns';

export default function MarketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: market, isLoading } = useMarket(resolvedParams.id);
  const { data: trades } = useMarketTrades(resolvedParams.id, 20);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-3/4 rounded bg-muted" />
            <div className="h-64 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Market not found</h1>
          </div>
        </div>
      </div>
    );
  }

  const yesPercent = market.yesPrice ? (market.yesPrice * 100).toFixed(1) : '50.0';
  const noPercent = market.noPrice ? (market.noPrice * 100).toFixed(1) : '50.0';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-6">
          <div className="mb-4">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {market.category}
            </span>
          </div>
          <h1 className="mb-4 text-4xl font-bold">{market.title}</h1>
          <p className="text-lg text-muted-foreground">{market.description}</p>

          {/* Market Stats */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="text-sm text-muted-foreground">Volume</div>
              <div className="text-xl font-semibold">
                ${(market.totalVolume || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Liquidity</div>
              <div className="text-xl font-semibold">
                ${(market.liquidity || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ends</div>
              <div className="text-xl font-semibold">
                {formatDistanceToNow(new Date(market.settlementTime), { addSuffix: true })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-xl font-semibold capitalize">{market.status.toLowerCase()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Price & OrderBook */}
          <div className="space-y-8 lg:col-span-2">
            {/* Current Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-green-50 p-6 dark:bg-green-950">
                <div className="text-sm text-muted-foreground">YES</div>
                <div className="mt-2 text-4xl font-bold text-green-600 dark:text-green-400">
                  {yesPercent}%
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  ${market.yesPrice?.toFixed(3) || '0.500'}
                </div>
              </div>
              <div className="rounded-lg border bg-red-50 p-6 dark:bg-red-950">
                <div className="text-sm text-muted-foreground">NO</div>
                <div className="mt-2 text-4xl font-bold text-red-600 dark:text-red-400">
                  {noPercent}%
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  ${market.noPrice?.toFixed(3) || '0.500'}
                </div>
              </div>
            </div>

            {/* Order Book */}
            <OrderBook marketId={resolvedParams.id} />

            {/* Recent Trades */}
            <div className="rounded-lg border">
              <div className="border-b p-4">
                <h3 className="font-semibold">Recent Trades</h3>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {trades && trades.length > 0 ? (
                  trades.map((trade: any) => (
                    <div key={trade.id} className="border-b p-4 text-sm">
                      <div className="flex justify-between">
                        <span className={trade.outcome === 'YES' ? 'text-green-600' : 'text-red-600'}>
                          {trade.outcome}
                        </span>
                        <span className="font-mono">${trade.price.toFixed(3)}</span>
                        <span className="text-muted-foreground">{trade.size.toFixed(0)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    No trades yet
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Trade Form */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <TradeForm marketId={resolvedParams.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
