import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/** Data de negócio no formato YYYY-MM-DD (ADR 0002). */
export function IsBusinessDate() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property must be in YYYY-MM-DD format',
    }),
    IsISO8601({ strict: true }),
  );
}
