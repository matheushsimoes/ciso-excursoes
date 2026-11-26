import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsMoney } from '../../common/validation/is-money.js';

export class ReplaceParticipationDto {
  /** Person who takes the place of the cancelled participant. */
  @IsUUID()
  personId: string;

  @IsOptional()
  @IsMoney()
  contractedAmount?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
