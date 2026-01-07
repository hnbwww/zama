'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
}

interface MarketUpdate {
  marketId: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  timestamp: string;
}

interface OrderBookUpdate {
  marketId: string;
  outcome: 'YES' | 'NO';
  bids: Array<{ price: number; size: number; total: number }>;
  asks: Array<{ price: number; size: number; total: number }>;
  spread: number;
  midPrice: number;
}

interface TradeUpdate {
  id: string;
  marketId: string;
  outcome: 'YES' | 'NO';
  price: number;
  amount: number;
  timestamp: string;
}

interface StatsUpdate {
  totalVolume: string;
  totalMarkets: number;
  activeMarkets: number;
  totalUsers: number;
}

export function useWebSocket(config: WebSocketConfig = {}) {
  const { url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001', autoConnect = true } = config;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [url, autoConnect]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
    }
  }, []);

  return {
    socket,
    isConnected,
    disconnect,
  };
}

// Hook for subscribing to market price updates
export function useMarketPriceUpdates(marketId: string | null) {
  const { socket, isConnected } = useWebSocket();
  const [priceData, setPriceData] = useState<MarketUpdate | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !marketId) return;

    const handlePriceUpdate = (data: MarketUpdate) => {
      if (data.marketId === marketId) {
        setPriceData(data);
      }
    };

    socket.on('price:update', handlePriceUpdate);
    socket.emit('subscribe:market', marketId);

    return () => {
      socket.off('price:update', handlePriceUpdate);
      socket.emit('unsubscribe:market', marketId);
    };
  }, [socket, isConnected, marketId]);

  return priceData;
}

// Hook for subscribing to orderbook updates
export function useOrderBookUpdates(marketId: string | null, outcome?: 'YES' | 'NO') {
  const { socket, isConnected } = useWebSocket();
  const [orderBookData, setOrderBookData] = useState<OrderBookUpdate | null>(null);

  useEffect(() => {
    if (!socket || !isConnected || !marketId) return;

    const handleOrderBookUpdate = (data: OrderBookUpdate) => {
      if (data.marketId === marketId && (!outcome || data.outcome === outcome)) {
        setOrderBookData(data);
      }
    };

    socket.on('orderbook:update', handleOrderBookUpdate);
    socket.emit('subscribe:orderbook', { marketId, outcome });

    return () => {
      socket.off('orderbook:update', handleOrderBookUpdate);
      socket.emit('unsubscribe:orderbook', { marketId, outcome });
    };
  }, [socket, isConnected, marketId, outcome]);

  return orderBookData;
}

// Hook for subscribing to new trades
export function useTradeUpdates(marketId: string | null) {
  const { socket, isConnected } = useWebSocket();
  const [trades, setTrades] = useState<TradeUpdate[]>([]);

  useEffect(() => {
    if (!socket || !isConnected || !marketId) return;

    const handleNewTrade = (data: TradeUpdate) => {
      if (data.marketId === marketId) {
        setTrades((prev) => [data, ...prev].slice(0, 50)); // Keep last 50 trades
      }
    };

    socket.on('trade:new', handleNewTrade);
    socket.emit('subscribe:trades', marketId);

    return () => {
      socket.off('trade:new', handleNewTrade);
      socket.emit('unsubscribe:trades', marketId);
    };
  }, [socket, isConnected, marketId]);

  return trades;
}

// Hook for platform stats updates
export function useStatsUpdates() {
  const { socket, isConnected } = useWebSocket();
  const [stats, setStats] = useState<StatsUpdate | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleStatsUpdate = (data: StatsUpdate) => {
      setStats(data);
    };

    socket.on('stats:update', handleStatsUpdate);

    return () => {
      socket.off('stats:update', handleStatsUpdate);
    };
  }, [socket, isConnected]);

  return stats;
}
