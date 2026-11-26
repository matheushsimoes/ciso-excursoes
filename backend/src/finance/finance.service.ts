import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { normalizeMoney, toCents } from '../common/money.js';
import { ExcursionService } from '../excursion/excursion.service.js';
import type {
  Expense,
  FinancialSummary,
  ParticipationStatement,
  Payment,
  PaymentView,
} from './domain/finance.js';
import { assertCanPay, assertCanRefund } from './domain/payment-rules.js';
import {
  CreateExpenseDto,
  CreatePaymentDto,
  CreateRefundDto,
  UpdateExpenseDto,
} from './dto/finance.dto.js';
import { FinanceRepository } from './finance.repository.js';

export interface PaymentResponse {
  payment: PaymentView;
  replayed: boolean;
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly excursionService: ExcursionService,
  ) {}

  /**
   * UC32 — Register a payment.
   *
   * With an Idempotency-Key, retrying the same request (double click, network
   * retry) returns the payment already registered instead of charging twice.
   * Reusing the key for a different request is rejected with 422.
   */
  async createPayment(dto: CreatePaymentDto, idempotencyKey?: string): Promise<PaymentResponse> {
    if (Boolean(dto.participationId) === Boolean(dto.ticketPurchaseId)) {
      throw new BadRequestException(
        'Send exactly one of participationId or ticketPurchaseId (RN39)',
      );
    }
    const key = idempotencyKey?.trim() || null;
    if (key && key.length > 100) {
      throw new BadRequestException('Idempotency-Key must have at most 100 characters');
    }

    const amount = normalizeMoney(dto.amount);
    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const now = new Date();
    const candidate: Payment = {
      id: randomUUID(),
      participationId: dto.participationId ?? null,
      ticketPurchaseId: dto.ticketPurchaseId ?? null,
      amount,
      paymentDate: dto.paymentDate,
      method: dto.method,
      idempotencyKey: key,
      createdAt: now,
      updatedAt: now,
    };

    const { payment, replayed } = await this.financeRepository.createPayment(
      candidate,
      (target) => assertCanPay(target, amountCents),
    );

    if (replayed && !this.isSameRequest(payment, candidate)) {
      throw new UnprocessableEntityException(
        'This Idempotency-Key was already used for a different payment',
      );
    }

    return { payment: (await this.financeRepository.findPaymentView(payment.id))!, replayed };
  }

  async findPayment(id: string): Promise<PaymentView> {
    const payment = await this.financeRepository.findPaymentView(id);
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  /** UC36 — Refund part or all of a payment. */
  async createRefund(paymentId: string, dto: CreateRefundDto): Promise<PaymentView> {
    const amount = normalizeMoney(dto.amount);
    const amountCents = toCents(amount);
    if (amountCents <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }

    const now = new Date();
    await this.financeRepository.createRefund(
      {
        id: randomUUID(),
        paymentId,
        amount,
        refundDate: dto.refundDate,
        reason: dto.reason ?? null,
        createdAt: now,
        updatedAt: now,
      },
      ({ amountCents: paymentCents, refundedCents }) =>
        assertCanRefund(paymentCents, refundedCents, amountCents),
    );
    return this.findPayment(paymentId);
  }

  /** UC33 — Payments, refunds and balances of a participant. */
  async statement(participationId: string): Promise<ParticipationStatement> {
    const statement = await this.financeRepository.statement(participationId);
    if (!statement) throw new NotFoundException('Participation not found');
    return statement;
  }

  // ------------------------------------------------------------ expenses (UC38, UC39)

  async createExpense(excursionId: string, dto: CreateExpenseDto): Promise<Expense> {
    await this.assertExpensesAllowed(excursionId);
    const amount = this.positiveMoney(dto.amount);
    const now = new Date();
    return this.financeRepository.createExpense({
      id: randomUUID(),
      excursionId,
      description: dto.description,
      category: dto.category,
      amount,
      expenseDate: dto.expenseDate,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listExpenses(excursionId: string): Promise<Expense[]> {
    await this.excursionService.findById(excursionId);
    return this.financeRepository.listExpenses(excursionId);
  }

  async updateExpense(id: string, dto: UpdateExpenseDto): Promise<Expense> {
    const expense = await this.findExpense(id);
    await this.assertExpensesAllowed(expense.excursionId);
    return this.financeRepository.updateExpense({
      ...expense,
      description: dto.description ?? expense.description,
      category: dto.category ?? expense.category,
      amount: dto.amount ? this.positiveMoney(dto.amount) : expense.amount,
      expenseDate: dto.expenseDate ?? expense.expenseDate,
      updatedAt: new Date(),
    });
  }

  async deleteExpense(id: string): Promise<void> {
    const expense = await this.findExpense(id);
    await this.assertExpensesAllowed(expense.excursionId);
    await this.financeRepository.deleteExpense(id);
  }

  /** UC34 / UC45 — financial position and result of an excursion. */
  async summary(excursionId: string): Promise<FinancialSummary> {
    await this.excursionService.findById(excursionId);
    return this.financeRepository.summary(excursionId);
  }

  /**
   * Expenses keep being registered after the trip (closing the accounts), so
   * they are allowed on finished excursions too; only the excursion has to exist.
   */
  private async assertExpensesAllowed(excursionId: string): Promise<void> {
    await this.excursionService.findById(excursionId);
  }

  private async findExpense(id: string): Promise<Expense> {
    const expense = await this.financeRepository.findExpense(id);
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private positiveMoney(value: string): string {
    const amount = normalizeMoney(value);
    if (toCents(amount) <= 0) {
      throw new BadRequestException('amount must be greater than zero');
    }
    return amount;
  }

  private isSameRequest(stored: Payment, request: Payment): boolean {
    return (
      stored.participationId === request.participationId &&
      stored.ticketPurchaseId === request.ticketPurchaseId &&
      stored.amount === request.amount &&
      stored.paymentDate === request.paymentDate &&
      stored.method === request.method
    );
  }
}
