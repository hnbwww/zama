import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UpdateMarketDto } from './dto/update-market.dto';
import { BanUserDto, UnbanUserDto } from './dto/ban-user.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { AdminActionType, MarketStatus, OracleRequestStatus } from '@prisma/client';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private cacheService: CacheService,
  ) {}

  /**
   * Check if user is admin
   */
  async isAdmin(address: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { address },
      select: { isAdmin: true },
    });
    return user?.isAdmin || false;
  }

  /**
   * Verify admin access
   */
  private async verifyAdmin(address: string) {
    const isAdmin = await this.isAdmin(address);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }
  }

  /**
   * Log admin action
   */
  private async logAction(
    adminAddress: string,
    actionType: AdminActionType,
    targetType: string,
    targetId: string,
    description: string,
    metadata?: any,
  ) {
    await this.prisma.adminAction.create({
      data: {
        adminAddress,
        actionType,
        targetType,
        targetId,
        description,
        metadata,
      },
    });
  }

  // ==================== Market Management ====================

  /**
   * Get all markets (with filters)
   */
  async getAllMarkets(params?: {
    status?: MarketStatus;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, category, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (category && category !== 'all') where.category = category;

    const [markets, total] = await Promise.all([
      this.prisma.market.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              orders: true,
              trades: true,
              positions: true,
              comments: true,
            },
          },
        },
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
   * Update market
   */
  async updateMarket(
    marketId: string,
    dto: UpdateMarketDto,
    adminAddress: string,
  ) {
    await this.verifyAdmin(adminAddress);

    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const updated = await this.prisma.market.update({
      where: { id: marketId },
      data: dto,
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.MARKET_UPDATE,
      'market',
      marketId,
      `Updated market: ${market.title}`,
      dto,
    );

    // Clear cache
    await this.cacheService.del(`market:${marketId}`);
    await this.cacheService.delPattern('markets:list:*');

    return updated;
  }

  /**
   * Void market (emergency)
   */
  async voidMarket(
    marketId: string,
    reason: string,
    adminAddress: string,
  ) {
    await this.verifyAdmin(adminAddress);

    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const updated = await this.prisma.market.update({
      where: { id: marketId },
      data: {
        status: MarketStatus.VOIDED,
        voidReason: reason,
        outcome: 2, // INVALID
      },
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.MARKET_VOID,
      'market',
      marketId,
      `Voided market: ${market.title}. Reason: ${reason}`,
    );

    // Clear cache
    await this.cacheService.del(`market:${marketId}`);
    await this.cacheService.delPattern('markets:list:*');

    return updated;
  }

  /**
   * Close market (stop trading)
   */
  async closeMarket(marketId: string, adminAddress: string) {
    await this.verifyAdmin(adminAddress);

    const market = await this.prisma.market.findUnique({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== MarketStatus.OPEN) {
      throw new ForbiddenException('Market is not open');
    }

    const updated = await this.prisma.market.update({
      where: { id: marketId },
      data: { status: MarketStatus.CLOSED },
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.MARKET_CLOSE,
      'market',
      marketId,
      `Closed market: ${market.title}`,
    );

    // Clear cache
    await this.cacheService.del(`market:${marketId}`);
    await this.cacheService.delPattern('markets:list:*');

    return updated;
  }

  // ==================== User Management ====================

  /**
   * Get all users (with stats)
   */
  async getAllUsers(params?: {
    isBanned?: boolean;
    sortBy?: 'volume' | 'pnl' | 'trades';
    page?: number;
    limit?: number;
  }) {
    const { isBanned, sortBy = 'volume', page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (isBanned !== undefined) where.isBanned = isBanned;

    const orderBy: any = {};
    switch (sortBy) {
      case 'volume':
        orderBy.totalVolume = 'desc';
        break;
      case 'pnl':
        orderBy.totalPnl = 'desc';
        break;
      case 'trades':
        orderBy.totalTrades = 'desc';
        break;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user details
   */
  async getUserDetails(userAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { address: userAddress },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get additional stats
    const [positions, recentTrades, comments] = await Promise.all([
      this.prisma.position.findMany({
        where: { userAddress },
        include: { market: true },
        take: 10,
      }),
      this.prisma.trade.findMany({
        where: {
          OR: [
            { buyerAddress: userAddress },
            { sellerAddress: userAddress },
          ],
        },
        include: { market: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.comment.count({
        where: { userAddress },
      }),
    ]);

    return {
      user,
      positions,
      recentTrades,
      commentsCount: comments,
    };
  }

  /**
   * Ban user
   */
  async banUser(dto: BanUserDto, adminAddress: string) {
    await this.verifyAdmin(adminAddress);

    const user = await this.prisma.user.upsert({
      where: { address: dto.userAddress },
      update: {
        isBanned: true,
        banReason: dto.reason,
        bannedAt: new Date(),
      },
      create: {
        address: dto.userAddress,
        isBanned: true,
        banReason: dto.reason,
        bannedAt: new Date(),
      },
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.USER_BAN,
      'user',
      dto.userAddress,
      `Banned user ${dto.userAddress}. Reason: ${dto.reason}`,
    );

    return user;
  }

  /**
   * Unban user
   */
  async unbanUser(dto: UnbanUserDto, adminAddress: string) {
    await this.verifyAdmin(adminAddress);

    const user = await this.prisma.user.update({
      where: { address: dto.userAddress },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.USER_UNBAN,
      'user',
      dto.userAddress,
      `Unbanned user ${dto.userAddress}`,
    );

    return user;
  }

  // ==================== Oracle Dispute Management ====================

  /**
   * Get all disputed requests
   */
  async getDisputedRequests() {
    return this.prisma.oracleRequest.findMany({
      where: { status: OracleRequestStatus.DISPUTED },
      include: {
        market: true,
        disputes: true,
      },
      orderBy: { disputedAt: 'desc' },
    });
  }

  /**
   * Resolve disputed request (admin arbitration)
   */
  async resolveDispute(dto: ResolveDisputeDto, adminAddress: string) {
    await this.verifyAdmin(adminAddress);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId: dto.conditionId },
      include: { market: true },
    });

    if (!request) {
      throw new NotFoundException('Oracle request not found');
    }

    if (request.status !== OracleRequestStatus.DISPUTED) {
      throw new ForbiddenException('Request is not in disputed state');
    }

    // Update oracle request
    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId: dto.conditionId },
      data: {
        status: OracleRequestStatus.RESOLVED,
        finalOutcome: dto.finalOutcome,
        resolvedAt: new Date(),
      },
    });

    // Log action
    await this.logAction(
      adminAddress,
      AdminActionType.ORACLE_RESOLVE,
      'oracle',
      dto.conditionId,
      `Resolved dispute for ${request.market.title}. Outcome: ${dto.finalOutcome}`,
      { finalOutcome: dto.finalOutcome },
    );

    return updated;
  }

  // ==================== System Monitoring ====================

  /**
   * Get system statistics
   */
  async getSystemStats() {
    const [
      totalMarkets,
      activeMarkets,
      totalUsers,
      activeUsers,
      totalVolume,
      totalTrades,
      disputedOracles,
      recentActions,
    ] = await Promise.all([
      this.prisma.market.count(),
      this.prisma.market.count({ where: { status: MarketStatus.OPEN } }),
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      this.prisma.market.aggregate({
        _sum: { totalVolume: true },
      }),
      this.prisma.trade.count(),
      this.prisma.oracleRequest.count({
        where: { status: OracleRequestStatus.DISPUTED },
      }),
      this.prisma.adminAction.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      markets: {
        total: totalMarkets,
        active: activeMarkets,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      trading: {
        totalVolume: totalVolume._sum.totalVolume || 0,
        totalTrades,
      },
      oracle: {
        disputed: disputedOracles,
      },
      recentActions,
    };
  }

  /**
   * Get admin action logs
   */
  async getAdminLogs(params?: {
    adminAddress?: string;
    actionType?: AdminActionType;
    page?: number;
    limit?: number;
  }) {
    const { adminAddress, actionType, page = 1, limit = 50 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {};
    if (adminAddress) where.adminAddress = adminAddress;
    if (actionType) where.actionType = actionType;

    const [logs, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get health check
   */
  async getHealthCheck() {
    const now = Date.now();

    // Database check
    const dbCheck = await this.prisma.market
      .findFirst()
      .then(() => ({ status: 'healthy', latency: Date.now() - now }))
      .catch((error) => ({ status: 'unhealthy', error: error.message }));

    // Cache check
    const cacheCheck = await this.cacheService
      .get('health-check')
      .then(() => ({ status: 'healthy' }))
      .catch((error) => ({ status: 'unhealthy', error: error.message }));

    return {
      timestamp: new Date().toISOString(),
      status: dbCheck.status === 'healthy' && cacheCheck.status === 'healthy' ? 'healthy' : 'unhealthy',
      services: {
        database: dbCheck,
        cache: cacheCheck,
      },
    };
  }
}
