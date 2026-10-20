import { applyDecorators } from '@nestjs/common';
import { Matches } from 'class-validator';

/** Valor monetário como string decimal, compatível com NUMERIC(12,2) (ADR 0003). */
export function IsMoney() {
  return applyDecorators(
    Matches(/^\d{1,10}(\.\d{1,2})?$/, {
      message: '$property must be a decimal with up to 2 places, e.g. 1500.00',
    }),
  );
}
