import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useOrderBook(marketId: string, outcome?: 'YES' | 'NO') {
  return useQuery({
    queryKey: ['orderbook', marketId, outcome],
    queryFn: () => apiClient.getOrderBook(marketId, outcome),
    enabled: !!marketId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useBestPrices(marketId: string, outcome?: 'YES' | 'NO') {
  return useQuery({
    queryKey: ['best-prices', marketId, outcome],
    queryFn: () => apiClient.getBestPrices(marketId, outcome),
    enabled: !!marketId,
    refetchInterval: 3000, // Refetch every 3 seconds
  });
}

export function useMarketDepth(marketId: string, outcome?: 'YES' | 'NO', levels?: number) {
  return useQuery({
    queryKey: ['market-depth', marketId, outcome, levels],
    queryFn: () => apiClient.getMarketDepth(marketId, outcome, levels),
    enabled: !!marketId,
  });
}
