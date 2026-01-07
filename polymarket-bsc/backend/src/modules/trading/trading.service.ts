import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RecordTradeDto } from './dto/record-trade.dto';
import { OrderStatus, OrderType } from '@prisma/client';

@Injectable()
export class TradingService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建订单
   */
  async createOrder(dto: CreateOrderDto) {
    // 验证市场存在
    const market = await this.prisma.market.findUnique({
      where: { id: dto.marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    // 对于市价单，不需要价格
    if (dto.orderType === OrderType.MARKET && dto.price) {
      throw new BadRequestException('Market orders should not have a price');
    }

    // 对于限价单，必须有价格
    if (dto.orderType === OrderType.LIMIT && !dto.price) {
      throw new BadRequestException('Limit orders must have a price');
    }

    // 创建订单
    const order = await this.prisma.order.create({
      data: {
        marketId: dto.marketId,
        userAddress: dto.userAddress,
        side: dto.side,
        outcome: dto.outcome,
        orderType: dto.orderType,
        price: dto.price,
        size: dto.size,
        signature: dto.signature,
        nonce: BigInt(dto.nonce),
        expiry: dto.expiry ? new Date(dto.expiry * 1000) : null,
        status: OrderStatus.PENDING,
      },
    });

    return order;
  }

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        market: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  /**
   * 获取用户订单
   */
  async getUserOrders(userAddress: string, status?: OrderStatus) {
    const where: any = { userAddress };

    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        market: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 获取市场订单
   */
  async getMarketOrders(marketId: string, status?: OrderStatus) {
    const where: any = { marketId };

    if (status) {
      where.status = status;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: [
        { price: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string, userAddress: string) {
    const order = await this.getOrder(orderId);

    if (order.userAddress !== userAddress) {
      throw new BadRequestException('You can only cancel your own orders');
    }

    if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PARTIALLY_FILLED) {
      throw new BadRequestException('Only pending or partially filled orders can be cancelled');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 更新订单状态（被撮合后）
   */
  async updateOrderFilled(orderId: string, filledAmount: number) {
    const order = await this.getOrder(orderId);

    const newFilled = Number(order.filled) + filledAmount;
    const isFullyFilled = newFilled >= Number(order.size);

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        filled: newFilled,
        status: isFullyFilled ? OrderStatus.FILLED : OrderStatus.PARTIALLY_FILLED,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 记录交易
   */
  async recordTrade(dto: RecordTradeDto) {
    // 创建交易记录
    const trade = await this.prisma.trade.create({
      data: {
        marketId: dto.marketId,
        buyerAddress: dto.buyerAddress,
        sellerAddress: dto.sellerAddress,
        outcome: dto.outcome,
        price: dto.price,
        size: dto.size,
        txHash: dto.txHash,
        blockNumber: BigInt(dto.blockNumber),
      },
    });

    // 更新市场交易量
    await this.prisma.market.update({
      where: { id: dto.marketId },
      data: {
        totalVolume: {
          increment: dto.size * dto.price,
        },
      },
    });

    // 更新用户持仓
    await this.updatePosition(
      dto.marketId,
      dto.buyerAddress,
      dto.outcome,
      dto.size,
      dto.price,
      true,
    );

    await this.updatePosition(
      dto.marketId,
      dto.sellerAddress,
      dto.outcome,
      -dto.size,
      dto.price,
      false,
    );

    // 更新用户统计
    await this.updateUserStats(dto.buyerAddress, dto.size * dto.price);
    await this.updateUserStats(dto.sellerAddress, dto.size * dto.price);

    return trade;
  }

  /**
   * 更新用户持仓
   */
  private async updatePosition(
    marketId: string,
    userAddress: string,
    outcome: any,
    sizeChange: number,
    price: number,
    isBuy: boolean,
  ) {
    const position = await this.prisma.position.findUnique({
      where: {
        marketId_userAddress: {
          marketId,
          userAddress,
        },
      },
    });

    const isYes = outcome === 'YES';
    const costChange = sizeChange * price;

    if (!position) {
      // 创建新持仓
      return this.prisma.position.create({
        data: {
          marketId,
          userAddress,
          yesBalance: isYes ? sizeChange : 0,
          noBalance: isYes ? 0 : sizeChange,
          yesCostBasis: isYes ? costChange : 0,
          noCostBasis: isYes ? 0 : costChange,
        },
      });
    }

    // 更新现有持仓
    const updates: any = {};

    if (isYes) {
      updates.yesBalance = Number(position.yesBalance) + sizeChange;
      updates.yesCostBasis = Number(position.yesCostBasis) + costChange;
    } else {
      updates.noBalance = Number(position.noBalance) + sizeChange;
      updates.noCostBasis = Number(position.noCostBasis) + costChange;
    }

    return this.prisma.position.update({
      where: {
        marketId_userAddress: {
          marketId,
          userAddress,
        },
      },
      data: updates,
    });
  }

  /**
   * 更新用户统计
   */
  private async updateUserStats(userAddress: string, volume: number) {
    const user = await this.prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      // 创建新用户
      return this.prisma.user.create({
        data: {
          address: userAddress,
          totalTrades: 1,
          totalVolume: volume,
        },
      });
    }

    // 更新现有用户
    return this.prisma.user.update({
      where: { address: userAddress },
      data: {
        totalTrades: { increment: 1 },
        totalVolume: { increment: volume },
        lastActive: new Date(),
      },
    });
  }

  /**
   * 获取用户交易历史
   */
  async getUserTrades(userAddress: string, limit: number = 50) {
    return this.prisma.trade.findMany({
      where: {
        OR: [
          { buyerAddress: userAddress },
          { sellerAddress: userAddress },
        ],
      },
      include: {
        market: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 获取市场交易历史
   */
  async getMarketTrades(marketId: string, limit: number = 100) {
    return this.prisma.trade.findMany({
      where: { marketId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 获取用户持仓
   */
  async getUserPositions(userAddress: string) {
    return this.prisma.position.findMany({
      where: { userAddress },
      include: {
        market: true,
      },
    });
  }

  /**
   * 获取用户统计
   */
  async getUserStats(userAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      return {
        address: userAddress,
        totalTrades: 0,
        totalVolume: 0,
        totalPnl: 0,
      };
    }

    return user;
  }
}
