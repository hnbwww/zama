import { IsString, IsNotEmpty, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { OrderSide, Outcome, OrderType } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(Outcome)
  outcome: Outcome;

  @IsEnum(OrderType)
  orderType: OrderType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsNumber()
  @Min(0)
  size: number;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsNumber()
  nonce: number;

  @IsOptional()
  @IsNumber()
  expiry?: number;
}
