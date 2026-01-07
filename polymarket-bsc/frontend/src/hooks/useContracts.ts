'use client';

import { useMemo } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { getContract } from 'viem';
import { ConditionalTokensABI, AMMABI, OrderBookABI, ERC20ABI } from '@/lib/web3/abis';

export function useContracts() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();

  const contracts = useMemo(() => {
    if (!publicClient) return null;

    const ctfAddress = process.env.NEXT_PUBLIC_CTF_ADDRESS as `0x${string}`;
    const ammAddress = process.env.NEXT_PUBLIC_AMM_ADDRESS as `0x${string}`;
    const orderBookAddress = process.env.NEXT_PUBLIC_ORDERBOOK_ADDRESS as `0x${string}`;
    const usdcAddress = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;

    if (!ctfAddress || !ammAddress || !orderBookAddress || !usdcAddress) {
      console.warn('[useContracts] Missing contract addresses in environment variables');
      return null;
    }

    return {
      conditionalTokens: getContract({
        address: ctfAddress,
        abi: ConditionalTokensABI,
        client: { public: publicClient, wallet: walletClient },
      }),
      amm: getContract({
        address: ammAddress,
        abi: AMMABI,
        client: { public: publicClient, wallet: walletClient },
      }),
      orderBook: getContract({
        address: orderBookAddress,
        abi: OrderBookABI,
        client: { public: publicClient, wallet: walletClient },
      }),
      usdc: getContract({
        address: usdcAddress,
        abi: ERC20ABI,
        client: { public: publicClient, wallet: walletClient },
      }),
    };
  }, [publicClient, walletClient]);

  return { contracts, address };
}

export function useContractAddresses() {
  return {
    ctf: process.env.NEXT_PUBLIC_CTF_ADDRESS as `0x${string}`,
    amm: process.env.NEXT_PUBLIC_AMM_ADDRESS as `0x${string}`,
    orderBook: process.env.NEXT_PUBLIC_ORDERBOOK_ADDRESS as `0x${string}`,
    usdc: process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`,
  };
}
