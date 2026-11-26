import type { PaymentSituation } from './participation.js';

/** PAID when nothing is owed, PARTIAL when something was paid, PENDING otherwise. */
export function paymentSituation(
  balanceCents: number,
  netPaidCents: number,
): PaymentSituation {
  if (balanceCents <= 0) return 'PAID';
  if (netPaidCents > 0) return 'PARTIAL';
  return 'PENDING';
}
