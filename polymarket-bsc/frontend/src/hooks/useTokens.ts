'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useContracts, useContractAddresses } from './useContracts';
import { ERC20ABI } from '@/lib/web3/abis';

// Hook to get USDC balance
export function useUSDCBalance(address?: `0x${string}`) {
  const { usdc } = useContractAddresses();

  const { data: balance, isLoading, refetch } = useReadContract({
    address: usdc,
    abi: ERC20ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!usdc,
    },
  });

  return {
    balance: balance ? formatUnits(balance as bigint, 6) : '0', // USDC has 6 decimals
    balanceRaw: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}

// Hook to get token allowance
export function useTokenAllowance(
  tokenAddress?: `0x${string}`,
  ownerAddress?: `0x${string}`,
  spenderAddress?: `0x${string}`
) {
  const { data: allowance, isLoading, refetch } = useReadContract({
    address: tokenAddress,
    abi: ERC20ABI,
    functionName: 'allowance',
    args: ownerAddress && spenderAddress ? [ownerAddress, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!ownerAddress && !!spenderAddress,
    },
  });

  return {
    allowance: allowance as bigint | undefined,
    isLoading,
    refetch,
  };
}

// Hook to approve token spending
export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = async (
    tokenAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    amount: string,
    decimals: number = 6
  ) => {
    try {
      const amountWei = parseUnits(amount, decimals);

      writeContract({
        address: tokenAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [spenderAddress, amountWei],
      });
    } catch (err) {
      console.error('[useApproveToken] Error:', err);
      throw err;
    }
  };

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to check and approve if needed
export function useCheckAndApprove() {
  const { approve, isPending, isConfirming, isSuccess } = useApproveToken();

  const checkAndApprove = async (
    tokenAddress: `0x${string}`,
    ownerAddress: `0x${string}`,
    spenderAddress: `0x${string}`,
    requiredAmount: string,
    decimals: number = 6
  ) => {
    try {
      // In a real implementation, you'd check allowance first
      // For now, we'll just approve the required amount
      await approve(tokenAddress, spenderAddress, requiredAmount, decimals);
    } catch (err) {
      console.error('[useCheckAndApprove] Error:', err);
      throw err;
    }
  };

  return {
    checkAndApprove,
    isPending,
    isConfirming,
    isSuccess,
  };
}

// Hook to get conditional token balance (YES/NO tokens)
export function useConditionalTokenBalance(
  address?: `0x${string}`,
  tokenId?: bigint
) {
  const { ctf } = useContractAddresses();
  const { ConditionalTokensABI } = require('@/lib/web3/abis');

  const { data: balance, isLoading, refetch } = useReadContract({
    address: ctf,
    abi: ConditionalTokensABI,
    functionName: 'balanceOf',
    args: address && tokenId !== undefined ? [address, tokenId] : undefined,
    query: {
      enabled: !!address && !!ctf && tokenId !== undefined,
    },
  });

  return {
    balance: balance ? formatUnits(balance as bigint, 6) : '0',
    balanceRaw: balance as bigint | undefined,
    isLoading,
    refetch,
  };
}
