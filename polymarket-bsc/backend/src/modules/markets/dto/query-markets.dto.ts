import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';

export enum MarketSortBy {
  VOLUME = 'volume',
  CREATED = 'created',
  ENDING_SOON = 'endingSoon',
  NEWEST = 'newest',
}

export class QueryMarketsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(MarketSortBy)
  sortBy?: MarketSortBy;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
