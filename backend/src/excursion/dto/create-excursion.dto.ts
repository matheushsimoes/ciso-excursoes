import { IsIn, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsBusinessDate } from '../../common/validation/is-business-date.js';
import { IsMoney } from '../../common/validation/is-money.js';
import { EXCURSION_TYPES, type ExcursionType } from '../domain/excursion.js';

export class CreateExcursionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  destination: string;

  @IsIn(EXCURSION_TYPES)
  type: ExcursionType;

  @IsBusinessDate()
  startDate: string;

  @IsBusinessDate()
  endDate: string;

  @IsMoney()
  referencePrice: string;
}
