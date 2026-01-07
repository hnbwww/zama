'use client';

import { useWriteContract, useWaitForTransactionReceipt, useSignTypedData } from 'wagmi';
import { parseUnits } from 'viem';
import { useContractAddresses } from './useContracts';
import { OrderBookABI } from '@/lib/web3/abis';
import { useAccount } from 'wagmi';

interface Order {
  conditionId: `0x${string}`;
  maker: `0x${string}`;
  buyYes: boolean;
  price: string; // e.g., "0.65" for 65%
  size: string;
  filled: string;
  nonce: bigint;
  expiry: bigint;
  signature: `0x${string}`;
}

interface CreateOrderParams {
  conditionId: `0x${string}`;
  buyYes: boolean;
  price: string;
  size: string;
  expiry?: number; // Unix timestamp, 0 for no expiry
}

export function useOrderBookTrade() {
  const { orderBook } = useContractAddresses();
  const { address } = useAccount();
  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const fillOrder = async (order: Order, fillAmount: string) => {
    try {
      const fillAmountWei = parseUnits(fillAmount, 6);

      // Convert order to contract format
      const orderTuple = {
        conditionId: order.conditionId,
        maker: order.maker,
        buyYes: order.buyYes,
        price: parseUnits(order.price, 18), // Price is in 1e18 format
        size: parseUnits(order.size, 6),
        filled: parseUnits(order.filled, 6),
        nonce: order.nonce,
        expiry: order.expiry,
        signature: order.signature,
      };

      writeContract({
        address: orderBook,
        abi: OrderBookABI,
        functionName: 'fillOrder',
        args: [orderTuple, fillAmountWei],
      });
    } catch (err) {
      console.error('[useOrderBookTrade] Fill order error:', err);
      throw err;
    }
  };

  const cancelOrder = async (order: Order) => {
    try {
      const orderTuple = {
        conditionId: order.conditionId,
        maker: order.maker,
        buyYes: order.buyYes,
        price: parseUnits(order.price, 18),
        size: parseUnits(order.size, 6),
        filled: parseUnits(order.filled, 6),
        nonce: order.nonce,
        expiry: order.expiry,
        signature: order.signature,
      };

      writeContract({
        address: orderBook,
        abi: OrderBookABI,
        functionName: 'cancelOrder',
        args: [orderTuple],
      });
    } catch (err) {
      console.error('[useOrderBookTrade] Cancel order error:', err);
      throw err;
    }
  };

  return {
    fillOrder,
    cancelOrder,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

// Hook to sign order (off-chain)
export function useSignOrder() {
  const { signTypedData, data: signature, isPending, error } = useSignTypedData();
  const { address } = useAccount();

  const signOrder = async (params: CreateOrderParams, nonce: bigint) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const domain = {
      name: 'PolymarketBSC',
      version: '1',
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID || 56),
      verifyingContract: process.env.NEXT_PUBLIC_ORDERBOOK_ADDRESS as `0x${string}`,
    };

    const types = {
      Order: [
        { name: 'conditionId', type: 'bytes32' },
        { name: 'maker', type: 'address' },
        { name: 'buyYes', type: 'bool' },
        { name: 'price', type: 'uint256' },
        { name: 'size', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'expiry', type: 'uint256' },
      ],
    };

    const message = {
      conditionId: params.conditionId,
      maker: address,
      buyYes: params.buyYes,
      price: parseUnits(params.price, 18),
      size: parseUnits(params.size, 6),
      nonce,
      expiry: BigInt(params.expiry || 0),
    };

    try {
      signTypedData({
        domain,
        types,
        primaryType: 'Order',
        message,
      });
    } catch (err) {
      console.error('[useSignOrder] Signing error:', err);
      throw err;
    }
  };

  return {
    signOrder,
    signature,
    isPending,
    error,
  };
}

// Combined hook to create and submit order
export function useCreateOrder() {
  const { signOrder, signature, isPending: isSigning } = useSignOrder();
  const { address } = useAccount();

  const createOrder = async (params: CreateOrderParams) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, you would:
      // 1. Get the user's current nonce from the contract
      // 2. Sign the order
      // 3. Submit the signed order to your backend API
      // 4. The backend would store it in the orderbook

      const nonce = BigInt(Date.now()); // Simplified - should get from contract

      await signOrder(params, nonce);

      // After signature is obtained, submit to backend
      if (signature) {
        const order = {
          conditionId: params.conditionId,
          maker: address,
          buyYes: params.buyYes,
          price: params.price,
          size: params.size,
          filled: '0',
          nonce: nonce.toString(),
          expiry: (params.expiry || 0).toString(),
          signature: signature,
        };

        // Submit to backend API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trading/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(order),
        });

        if (!response.ok) {
          throw new Error('Failed to submit order to backend');
        }

        return await response.json();
      }
    } catch (err) {
      console.error('[useCreateOrder] Error:', err);
      throw err;
    }
  };

  return {
    createOrder,
    isSigning,
    signature,
  };
}
