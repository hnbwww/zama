import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OrderbookService } from '../orderbook/orderbook.service';
import { MarketsService } from '../markets/markets.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private subscriptions: Map<string, Set<string>> = new Map(); // marketId -> Set<socketId>

  constructor(
    private orderbookService: OrderbookService,
    private marketsService: MarketsService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`🔌 Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`🔌 Client disconnected: ${client.id}`);

    // 清理订阅
    this.subscriptions.forEach((sockets, marketId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.subscriptions.delete(marketId);
      }
    });
  }

  /**
   * 订阅市场更新
   */
  @SubscribeMessage('subscribe:market')
  async handleSubscribeMarket(
    @MessageBody() data: { marketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { marketId } = data;

    if (!this.subscriptions.has(marketId)) {
      this.subscriptions.set(marketId, new Set());
    }

    this.subscriptions.get(marketId)!.add(client.id);
    client.join(`market:${marketId}`);

    console.log(`📡 Client ${client.id} subscribed to market ${marketId}`);

    // 发送当前订单簿状态
    const orderbook = await this.orderbookService.getOrderBook(marketId);
    client.emit('orderbook:update', { marketId, orderbook });

    return { success: true, marketId };
  }

  /**
   * 取消订阅市场
   */
  @SubscribeMessage('unsubscribe:market')
  handleUnsubscribeMarket(
    @MessageBody() data: { marketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { marketId } = data;

    if (this.subscriptions.has(marketId)) {
      this.subscriptions.get(marketId)!.delete(client.id);
    }

    client.leave(`market:${marketId}`);

    console.log(`📡 Client ${client.id} unsubscribed from market ${marketId}`);

    return { success: true, marketId };
  }

  /**
   * 广播价格更新
   */
  broadcastPriceUpdate(marketId: string, data: any) {
    this.server.to(`market:${marketId}`).emit('price:update', {
      marketId,
      ...data,
    });
  }

  /**
   * 广播订单簿更新
   */
  async broadcastOrderbookUpdate(marketId: string) {
    const orderbook = await this.orderbookService.getOrderBook(marketId);
    this.server.to(`market:${marketId}`).emit('orderbook:update', {
      marketId,
      orderbook,
    });
  }

  /**
   * 广播交易更新
   */
  broadcastTrade(marketId: string, trade: any) {
    this.server.to(`market:${marketId}`).emit('trade:new', {
      marketId,
      trade,
    });
  }

  /**
   * 广播市场统计更新
   */
  async broadcastMarketStats() {
    const stats = await this.marketsService.getStats();
    this.server.emit('stats:update', stats);
  }
}
