import { ConflictException } from '@nestjs/common';
import { fromCents } from '../../common/money.js';
import type { PaymentTarget } from './finance.js';

/**
 * A package payment requires an active participation; ticket payments are
 * accepted even after a cancellation, because tickets can't be cancelled
 * (RN36). No payment may exceed what is still owed.
 */
export function assertCanPay(target: PaymentTarget, amountCents: number): void {
  if (target.excursionStatus === 'CANCELLED') {
    throw new ConflictException('The excursion was cancelled: register refunds instead');
  }
  if (target.kind === 'PACKAGE' && target.participationStatus !== 'ACTIVE') {
    throw new ConflictException('Participation is cancelled');
  }

  const outstanding = target.dueCents - target.netPaidCents;
  if (amountCents > outstanding) {
    throw new ConflictException(
      `Payment exceeds the outstanding balance of ${fromCents(Math.max(outstanding, 0))}`,
    );
  }
}

/** The sum of the refunds of a payment can never exceed the payment (RN44). */
export function assertCanRefund(
  paymentCents: number,
  alreadyRefundedCents: number,
  amountCents: number,
): void {
  const refundable = paymentCents - alreadyRefundedCents;
  if (amountCents > refundable) {
    throw new ConflictException(
      `Refund exceeds the refundable amount of ${fromCents(refundable)}`,
    );
  }
}
