import type {
  Expense,
  FinancialSummary,
  ParticipationStatement,
  Payment,
  PaymentTarget,
  PaymentView,
  Refund,
} from './domain/finance.js';

export interface PaymentResult {
  payment: Payment;
  /** True when an earlier request with the same Idempotency-Key was returned. */
  replayed: boolean;
}

export abstract class FinanceRepository {
  /**
   * Locks the target, runs `check` and inserts the payment atomically. When a
   * payment with the same idempotency key exists, returns it instead.
   */
  abstract createPayment(
    payment: Payment,
    check: (target: PaymentTarget) => void,
  ): Promise<PaymentResult>;
  abstract findPaymentView(id: string): Promise<PaymentView | null>;

  /** Locks the payment, runs `check`, inserts the refund (RN44). */
  abstract createRefund(
    refund: Refund,
    check: (payment: { amountCents: number; refundedCents: number }) => void,
  ): Promise<void>;

  abstract statement(participationId: string): Promise<ParticipationStatement | null>;

  abstract createExpense(expense: Expense): Promise<Expense>;
  abstract findExpense(id: string): Promise<Expense | null>;
  abstract updateExpense(expense: Expense): Promise<Expense>;
  abstract deleteExpense(id: string): Promise<void>;
  abstract listExpenses(excursionId: string): Promise<Expense[]>;

  abstract summary(excursionId: string): Promise<FinancialSummary>;
}
