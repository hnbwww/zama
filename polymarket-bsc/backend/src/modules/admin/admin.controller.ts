import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateMarketDto } from './dto/update-market.dto';
import { BanUserDto, UnbanUserDto } from './dto/ban-user.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { MarketStatus, AdminActionType } from '@prisma/client';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Helper to extract admin address from headers
   */
  private getAdminAddress(headers: any): string {
    return headers['x-admin-address'] || headers['x-wallet-address'] || '';
  }

  // ==================== Market Management ====================

  @Get('markets')
  async getAllMarkets(
    @Query('status') status?: MarketStatus,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllMarkets({
      status,
      category,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Put('markets/:id')
  async updateMarket(
    @Param('id') id: string,
    @Body() dto: UpdateMarketDto,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.updateMarket(id, dto, adminAddress);
  }

  @Post('markets/:id/void')
  @HttpCode(HttpStatus.OK)
  async voidMarket(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.voidMarket(id, reason, adminAddress);
  }

  @Post('markets/:id/close')
  @HttpCode(HttpStatus.OK)
  async closeMarket(
    @Param('id') id: string,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.closeMarket(id, adminAddress);
  }

  // ==================== User Management ====================

  @Get('users')
  async getAllUsers(
    @Query('isBanned') isBanned?: string,
    @Query('sortBy') sortBy?: 'volume' | 'pnl' | 'trades',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllUsers({
      isBanned: isBanned === 'true' ? true : isBanned === 'false' ? false : undefined,
      sortBy,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('users/:address')
  async getUserDetails(@Param('address') address: string) {
    return this.adminService.getUserDetails(address);
  }

  @Post('users/ban')
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Body() dto: BanUserDto,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.banUser(dto, adminAddress);
  }

  @Post('users/unban')
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Body() dto: UnbanUserDto,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.unbanUser(dto, adminAddress);
  }

  // ==================== Oracle Dispute Management ====================

  @Get('disputes')
  async getDisputedRequests() {
    return this.adminService.getDisputedRequests();
  }

  @Post('disputes/resolve')
  @HttpCode(HttpStatus.OK)
  async resolveDispute(
    @Body() dto: ResolveDisputeDto,
    @Headers() headers: any,
  ) {
    const adminAddress = this.getAdminAddress(headers);
    return this.adminService.resolveDispute(dto, adminAddress);
  }

  // ==================== System Monitoring ====================

  @Get('stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('logs')
  async getAdminLogs(
    @Query('adminAddress') adminAddress?: string,
    @Query('actionType') actionType?: AdminActionType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAdminLogs({
      adminAddress,
      actionType,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('health')
  async getHealthCheck() {
    return this.adminService.getHealthCheck();
  }

  // ==================== Admin Verification ====================

  @Get('verify/:address')
  async verifyAdmin(@Param('address') address: string) {
    const isAdmin = await this.adminService.isAdmin(address);
    return { isAdmin };
  }
}
