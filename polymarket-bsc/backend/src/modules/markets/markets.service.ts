import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateMarketDto } from './dto/create-market.dto';
import { QueryMarketsDto, MarketSortBy } from './dto/query-markets.dto';
import { MarketStatus } from '@prisma/client';

@Injectable()
export class MarketsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取市场列表
   */
  async findAll(query: QueryMarketsDto) {
    const { category, search, sortBy, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {
      status: MarketStatus.ACTIVE,
    };

    if (category && category !== 'all') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // 构建排序
    let orderBy: any = {};
    switch (sortBy) {
      case MarketSortBy.VOLUME:
        orderBy = { totalVolume: 'desc' };
        break;
      case MarketSortBy.ENDING_SOON:
        orderBy = { settlementTime: 'asc' };
        break;
      case MarketSortBy.NEWEST:
        orderBy = { createdAt: 'desc' };
        break;
      default:
        orderBy = { totalVolume: 'desc' };
    }

    // 执行查询
    const [markets, total] = await Promise.all([
      this.prisma.market.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.market.count({ where }),
    ]);

    return {
      data: markets,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取单个市场详情
   */
  async findOne(id: string) {
    const market = await this.prisma.market.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
            trades: true,
            positions: true,
          },
        },
      },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${id} not found`);
    }

    return market;
  }

  /**
   * 根据 conditionId 获取市场
   */
  async findByConditionId(conditionId: string) {
    const market = await this.prisma.market.findUnique({
      where: { conditionId },
    });

    if (!market) {
      throw new NotFoundException(`Market with conditionId ${conditionId} not found`);
    }

    return market;
  }

  /**
   * 创建市场（从链上事件同步）
   */
  async createFromBlockchain(data: {
    conditionId: string;
    title: string;
    description: string;
    category: string;
    creatorAddress: string;
    settlementTime: Date;
    resolutionSource: string;
    contractAddress?: string;
  }) {
    return this.prisma.market.create({
      data: {
        conditionId: data.conditionId,
        title: data.title,
        description: data.description,
        category: data.category,
        creatorAddress: data.creatorAddress,
        settlementTime: data.settlementTime,
        settlementSource: data.resolutionSource,
        contractAddress: data.contractAddress,
        status: MarketStatus.ACTIVE,
      },
    });
  }

  /**
   * 更新市场价格
   */
  async updatePrices(conditionId: string, yesPrice: number, noPrice: number) {
    return this.prisma.market.update({
      where: { conditionId },
      data: {
        yesPrice,
        noPrice,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 更新市场交易量
   */
  async updateVolume(conditionId: string, volumeToAdd: number) {
    const market = await this.findByConditionId(conditionId);

    return this.prisma.market.update({
      where: { conditionId },
      data: {
        totalVolume: {
          increment: volumeToAdd,
        },
      },
    });
  }

  /**
   * 结算市场
   */
  async resolveMarket(conditionId: string, outcome: boolean) {
    return this.prisma.market.update({
      where: { conditionId },
      data: {
        status: MarketStatus.RESOLVED,
        resolutionResult: outcome,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 获取市场统计
   */
  async getStats() {
    const [
      totalMarkets,
      activeMarkets,
      totalVolume,
      totalUsers,
    ] = await Promise.all([
      this.prisma.market.count(),
      this.prisma.market.count({ where: { status: MarketStatus.ACTIVE } }),
      this.prisma.market.aggregate({
        _sum: { totalVolume: true },
      }),
      this.prisma.user.count(),
    ]);

    return {
      totalMarkets,
      activeMarkets,
      totalVolume: totalVolume._sum.totalVolume || 0,
      totalUsers,
    };
  }

  /**
   * 获取热门市场
   */
  async getTrending(limit: number = 10) {
    return this.prisma.market.findMany({
      where: {
        status: MarketStatus.ACTIVE,
      },
      orderBy: {
        totalVolume: 'desc',
      },
      take: limit,
    });
  }

  /**
   * 获取市场分类列表
   */
  async getCategories() {
    const categories = await this.prisma.market.groupBy({
      by: ['category'],
      _count: {
        category: true,
      },
      where: {
        status: MarketStatus.ACTIVE,
      },
    });

    return categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
    }));
  }
}
