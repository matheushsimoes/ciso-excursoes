import type { PaymentSituation } from './participation.js';

/**
 * COURTESY when the passenger travels for free (contracted amount zero),
 * PAID when nothing is owed, PARTIAL when something was paid, PENDING otherwise.
 */
export function paymentSituation(
  contractedCents: number,
  balanceCents: number,
  netPaidCents: number,
): PaymentSituation {
  if (contractedCents === 0) return 'COURTESY';
  if (balanceCents <= 0) return 'PAID';
  if (netPaidCents > 0) return 'PARTIAL';
  return 'PENDING';
}
