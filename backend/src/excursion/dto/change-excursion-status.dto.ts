import { IsIn } from 'class-validator';
import {
  EXCURSION_STATUSES,
  type ExcursionStatus,
} from '../domain/excursion.js';

export class ChangeExcursionStatusDto {
  @IsIn(EXCURSION_STATUSES)
  status: ExcursionStatus;
}
