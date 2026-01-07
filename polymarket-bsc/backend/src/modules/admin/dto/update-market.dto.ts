import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MarketStatus } from '@prisma/client';

export class UpdateMarketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MarketStatus)
  status?: MarketStatus;

  @IsOptional()
  @IsString()
  voidReason?: string;
}
