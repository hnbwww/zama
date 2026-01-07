import { IsString, IsNotEmpty } from 'class-validator';

export class BanUserDto {
  @IsString()
  @IsNotEmpty()
  userAddress: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class UnbanUserDto {
  @IsString()
  @IsNotEmpty()
  userAddress: string;
}
