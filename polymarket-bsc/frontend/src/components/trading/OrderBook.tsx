'use client';

import { useOrderBook } from '@/hooks/useOrderBook';

interface OrderBookProps {
  marketId: string;
  outcome?: 'YES' | 'NO';
}

export function OrderBook({ marketId, outcome = 'YES' }: OrderBookProps) {
  const { data: orderbook, isLoading } = useOrderBook(marketId, outcome);

  if (isLoading) {
    return <div className="animate-pulse">Loading orderbook...</div>;
  }

  if (!orderbook) {
    return <div>No orderbook data</div>;
  }

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Order Book - {outcome}</h3>
        {orderbook.spread && (
          <div className="mt-1 text-sm text-muted-foreground">
            Spread: {(orderbook.spread * 100).toFixed(2)}%
          </div>
        )}
      </div>

      {/* Order Book */}
      <div className="grid grid-cols-2">
        {/* Bids (Buy Orders) */}
        <div className="border-r">
          <div className="border-b bg-green-50 p-2 text-xs font-medium dark:bg-green-950">
            <div className="grid grid-cols-3 gap-2">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {orderbook.bids?.slice(0, 15).map((level: any, i: number) => (
              <div
                key={i}
                className="border-b p-2 text-xs hover:bg-muted/50"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-mono text-green-600 dark:text-green-400">
                    {level.price.toFixed(3)}
                  </div>
                  <div className="text-right font-mono">
                    {level.size.toFixed(0)}
                  </div>
                  <div className="text-right font-mono text-muted-foreground">
                    {(level.price * level.size).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Asks (Sell Orders) */}
        <div>
          <div className="border-b bg-red-50 p-2 text-xs font-medium dark:bg-red-950">
            <div className="grid grid-cols-3 gap-2">
              <div>Price</div>
              <div className="text-right">Size</div>
              <div className="text-right">Total</div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {orderbook.asks?.slice(0, 15).map((level: any, i: number) => (
              <div
                key={i}
                className="border-b p-2 text-xs hover:bg-muted/50"
              >
                <div className="grid grid-cols-3 gap-2">
                  <div className="font-mono text-red-600 dark:text-red-400">
                    {level.price.toFixed(3)}
                  </div>
                  <div className="text-right font-mono">
                    {level.size.toFixed(0)}
                  </div>
                  <div className="text-right font-mono text-muted-foreground">
                    {(level.price * level.size).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mid Price */}
      {orderbook.midPrice && (
        <div className="border-t bg-muted/30 p-2 text-center text-sm">
          Mid Price: <span className="font-mono font-semibold">{orderbook.midPrice.toFixed(3)}</span>
        </div>
      )}
    </div>
  );
}
