import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @IsNotEmpty()
  conditionId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  finalOutcome: number; // 0 = NO, 1 = YES, 2 = INVALID
}
