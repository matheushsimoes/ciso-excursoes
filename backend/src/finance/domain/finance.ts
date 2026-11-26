export const PAYMENT_METHODS = ['CASH', 'PIX', 'CARD'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const EXPENSE_CATEGORIES = [
  'TRANSPORT',
  'ACCOMMODATION',
  'TICKET',
  'FOOD',
  'SOUVENIR',
  'INSURANCE',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/**
 * A payment is immutable financial history: it is never edited or deleted.
 * Mistakes and give-backs are recorded as refunds (RN37, ADR 0005).
 */
export interface Payment {
  id: string;
  /** Exactly one target: the package (participation) or a ticket (RN39). */
  participationId: string | null;
  ticketPurchaseId: string | null;
  amount: string;
  paymentDate: string; // YYYY-MM-DD
  method: PaymentMethod;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  paymentId: string;
  amount: string;
  refundDate: string; // YYYY-MM-DD
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Expense {
  id: string;
  excursionId: string;
  description: string;
  category: ExpenseCategory;
  amount: string;
  expenseDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

/** What a payment pays for, with the amounts needed to validate it. */
export interface PaymentTarget {
  kind: 'PACKAGE' | 'TICKET';
  excursionId: string;
  excursionStatus: string;
  participationStatus: string;
  dueCents: number;
  netPaidCents: number;
}

export interface PaymentView extends Payment {
  target: 'PACKAGE' | 'TICKET';
  description: string;
  refunded: string;
  refundable: string;
  refunds: Refund[];
}

export interface ParticipationStatement {
  participationId: string;
  package: { contracted: string; paid: string; refunded: string; balance: string };
  tickets: Array<{
    ticketPurchaseId: string;
    description: string;
    total: string;
    netPaid: string;
    balance: string;
  }>;
  totalBalance: string;
  payments: PaymentView[];
}

export interface FinancialSummary {
  excursionId: string;
  participants: { active: number; cancelled: number };
  revenue: {
    /** Agreed with active participants (packages). */
    packagesContracted: string;
    /** Tickets sold to participants. */
    ticketsSold: string;
    /** Kept from cancelled participations after refunds (RN44). */
    retainedFromCancellations: string;
    expected: string;
  };
  cash: {
    received: string;
    refunded: string;
    netReceived: string;
    receivable: string;
  };
  expenses: {
    total: string;
    byCategory: Array<{ category: ExpenseCategory; total: string }>;
  };
  /** Supplier costs known in advance (informational, RN26). */
  plannedCosts: { rooms: string; ticketsFromSuppliers: string };
  result: {
    /** Net received minus registered expenses: what actually happened. */
    realized: string;
    /** Expected revenue minus registered expenses: if everyone pays. */
    projected: string;
  };
}
