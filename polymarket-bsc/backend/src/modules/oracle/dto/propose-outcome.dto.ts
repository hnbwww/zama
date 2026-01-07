import { IsString, IsInt, Min, Max } from 'class-validator';

export class ProposeOutcomeDto {
  @IsString()
  conditionId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  outcome: number; // 0 = NO, 1 = YES, 2 = INVALID

  @IsString()
  proposerAddress: string;
}

export class DisputeOutcomeDto {
  @IsString()
  conditionId: string;

  @IsString()
  disputerAddress: string;

  @IsString()
  reason: string;
}

export class SetFinalOutcomeDto {
  @IsString()
  conditionId: string;

  @IsInt()
  @Min(0)
  @Max(2)
  finalOutcome: number;
}
