'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface TradeFormProps {
  marketId: string;
}

export function TradeForm({ marketId }: TradeFormProps) {
  const { address, isConnected } = useAccount();
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [outcome, setOutcome] = useState<'YES' | 'NO'>('YES');
  const [amount, setAmount] = useState('');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [price, setPrice] = useState('');

  const handleTrade = async () => {
    if (!isConnected) return;

    // TODO: Implement trade logic
    console.log('Trade:', { marketId, side, outcome, amount, orderType, price });
  };

  if (!isConnected) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="mb-4 text-muted-foreground">
          Connect your wallet to trade
        </p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-4 text-lg font-semibold">Place Order</h3>

      {/* Side Selector */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setSide('BUY')}
          className={`rounded-lg py-3 font-semibold ${
            side === 'BUY'
              ? 'bg-green-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('SELL')}
          className={`rounded-lg py-3 font-semibold ${
            side === 'SELL'
              ? 'bg-red-600 text-white'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Selector */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Outcome</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setOutcome('YES')}
            className={`rounded-lg py-2 ${
              outcome === 'YES'
                ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400'
                : 'bg-muted'
            }`}
          >
            YES
          </button>
          <button
            onClick={() => setOutcome('NO')}
            className={`rounded-lg py-2 ${
              outcome === 'NO'
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                : 'bg-muted'
            }`}
          >
            NO
          </button>
        </div>
      </div>

      {/* Order Type */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">Order Type</label>
        <select
          value={orderType}
          onChange={(e) => setOrderType(e.target.value as any)}
          className="w-full rounded-lg border bg-background p-2"
        >
          <option value="MARKET">Market Order</option>
          <option value="LIMIT">Limit Order</option>
        </select>
      </div>

      {/* Price (for limit orders) */}
      {orderType === 'LIMIT' && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium">
            Price (0-1)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.65"
            step="0.01"
            min="0"
            max="1"
            className="w-full rounded-lg border bg-background p-2"
          />
        </div>
      )}

      {/* Amount */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium">
          Amount (USDC)
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="100"
          min="0"
          className="w-full rounded-lg border bg-background p-2"
        />
      </div>

      {/* Summary */}
      {amount && (
        <div className="mb-4 rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between">
            <span>Total Cost:</span>
            <span className="font-semibold">{amount} USDC</span>
          </div>
          {orderType === 'LIMIT' && price && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>You receive:</span>
              <span>{(Number(amount) / Number(price)).toFixed(2)} tokens</span>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleTrade}
        disabled={!amount || (orderType === 'LIMIT' && !price)}
        className={`w-full rounded-lg py-3 font-semibold ${
          side === 'BUY'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {side} {outcome}
      </button>
    </div>
  );
}
