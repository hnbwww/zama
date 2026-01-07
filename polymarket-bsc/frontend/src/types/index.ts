export interface Market {
  id: string;
  conditionId: string;
  title: string;
  description: string;
  category: string;
  creatorAddress: string;
  settlementTime: string;
  status: 'ACTIVE' | 'RESOLVED' | 'DISPUTED' | 'CANCELLED';
  totalVolume: number;
  liquidity: number;
  yesPrice: number | null;
  noPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  marketId: string;
  userAddress: string;
  side: 'BUY' | 'SELL';
  outcome: 'YES' | 'NO';
  orderType: 'MARKET' | 'LIMIT';
  price: number | null;
  size: number;
  filled: number;
  status: 'PENDING' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'EXPIRED';
  signature: string;
  nonce: string;
  expiry: string | null;
  createdAt: string;
}

export interface Trade {
  id: string;
  marketId: string;
  buyerAddress: string;
  sellerAddress: string;
  outcome: 'YES' | 'NO';
  price: number;
  size: number;
  txHash: string;
  blockNumber: string;
  createdAt: string;
  market?: Market;
}

export interface Position {
  id: string;
  marketId: string;
  userAddress: string;
  yesBalance: number;
  noBalance: number;
  yesCostBasis: number;
  noCostBasis: number;
  realizedPnl: number;
  market?: Market;
}

export interface UserStats {
  address: string;
  totalTrades: number;
  totalVolume: number;
  totalPnl: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  orders: Array<{
    id: string;
    size: number;
    userAddress: string;
  }>;
}

export interface OrderBookData {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  midPrice: number | null;
}
