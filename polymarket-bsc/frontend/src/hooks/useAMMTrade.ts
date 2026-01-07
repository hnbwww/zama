'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useContractAddresses } from './useContracts';
import { AMMABI } from '@/lib/web3/abis';

interface SwapParams {
  conditionId: `0x${string}`;
  buyYes: boolean;
  amount: string;
  minAmountOut?: string;
}

export function useAMMTrade() {
  const { amm } = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const [lastSwapResult, setLastSwapResult] = useState<string | null>(null);

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const swap = async ({ conditionId, buyYes, amount, minAmountOut = '0' }: SwapParams) => {
    try {
      const amountWei = parseUnits(amount, 6); // USDC decimals
      const minAmountOutWei = parseUnits(minAmountOut, 6);

      writeContract({
        address: amm,
        abi: AMMABI,
        functionName: 'swap',
        args: [conditionId, buyYes, amountWei, minAmountOutWei],
      });
    } catch (err) {
      console.error('[useAMMTrade] Swap error:', err);
      throw err;
    }
  };

  return {
    swap,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    lastSwapResult,
  };
}

// Hook to get AMM price quote
export function useAMMQuote(conditionId?: `0x${string}`, buyYes?: boolean, amountIn?: string) {
  const { amm } = useContractAddresses();

  const { data, isLoading } = useReadContract({
    address: amm,
    abi: AMMABI,
    functionName: 'getAmountOut',
    args:
      conditionId && buyYes !== undefined && amountIn
        ? [conditionId, buyYes, parseUnits(amountIn, 6)]
        : undefined,
    query: {
      enabled: !!conditionId && buyYes !== undefined && !!amountIn && !!amm,
    },
  });

  const amountOut = data ? formatUnits((data as any)[0] as bigint, 6) : '0';
  const fee = data ? formatUnits((data as any)[1] as bigint, 6) : '0';

  return {
    amountOut,
    fee,
    isLoading,
  };
}

// Hook to get current AMM prices
export function useAMMPrices(conditionId?: `0x${string}`) {
  const { amm } = useContractAddresses();

  const { data, isLoading, refetch } = useReadContract({
    address: amm,
    abi: AMMABI,
    functionName: 'getPrice',
    args: conditionId ? [conditionId] : undefined,
    query: {
      enabled: !!conditionId && !!amm,
    },
  });

  // Prices are returned as values between 0 and 1e18
  const yesPrice = data ? Number(formatUnits((data as any)[0] as bigint, 18)) : 0.5;
  const noPrice = data ? Number(formatUnits((data as any)[1] as bigint, 18)) : 0.5;

  return {
    yesPrice,
    noPrice,
    isLoading,
    refetch,
  };
}

// Hook to add liquidity
export function useAddLiquidity() {
  const { amm } = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const addLiquidity = async (conditionId: `0x${string}`, collateralAmount: string) => {
    try {
      const amountWei = parseUnits(collateralAmount, 6);

      writeContract({
        address: amm,
        abi: AMMABI,
        functionName: 'addLiquidity',
        args: [conditionId, amountWei],
      });
    } catch (err) {
      console.error('[useAddLiquidity] Error:', err);
      throw err;
    }
  };

  return {
    addLiquidity,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to remove liquidity
export function useRemoveLiquidity() {
  const { amm } = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const removeLiquidity = async (conditionId: `0x${string}`, liquidityAmount: string) => {
    try {
      const amountWei = parseUnits(liquidityAmount, 18); // LP tokens have 18 decimals

      writeContract({
        address: amm,
        abi: AMMABI,
        functionName: 'removeLiquidity',
        args: [conditionId, amountWei],
      });
    } catch (err) {
      console.error('[useRemoveLiquidity] Error:', err);
      throw err;
    }
  };

  return {
    removeLiquidity,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}
