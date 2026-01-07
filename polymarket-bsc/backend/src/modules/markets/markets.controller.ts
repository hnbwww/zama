import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { MarketsService } from './markets.service';
import { QueryMarketsDto } from './dto/query-markets.dto';

@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /**
   * GET /api/markets
   * 获取市场列表
   */
  @Get()
  async getMarkets(@Query() query: QueryMarketsDto) {
    return this.marketsService.findAll(query);
  }

  /**
   * GET /api/markets/stats
   * 获取平台统计
   */
  @Get('stats')
  async getStats() {
    return this.marketsService.getStats();
  }

  /**
   * GET /api/markets/trending
   * 获取热门市场
   */
  @Get('trending')
  async getTrending(@Query('limit') limit?: string) {
    return this.marketsService.getTrending(limit ? parseInt(limit) : 10);
  }

  /**
   * GET /api/markets/categories
   * 获取分类列表
   */
  @Get('categories')
  async getCategories() {
    return this.marketsService.getCategories();
  }

  /**
   * GET /api/markets/:id
   * 获取市场详情
   */
  @Get(':id')
  async getMarket(@Param('id') id: string) {
    return this.marketsService.findOne(id);
  }
}
