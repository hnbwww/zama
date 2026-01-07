import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { OracleService } from './oracle.service';
import { ProposeOutcomeDto, DisputeOutcomeDto, SetFinalOutcomeDto } from './dto/propose-outcome.dto';

@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  /**
   * 提议结果
   */
  @Post('propose')
  async proposeOutcome(@Body() dto: ProposeOutcomeDto) {
    return this.oracleService.proposeOutcome(dto);
  }

  /**
   * 挑战提议
   */
  @Post('dispute')
  async disputeOutcome(@Body() dto: DisputeOutcomeDto) {
    return this.oracleService.disputeOutcome(dto);
  }

  /**
   * 设置最终结果（仅管理员）
   */
  @Post('set-final-outcome')
  async setFinalOutcome(@Body() dto: SetFinalOutcomeDto) {
    return this.oracleService.setFinalOutcome(dto);
  }

  /**
   * 完成解析
   */
  @Post('finalize/:conditionId')
  async finalizeResolution(@Param('conditionId') conditionId: string) {
    return this.oracleService.finalizeResolution(conditionId);
  }

  /**
   * 作废市场（仅管理员）
   */
  @Post('void/:conditionId')
  async voidMarket(
    @Param('conditionId') conditionId: string,
    @Body('reason') reason: string,
  ) {
    return this.oracleService.voidMarket(conditionId, reason);
  }

  /**
   * 获取 Oracle 请求详情
   */
  @Get('request/:conditionId')
  async getRequest(@Param('conditionId') conditionId: string) {
    return this.oracleService.getRequest(conditionId);
  }

  /**
   * 获取待处理的请求
   */
  @Get('pending')
  async getPendingRequests() {
    return this.oracleService.getPendingRequests();
  }

  /**
   * 获取争议中的请求
   */
  @Get('disputed')
  async getDisputedRequests() {
    return this.oracleService.getDisputedRequests();
  }

  /**
   * 检查是否可以 finalize
   */
  @Get('can-finalize/:conditionId')
  async canFinalize(@Param('conditionId') conditionId: string) {
    const canFinalize = await this.oracleService.canFinalize(conditionId);
    return { canFinalize };
  }

  /**
   * 获取市场的 Oracle 状态
   */
  @Get('market-status/:marketId')
  async getMarketOracleStatus(@Param('marketId') marketId: string) {
    return this.oracleService.getMarketOracleStatus(marketId);
  }
}
