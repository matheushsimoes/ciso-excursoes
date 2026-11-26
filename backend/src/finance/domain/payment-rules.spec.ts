import { ConflictException } from '@nestjs/common';
import { assertCanPay, assertCanRefund } from './payment-rules.js';
import type { PaymentTarget } from './finance.js';

describe('payment rules', () => {
  const target: PaymentTarget = {
    kind: 'PACKAGE',
    excursionId: 'excursion-1',
    excursionStatus: 'OPEN',
    participationStatus: 'ACTIVE',
    dueCents: 150000,
    netPaidCents: 50000,
  };

  describe('assertCanPay', () => {
    it('should accept a payment up to the outstanding balance', () => {
      expect(() => assertCanPay(target, 100000)).not.toThrow();
    });

    it('should reject a payment above the outstanding balance', () => {
      expect(() => assertCanPay(target, 100001)).toThrow(ConflictException);
    });

    it('should reject a package payment for a cancelled participation', () => {
      expect(() =>
        assertCanPay({ ...target, participationStatus: 'CANCELLED' }, 100),
      ).toThrow(ConflictException);
    });

    it('should reject payments for a cancelled excursion', () => {
      expect(() => assertCanPay({ ...target, excursionStatus: 'CANCELLED' }, 100)).toThrow(
        ConflictException,
      );
    });

    it('should accept a ticket payment after the participation was cancelled (RN36)', () => {
      expect(() =>
        assertCanPay({ ...target, kind: 'TICKET', participationStatus: 'CANCELLED' }, 100),
      ).not.toThrow();
    });
  });

  describe('assertCanRefund', () => {
    it('should accept refunds up to the payment amount', () => {
      expect(() => assertCanRefund(10000, 4000, 6000)).not.toThrow();
    });

    it('should reject refunds above the remaining refundable amount', () => {
      expect(() => assertCanRefund(10000, 4000, 6001)).toThrow(ConflictException);
    });
  });
});
