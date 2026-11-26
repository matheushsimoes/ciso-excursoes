import type { ExcursionStatus } from './excursion.js';

const ALLOWED_TRANSITIONS: Record<ExcursionStatus, readonly ExcursionStatus[]> =
  {
    DRAFT: ['OPEN', 'CANCELLED'],
    OPEN: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['FINISHED'],
    FINISHED: [],
    CANCELLED: [],
  };

export function canTransition(
  from: ExcursionStatus,
  to: ExcursionStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isFinalStatus(status: ExcursionStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
