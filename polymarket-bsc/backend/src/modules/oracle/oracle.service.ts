import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ProposeOutcomeDto, DisputeOutcomeDto, SetFinalOutcomeDto } from './dto/propose-outcome.dto';

export enum OracleRequestStatus {
  REQUESTED = 'REQUESTED',
  PROPOSED = 'PROPOSED',
  DISPUTED = 'DISPUTED',
  RESOLVED = 'RESOLVED',
  VOIDED = 'VOIDED',
}

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建 Oracle 请求
   */
  async createRequest(conditionId: string, marketId: string, question: string, resolutionSource: string) {
    this.logger.log(`Creating oracle request for market ${marketId}`);

    const request = await this.prisma.oracleRequest.create({
      data: {
        conditionId,
        marketId,
        question,
        resolutionSource,
        status: OracleRequestStatus.REQUESTED,
        requestedAt: new Date(),
      },
    });

    // 更新市场状态为 RESOLVING
    await this.prisma.market.update({
      where: { id: marketId },
      data: { status: 'RESOLVING' },
    });

    return request;
  }

  /**
   * 提议结果
   */
  async proposeOutcome(dto: ProposeOutcomeDto) {
    this.logger.log(`Proposing outcome for condition ${dto.conditionId}`);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId: dto.conditionId },
    });

    if (!request) {
      throw new Error('Oracle request not found');
    }

    if (request.status !== OracleRequestStatus.REQUESTED) {
      throw new Error('Request already has a proposal');
    }

    // 计算挑战截止时间（24小时后）
    const challengeDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId: dto.conditionId },
      data: {
        status: OracleRequestStatus.PROPOSED,
        proposedOutcome: dto.outcome,
        proposerAddress: dto.proposerAddress,
        proposedAt: new Date(),
        challengeDeadline,
      },
    });

    return updated;
  }

  /**
   * 挑战提议
   */
  async disputeOutcome(dto: DisputeOutcomeDto) {
    this.logger.log(`Disputing outcome for condition ${dto.conditionId}`);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId: dto.conditionId },
    });

    if (!request) {
      throw new Error('Oracle request not found');
    }

    if (request.status !== OracleRequestStatus.PROPOSED) {
      throw new Error('No proposal to dispute');
    }

    if (request.challengeDeadline && new Date() > request.challengeDeadline) {
      throw new Error('Challenge period has ended');
    }

    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId: dto.conditionId },
      data: {
        status: OracleRequestStatus.DISPUTED,
        disputerAddress: dto.disputerAddress,
        disputeReason: dto.reason,
        disputedAt: new Date(),
      },
    });

    // 创建争议记录
    await this.prisma.oracleDispute.create({
      data: {
        conditionId: dto.conditionId,
        disputerAddress: dto.disputerAddress,
        reason: dto.reason,
        createdAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 设置最终结果（仲裁）
   */
  async setFinalOutcome(dto: SetFinalOutcomeDto) {
    this.logger.log(`Setting final outcome for condition ${dto.conditionId}`);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId: dto.conditionId },
    });

    if (!request) {
      throw new Error('Oracle request not found');
    }

    if (request.status !== OracleRequestStatus.DISPUTED) {
      throw new Error('Request is not disputed');
    }

    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId: dto.conditionId },
      data: {
        finalOutcome: dto.finalOutcome,
      },
    });

    return updated;
  }

  /**
   * 完成解析
   */
  async finalizeResolution(conditionId: string) {
    this.logger.log(`Finalizing resolution for condition ${conditionId}`);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId },
      include: { market: true },
    });

    if (!request) {
      throw new Error('Oracle request not found');
    }

    let finalOutcome: number;

    if (request.status === OracleRequestStatus.PROPOSED) {
      // 无争议，使用提议的结果
      if (!request.challengeDeadline || new Date() <= request.challengeDeadline) {
        throw new Error('Challenge period not ended');
      }
      finalOutcome = request.proposedOutcome!;
    } else if (request.status === OracleRequestStatus.DISPUTED) {
      // 有争议，使用仲裁结果
      if (request.finalOutcome === null || request.finalOutcome === undefined) {
        throw new Error('Final outcome not set');
      }
      finalOutcome = request.finalOutcome;
    } else {
      throw new Error('Invalid status for finalization');
    }

    // 更新 Oracle 请求状态
    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId },
      data: {
        status: OracleRequestStatus.RESOLVED,
        finalOutcome,
        resolvedAt: new Date(),
      },
    });

    // 更新市场状态
    const marketStatus = finalOutcome === 2 ? 'VOIDED' : 'RESOLVED';
    await this.prisma.market.update({
      where: { id: request.marketId },
      data: {
        status: marketStatus,
        outcome: finalOutcome,
        resolvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 作废市场
   */
  async voidMarket(conditionId: string, reason: string) {
    this.logger.log(`Voiding market for condition ${conditionId}`);

    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId },
      include: { market: true },
    });

    if (!request) {
      throw new Error('Oracle request not found');
    }

    if (request.status === OracleRequestStatus.RESOLVED) {
      throw new Error('Request already resolved');
    }

    // 更新 Oracle 请求
    const updated = await this.prisma.oracleRequest.update({
      where: { conditionId },
      data: {
        status: OracleRequestStatus.VOIDED,
        voidReason: reason,
        resolvedAt: new Date(),
        finalOutcome: 2, // INVALID
      },
    });

    // 更新市场状态
    await this.prisma.market.update({
      where: { id: request.marketId },
      data: {
        status: 'VOIDED',
        voidReason: reason,
        resolvedAt: new Date(),
      },
    });

    return updated;
  }

  /**
   * 获取 Oracle 请求详情
   */
  async getRequest(conditionId: string) {
    return this.prisma.oracleRequest.findUnique({
      where: { conditionId },
      include: {
        market: true,
        disputes: true,
      },
    });
  }

  /**
   * 获取待处理的请求
   */
  async getPendingRequests() {
    return this.prisma.oracleRequest.findMany({
      where: {
        status: {
          in: [OracleRequestStatus.REQUESTED, OracleRequestStatus.PROPOSED],
        },
      },
      include: {
        market: true,
      },
      orderBy: {
        requestedAt: 'asc',
      },
    });
  }

  /**
   * 获取争议中的请求
   */
  async getDisputedRequests() {
    return this.prisma.oracleRequest.findMany({
      where: {
        status: OracleRequestStatus.DISPUTED,
      },
      include: {
        market: true,
        disputes: true,
      },
      orderBy: {
        disputedAt: 'desc',
      },
    });
  }

  /**
   * 检查是否可以 finalize
   */
  async canFinalize(conditionId: string): Promise<boolean> {
    const request = await this.prisma.oracleRequest.findUnique({
      where: { conditionId },
    });

    if (!request) {
      return false;
    }

    if (request.status === OracleRequestStatus.PROPOSED) {
      // 检查挑战期是否结束
      return request.challengeDeadline ? new Date() > request.challengeDeadline : false;
    }

    if (request.status === OracleRequestStatus.DISPUTED) {
      // 检查是否设置了最终结果
      return request.finalOutcome !== null && request.finalOutcome !== undefined;
    }

    return false;
  }

  /**
   * 获取市场的 Oracle 状态
   */
  async getMarketOracleStatus(marketId: string) {
    const request = await this.prisma.oracleRequest.findFirst({
      where: { marketId },
      include: {
        disputes: true,
      },
    });

    if (!request) {
      return null;
    }

    const canFinalize = await this.canFinalize(request.conditionId);

    return {
      ...request,
      canFinalize,
      timeUntilDeadline: request.challengeDeadline
        ? Math.max(0, request.challengeDeadline.getTime() - Date.now())
        : 0,
    };
  }
}
