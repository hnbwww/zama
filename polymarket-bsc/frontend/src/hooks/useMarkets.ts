import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export function useMarkets(params?: {
  category?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['markets', params],
    queryFn: () => apiClient.getMarkets(params),
  });
}

export function useMarket(id: string) {
  return useQuery({
    queryKey: ['market', id],
    queryFn: () => apiClient.getMarket(id),
    enabled: !!id,
  });
}

export function useMarketStats() {
  return useQuery({
    queryKey: ['market-stats'],
    queryFn: () => apiClient.getMarketStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useTrendingMarkets(limit?: number) {
  return useQuery({
    queryKey: ['trending-markets', limit],
    queryFn: () => apiClient.getTrendingMarkets(limit),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => apiClient.getCategories(),
  });
}
