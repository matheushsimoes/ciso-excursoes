import { applyDecorators } from '@nestjs/common';
import { IsInt, Max, Min } from 'class-validator';

/** Positive integer quantity (passengers, seats, tickets...). */
export function IsQuantity(max = 10000) {
  return applyDecorators(IsInt(), Min(1), Max(max));
}
