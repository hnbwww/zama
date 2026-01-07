import { IsString, IsNotEmpty, IsNumber, IsEnum, Min } from 'class-validator';
import { Outcome } from '@prisma/client';

export class RecordTradeDto {
  @IsString()
  @IsNotEmpty()
  marketId: string;

  @IsString()
  @IsNotEmpty()
  buyerAddress: string;

  @IsString()
  @IsNotEmpty()
  sellerAddress: string;

  @IsEnum(Outcome)
  outcome: Outcome;

  @IsNumber()
  @Min(0)
  price: number;

  @IsNumber()
  @Min(0)
  size: number;

  @IsString()
  @IsNotEmpty()
  txHash: string;

  @IsNumber()
  blockNumber: number;
}
