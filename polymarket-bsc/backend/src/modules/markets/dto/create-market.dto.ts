import { IsString, IsNotEmpty, IsDateString, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateMarketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  question: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsDateString()
  settlementTime: string;

  @IsString()
  resolutionSource: string;

  @IsNumber()
  @Min(0)
  initialLiquidity: number;
}
