import { IsOptional, IsUUID } from 'class-validator';
import { IsMoney } from '../../common/validation/is-money.js';

export class CreateParticipationDto {
  @IsUUID()
  personId: string;

  /** Defaults to the excursion reference price when omitted (RN08). */
  @IsOptional()
  @IsMoney()
  contractedAmount?: string;
}
