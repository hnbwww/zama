import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrderSide, Outcome, OrderStatus } from '@prisma/client';

interface PriceLevel {
  price: number;
  size: number;
  orders: any[];
}

interface OrderBookState {
  bids: PriceLevel[]; // 买单（降序）
  asks: PriceLevel[]; // 卖单（升序）
}

@Injectable()
export class OrderbookService {
  private orderBooks: Map<string, OrderBookState> = new Map();

  constructor(private prisma: PrismaService) {}

  /**
   * 获取市场订单簿
   */
  async getOrderBook(marketId: string, outcome: Outcome = Outcome.YES) {
    // 从数据库获取活跃订单
    const orders = await this.prisma.order.findMany({
      where: {
        marketId,
        outcome,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED],
        },
      },
      orderBy: [
        { price: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // 构建订单簿
    const bids: PriceLevel[] = [];
    const asks: PriceLevel[] = [];

    const bidMap = new Map<number, PriceLevel>();
    const askMap = new Map<number, PriceLevel>();

    for (const order of orders) {
      const price = Number(order.price);
      const remainingSize = Number(order.size) - Number(order.filled);

      if (remainingSize <= 0) continue;

      if (order.side === OrderSide.BUY) {
        if (!bidMap.has(price)) {
          bidMap.set(price, { price, size: 0, orders: [] });
        }
        const level = bidMap.get(price)!;
        level.size += remainingSize;
        level.orders.push({
          id: order.id,
          size: remainingSize,
          userAddress: order.userAddress,
        });
      } else {
        if (!askMap.has(price)) {
          askMap.set(price, { price, size: 0, orders: [] });
        }
        const level = askMap.get(price)!;
        level.size += remainingSize;
        level.orders.push({
          id: order.id,
          size: remainingSize,
          userAddress: order.userAddress,
        });
      }
    }

    // 转换为数组并排序
    const bidsArray = Array.from(bidMap.values()).sort((a, b) => b.price - a.price);
    const asksArray = Array.from(askMap.values()).sort((a, b) => a.price - b.price);

    return {
      bids: bidsArray,
      asks: asksArray,
      spread: asksArray.length && bidsArray.length
        ? asksArray[0].price - bidsArray[0].price
        : 0,
      midPrice: asksArray.length && bidsArray.length
        ? (asksArray[0].price + bidsArray[0].price) / 2
        : null,
    };
  }

  /**
   * 获取最佳买卖价
   */
  async getBestPrices(marketId: string, outcome: Outcome = Outcome.YES) {
    const [bestBid, bestAsk] = await Promise.all([
      this.prisma.order.findFirst({
        where: {
          marketId,
          outcome,
          side: OrderSide.BUY,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED],
          },
        },
        orderBy: { price: 'desc' },
      }),
      this.prisma.order.findFirst({
        where: {
          marketId,
          outcome,
          side: OrderSide.SELL,
          status: {
            in: [OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED],
          },
        },
        orderBy: { price: 'asc' },
      }),
    ]);

    return {
      bestBid: bestBid ? Number(bestBid.price) : null,
      bestAsk: bestAsk ? Number(bestAsk.price) : null,
      spread: bestBid && bestAsk
        ? Number(bestAsk.price) - Number(bestBid.price)
        : null,
    };
  }

  /**
   * 撮合订单（简化版本，实际应该在链下进行）
   */
  async matchOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // 获取对手方订单
    const counterOrders = await this.prisma.order.findMany({
      where: {
        marketId: order.marketId,
        outcome: order.outcome,
        side: order.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.PARTIALLY_FILLED],
        },
        // 价格匹配条件
        price: order.side === OrderSide.BUY
          ? { lte: order.price } // 买单：对手卖价 <= 买价
          : { gte: order.price }, // 卖单：对手买价 >= 卖价
      },
      orderBy: [
        { price: order.side === OrderSide.BUY ? 'asc' : 'desc' },
        { createdAt: 'asc' },
      ],
    });

    const matches = [];
    let remainingSize = Number(order.size) - Number(order.filled);

    for (const counterOrder of counterOrders) {
      if (remainingSize <= 0) break;

      const counterRemaining = Number(counterOrder.size) - Number(counterOrder.filled);
      const matchSize = Math.min(remainingSize, counterRemaining);
      const matchPrice = Number(counterOrder.price); // 取对手价

      matches.push({
        orderId: order.id,
        counterOrderId: counterOrder.id,
        size: matchSize,
        price: matchPrice,
        buyer: order.side === OrderSide.BUY ? order.userAddress : counterOrder.userAddress,
        seller: order.side === OrderSide.SELL ? order.userAddress : counterOrder.userAddress,
      });

      remainingSize -= matchSize;
    }

    return matches;
  }

  /**
   * 获取市场深度
   */
  async getMarketDepth(marketId: string, outcome: Outcome = Outcome.YES, levels: number = 10) {
    const orderBook = await this.getOrderBook(marketId, outcome);

    return {
      bids: orderBook.bids.slice(0, levels),
      asks: orderBook.asks.slice(0, levels),
      totalBidVolume: orderBook.bids.reduce((sum, level) => sum + level.size, 0),
      totalAskVolume: orderBook.asks.reduce((sum, level) => sum + level.size, 0),
    };
  }
}
