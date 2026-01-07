'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAMMTrade, useAMMQuote } from '@/hooks/useAMMTrade';
import { useCreateOrder } from '@/hooks/useOrderBookTrade';
import { useApproveToken, useUSDCBalance, useTokenAllowance } from '@/hooks/useTokens';
import { useContractAddresses } from '@/hooks/useContracts';
import { useMarket } from '@/hooks/useMarkets';
import { parseUnits } from 'viem';

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
  const [error, setError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);

  // Get market data
  const { data: market } = useMarket(marketId);

  // Contract addresses
  const { usdc, amm, orderBook } = useContractAddresses();

  // Balance and allowance
  const { balance: usdcBalance } = useUSDCBalance(address);
  const { allowance: ammAllowance, refetch: refetchAMMAllowance } = useTokenAllowance(
    usdc,
    address,
    amm
  );
  const { allowance: orderBookAllowance, refetch: refetchOrderBookAllowance } = useTokenAllowance(
    usdc,
    address,
    orderBook
  );

  // Trading hooks
  const { swap, isPending: isSwapping, isConfirming: isSwapConfirming, isSuccess: isSwapSuccess } = useAMMTrade();
  const { createOrder, isSigning } = useCreateOrder();
  const { approve, isPending: isApproving, isConfirming: isApproveConfirming, isSuccess: isApproveSuccess } = useApproveToken();

  // Quote for market orders
  const conditionId = market?.conditionId as `0x${string}` | undefined;
  const buyYes = outcome === 'YES';
  const { amountOut, fee } = useAMMQuote(
    orderType === 'MARKET' ? conditionId : undefined,
    buyYes,
    amount
  );

  // Check if approval is needed
  useEffect(() => {
    if (!amount || !address) {
      setNeedsApproval(false);
      return;
    }

    const amountWei = parseUnits(amount, 6);
    const currentAllowance = orderType === 'MARKET' ? ammAllowance : orderBookAllowance;

    setNeedsApproval(currentAllowance !== undefined && currentAllowance < amountWei);
  }, [amount, ammAllowance, orderBookAllowance, orderType, address]);

  // Refetch allowances after approval
  useEffect(() => {
    if (isApproveSuccess) {
      if (orderType === 'MARKET') {
        refetchAMMAllowance();
      } else {
        refetchOrderBookAllowance();
      }
    }
  }, [isApproveSuccess, orderType, refetchAMMAllowance, refetchOrderBookAllowance]);

  const handleApprove = async () => {
    if (!amount || !usdc) return;

    try {
      setError(null);
      const spender = orderType === 'MARKET' ? amm : orderBook;
      // Approve a large amount to avoid repeated approvals
      await approve(usdc, spender, '1000000', 6); // 1M USDC
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    }
  };

  const handleTrade = async () => {
    if (!isConnected || !market || !conditionId) return;

    try {
      setError(null);

      if (orderType === 'MARKET') {
        // AMM market order
        await swap({
          conditionId,
          buyYes,
          amount,
          minAmountOut: '0', // In production, set slippage tolerance
        });
      } else {
        // Limit order via OrderBook
        if (!price) {
          setError('Price is required for limit orders');
          return;
        }

        await createOrder({
          conditionId,
          buyYes,
          price,
          size: amount,
          expiry: 0, // No expiry
        });
      }
    } catch (err: any) {
      console.error('Trade error:', err);
      setError(err.message || 'Trade failed');
    }
  };

  // Show success message
  useEffect(() => {
    if (isSwapSuccess) {
      setAmount('');
      setPrice('');
      setError(null);
    }
  }, [isSwapSuccess]);

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

  const isProcessing = isSwapping || isSwapConfirming || isSigning || isApproving || isApproveConfirming;

  return (
    <div className="rounded-lg border p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Place Order</h3>
        <div className="text-sm text-muted-foreground">
          Balance: {parseFloat(usdcBalance).toFixed(2)} USDC
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Success Message */}
      {isSwapSuccess && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600 dark:bg-green-950 dark:text-green-400">
          Trade executed successfully!
        </div>
      )}

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
          {orderType === 'MARKET' && amountOut && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>You receive:</span>
              <span>~{parseFloat(amountOut).toFixed(2)} tokens</span>
            </div>
          )}
          {orderType === 'MARKET' && fee && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>Fee:</span>
              <span>{parseFloat(fee).toFixed(4)} USDC</span>
            </div>
          )}
          {orderType === 'LIMIT' && price && (
            <div className="mt-1 flex justify-between text-muted-foreground">
              <span>You receive:</span>
              <span>{(Number(amount) / Number(price)).toFixed(2)} tokens</span>
            </div>
          )}
        </div>
      )}

      {/* Approval Button */}
      {needsApproval && (
        <button
          onClick={handleApprove}
          disabled={isProcessing}
          className="mb-2 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApproving || isApproveConfirming
            ? 'Approving...'
            : `Approve USDC ${orderType === 'MARKET' ? 'for AMM' : 'for OrderBook'}`}
        </button>
      )}

      {/* Submit Button */}
      <button
        onClick={handleTrade}
        disabled={!amount || (orderType === 'LIMIT' && !price) || needsApproval || isProcessing}
        className={`w-full rounded-lg py-3 font-semibold ${
          side === 'BUY'
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-red-600 text-white hover:bg-red-700'
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        {isProcessing
          ? isSwapping || isSwapConfirming
            ? 'Processing Trade...'
            : isSigning
            ? 'Sign Order...'
            : 'Processing...'
          : `${side} ${outcome}`}
      </button>

      {/* Processing State */}
      {isProcessing && (
        <div className="mt-2 text-center text-sm text-muted-foreground">
          {isSwapping && 'Confirm transaction in wallet...'}
          {isSwapConfirming && 'Waiting for confirmation...'}
          {isSigning && 'Please sign the order in your wallet...'}
          {isApproving && 'Confirm approval in wallet...'}
          {isApproveConfirming && 'Waiting for approval confirmation...'}
        </div>
      )}
    </div>
  );
}
