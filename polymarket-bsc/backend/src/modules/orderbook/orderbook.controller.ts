import { Controller, Get, Param, Query } from '@nestjs/common';
import { OrderbookService } from './orderbook.service';
import { Outcome } from '@prisma/client';

@Controller('orderbook')
export class OrderbookController {
  constructor(private readonly orderbookService: OrderbookService) {}

  /**
   * GET /api/orderbook/:marketId
   * 获取订单簿
   */
  @Get(':marketId')
  async getOrderBook(
    @Param('marketId') marketId: string,
    @Query('outcome') outcome: Outcome = Outcome.YES,
  ) {
    return this.orderbookService.getOrderBook(marketId, outcome);
  }

  /**
   * GET /api/orderbook/:marketId/best-prices
   * 获取最佳买卖价
   */
  @Get(':marketId/best-prices')
  async getBestPrices(
    @Param('marketId') marketId: string,
    @Query('outcome') outcome: Outcome = Outcome.YES,
  ) {
    return this.orderbookService.getBestPrices(marketId, outcome);
  }

  /**
   * GET /api/orderbook/:marketId/depth
   * 获取市场深度
   */
  @Get(':marketId/depth')
  async getMarketDepth(
    @Param('marketId') marketId: string,
    @Query('outcome') outcome: Outcome = Outcome.YES,
    @Query('levels') levels?: string,
  ) {
    return this.orderbookService.getMarketDepth(
      marketId,
      outcome,
      levels ? parseInt(levels) : 10,
    );
  }
}
