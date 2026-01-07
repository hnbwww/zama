import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { TradingService } from './trading.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RecordTradeDto } from './dto/record-trade.dto';
import { OrderStatus } from '@prisma/client';

@Controller('trading')
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  /**
   * POST /api/trading/orders
   * 创建订单
   */
  @Post('orders')
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.tradingService.createOrder(dto);
  }

  /**
   * GET /api/trading/orders/:id
   * 获取订单详情
   */
  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    return this.tradingService.getOrder(id);
  }

  /**
   * DELETE /api/trading/orders/:id
   * 取消订单
   */
  @Delete('orders/:id')
  async cancelOrder(
    @Param('id') id: string,
    @Query('userAddress') userAddress: string,
  ) {
    return this.tradingService.cancelOrder(id, userAddress);
  }

  /**
   * GET /api/trading/users/:address/orders
   * 获取用户订单
   */
  @Get('users/:address/orders')
  async getUserOrders(
    @Param('address') address: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.tradingService.getUserOrders(address, status);
  }

  /**
   * GET /api/trading/markets/:id/orders
   * 获取市场订单
   */
  @Get('markets/:id/orders')
  async getMarketOrders(
    @Param('id') marketId: string,
    @Query('status') status?: OrderStatus,
  ) {
    return this.tradingService.getMarketOrders(marketId, status);
  }

  /**
   * POST /api/trading/trades
   * 记录交易（从链上事件）
   */
  @Post('trades')
  async recordTrade(@Body() dto: RecordTradeDto) {
    return this.tradingService.recordTrade(dto);
  }

  /**
   * GET /api/trading/users/:address/trades
   * 获取用户交易历史
   */
  @Get('users/:address/trades')
  async getUserTrades(
    @Param('address') address: string,
    @Query('limit') limit?: string,
  ) {
    return this.tradingService.getUserTrades(
      address,
      limit ? parseInt(limit) : 50,
    );
  }

  /**
   * GET /api/trading/markets/:id/trades
   * 获取市场交易历史
   */
  @Get('markets/:id/trades')
  async getMarketTrades(
    @Param('id') marketId: string,
    @Query('limit') limit?: string,
  ) {
    return this.tradingService.getMarketTrades(
      marketId,
      limit ? parseInt(limit) : 100,
    );
  }

  /**
   * GET /api/trading/users/:address/positions
   * 获取用户持仓
   */
  @Get('users/:address/positions')
  async getUserPositions(@Param('address') address: string) {
    return this.tradingService.getUserPositions(address);
  }

  /**
   * GET /api/trading/users/:address/stats
   * 获取用户统计
   */
  @Get('users/:address/stats')
  async getUserStats(@Param('address') address: string) {
    return this.tradingService.getUserStats(address);
  }
}
