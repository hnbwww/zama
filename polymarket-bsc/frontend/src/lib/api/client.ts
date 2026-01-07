const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Markets API
  async getMarkets(params?: {
    category?: string;
    search?: string;
    sortBy?: string;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/markets?${query}`);
  }

  async getMarket(id: string) {
    return this.request(`/markets/${id}`);
  }

  async getMarketStats() {
    return this.request('/markets/stats');
  }

  async getTrendingMarkets(limit?: number) {
    return this.request(`/markets/trending?limit=${limit || 10}`);
  }

  async getCategories() {
    return this.request('/markets/categories');
  }

  // Trading API
  async createOrder(data: any) {
    return this.request('/trading/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getOrder(id: string) {
    return this.request(`/trading/orders/${id}`);
  }

  async cancelOrder(id: string, userAddress: string) {
    return this.request(`/trading/orders/${id}?userAddress=${userAddress}`, {
      method: 'DELETE',
    });
  }

  async getUserOrders(address: string, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request(`/trading/users/${address}/orders${query}`);
  }

  async getUserTrades(address: string, limit?: number) {
    return this.request(`/trading/users/${address}/trades?limit=${limit || 50}`);
  }

  async getUserPositions(address: string) {
    return this.request(`/trading/users/${address}/positions`);
  }

  async getUserStats(address: string) {
    return this.request(`/trading/users/${address}/stats`);
  }

  async getMarketTrades(marketId: string, limit?: number) {
    return this.request(`/trading/markets/${marketId}/trades?limit=${limit || 100}`);
  }

  // OrderBook API
  async getOrderBook(marketId: string, outcome?: string) {
    const query = outcome ? `?outcome=${outcome}` : '';
    return this.request(`/orderbook/${marketId}${query}`);
  }

  async getBestPrices(marketId: string, outcome?: string) {
    const query = outcome ? `?outcome=${outcome}` : '';
    return this.request(`/orderbook/${marketId}/best-prices${query}`);
  }

  async getMarketDepth(marketId: string, outcome?: string, levels?: number) {
    const params = new URLSearchParams();
    if (outcome) params.set('outcome', outcome);
    if (levels) params.set('levels', levels.toString());
    const query = params.toString() ? `?${params}` : '';
    return this.request(`/orderbook/${marketId}/depth${query}`);
  }
}

export const apiClient = new ApiClient(API_URL);
