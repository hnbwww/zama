import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useAccount } from 'wagmi';

export function useUserOrders(status?: string) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-orders', address, status],
    queryFn: () => apiClient.getUserOrders(address!, status),
    enabled: !!address,
  });
}

export function useUserTrades(limit?: number) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-trades', address, limit],
    queryFn: () => apiClient.getUserTrades(address!, limit),
    enabled: !!address,
  });
}

export function useUserPositions() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-positions', address],
    queryFn: () => apiClient.getUserPositions(address!),
    enabled: !!address,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useUserStats() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-stats', address],
    queryFn: () => apiClient.getUserStats(address!),
    enabled: !!address,
  });
}

export function useMarketTrades(marketId: string, limit?: number) {
  return useQuery({
    queryKey: ['market-trades', marketId, limit],
    queryFn: () => apiClient.getMarketTrades(marketId, limit),
    enabled: !!marketId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => apiClient.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderbook'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { address } = useAccount();

  return useMutation({
    mutationFn: (orderId: string) => apiClient.cancelOrder(orderId, address!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orderbook'] });
    },
  });
}
