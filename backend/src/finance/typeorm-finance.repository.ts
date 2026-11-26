import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

import { isUniqueViolation } from '../common/database-errors.js';
import { fromCents, toCents } from '../common/money.js';
import type {
  Expense,
  ExpenseCategory,
  FinancialSummary,
  ParticipationStatement,
  Payment,
  PaymentTarget,
  PaymentView,
  Refund,
} from './domain/finance.js';
import { ExpenseEntity, PaymentEntity, RefundEntity } from './entities/finance.entities.js';
import { FinanceRepository, PaymentResult } from './finance.repository.js';

const IDEMPOTENCY_INDEX = 'uq_payment_idempotency_key';
const money = (value: string | null | undefined) => fromCents(toCents(value ?? '0'));

const PAYMENT_VIEW_SQL = `
  SELECT pm.id, pm.participation_id, pm.ticket_purchase_id, pm.amount::text AS amount,
         pm.payment_date::text AS payment_date, pm.method, pm.idempotency_key,
         pm.created_at, pm.updated_at,
         CASE WHEN pm.participation_id IS NOT NULL THEN 'Pacote da excursão'
              ELSE a.name || ' — ' || tt.name END AS description
    FROM payment pm
    LEFT JOIN ticket_purchase tp ON tp.id = pm.ticket_purchase_id
    LEFT JOIN ticket_type tt ON tt.id = tp.ticket_type_id
    LEFT JOIN activity a ON a.id = tt.activity_id
`;

function toPayment(row: Record<string, any>): Payment {
  return {
    id: row.id,
    participationId: row.participation_id,
    ticketPurchaseId: row.ticket_purchase_id,
    amount: money(row.amount),
    paymentDate: row.payment_date,
    method: row.method,
    idempotencyKey: row.idempotency_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRefund(row: Record<string, any>): Refund {
  return {
    id: row.id,
    paymentId: row.payment_id,
    amount: money(row.amount),
    refundDate: row.refund_date,
    reason: row.reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toExpense(entity: ExpenseEntity): Expense {
  return { ...entity, amount: money(entity.amount) };
}

@Injectable()
export class TypeOrmFinanceRepository implements FinanceRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createPayment(
    payment: Payment,
    check: (target: PaymentTarget) => void,
  ): Promise<PaymentResult> {
    if (payment.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(this.dataSource.manager, payment.idempotencyKey);
      if (existing) return { payment: existing, replayed: true };
    }

    try {
      await this.dataSource.transaction(async (manager) => {
        const target = await this.lockTarget(manager, payment);
        check(target);
        await manager.insert(PaymentEntity, payment);
      });
      return { payment, replayed: false };
    } catch (error) {
      // Two identical requests raced: the unique index let only one through.
      if (payment.idempotencyKey && isUniqueViolation(error, IDEMPOTENCY_INDEX)) {
        const existing = await this.findByIdempotencyKey(
          this.dataSource.manager,
          payment.idempotencyKey,
        );
        if (existing) return { payment: existing, replayed: true };
      }
      throw error;
    }
  }

  async findPaymentView(id: string): Promise<PaymentView | null> {
    const rows = await this.dataSource.query(`${PAYMENT_VIEW_SQL} WHERE pm.id = $1`, [id]);
    if (!rows.length) return null;
    const [view] = await this.withRefunds(rows);
    return view;
  }

  async createRefund(
    refund: Refund,
    check: (payment: { amountCents: number; refundedCents: number }) => void,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Locking the payment serializes refunds of it, so two refunds can't
      // together exceed the payment amount.
      const [payment] = await manager.query(
        'SELECT amount::text AS amount FROM payment WHERE id = $1 FOR UPDATE',
        [refund.paymentId],
      );
      if (!payment) throw new NotFoundException('Payment not found');

      const [row] = await manager.query(
        'SELECT coalesce(sum(amount), 0)::text AS total FROM refund WHERE payment_id = $1',
        [refund.paymentId],
      );
      check({ amountCents: toCents(payment.amount), refundedCents: toCents(row.total) });
      await manager.insert(RefundEntity, refund);
    });
  }

  async statement(participationId: string): Promise<ParticipationStatement | null> {
    const [participation] = await this.dataSource.query(
      'SELECT id, status, contracted_amount::text AS contracted FROM participation WHERE id = $1',
      [participationId],
    );
    if (!participation) return null;

    const paymentRows = await this.dataSource.query(
      `${PAYMENT_VIEW_SQL}
        WHERE pm.participation_id = $1
           OR pm.ticket_purchase_id IN (SELECT id FROM ticket_purchase WHERE participation_id = $1)
        ORDER BY pm.payment_date DESC, pm.created_at DESC`,
      [participationId],
    );
    const payments = await this.withRefunds(paymentRows);

    const ticketRows: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT tp.id, tp.quantity, tp.sold_price::text AS sold_price,
              a.name || ' — ' || tt.name AS description
         FROM ticket_purchase tp
         JOIN ticket_type tt ON tt.id = tp.ticket_type_id
         JOIN activity a ON a.id = tt.activity_id
        WHERE tp.participation_id = $1
        ORDER BY a.name, tt.name`,
      [participationId],
    );

    const netOf = (filter: (payment: PaymentView) => boolean) =>
      payments
        .filter(filter)
        .reduce((total, payment) => total + toCents(payment.amount) - toCents(payment.refunded), 0);
    const sumOf = (filter: (payment: PaymentView) => boolean, field: 'amount' | 'refunded') =>
      payments.filter(filter).reduce((total, payment) => total + toCents(payment[field]), 0);

    const isPackage = (payment: PaymentView) => payment.target === 'PACKAGE';
    const contractedCents = toCents(participation.contracted);
    const packageNet = netOf(isPackage);
    const packageBalance =
      participation.status === 'ACTIVE' ? Math.max(contractedCents - packageNet, 0) : 0;

    const tickets = ticketRows.map((ticket) => {
      const totalCents = toCents(ticket.sold_price) * ticket.quantity;
      const net = netOf((payment) => payment.ticketPurchaseId === ticket.id);
      return {
        ticketPurchaseId: ticket.id,
        description: ticket.description,
        total: fromCents(totalCents),
        netPaid: fromCents(net),
        balance: fromCents(Math.max(totalCents - net, 0)),
      };
    });

    return {
      participationId,
      package: {
        contracted: fromCents(contractedCents),
        paid: fromCents(sumOf(isPackage, 'amount')),
        refunded: fromCents(sumOf(isPackage, 'refunded')),
        balance: fromCents(packageBalance),
      },
      tickets,
      totalBalance: fromCents(
        packageBalance + tickets.reduce((total, ticket) => total + toCents(ticket.balance), 0),
      ),
      payments,
    };
  }

  async createExpense(expense: Expense): Promise<Expense> {
    await this.dataSource.getRepository(ExpenseEntity).insert(expense);
    return expense;
  }

  async findExpense(id: string): Promise<Expense | null> {
    const entity = await this.dataSource.getRepository(ExpenseEntity).findOne({ where: { id } });
    return entity ? toExpense(entity) : null;
  }

  async updateExpense(expense: Expense): Promise<Expense> {
    const repository = this.dataSource.getRepository(ExpenseEntity);
    await repository.save(repository.create(expense));
    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.dataSource.getRepository(ExpenseEntity).delete({ id });
  }

  async listExpenses(excursionId: string): Promise<Expense[]> {
    const entities = await this.dataSource
      .getRepository(ExpenseEntity)
      .find({ where: { excursionId }, order: { expenseDate: 'DESC', createdAt: 'DESC' } });
    return entities.map(toExpense);
  }

  /**
   * UC34 / UC45 — financial position of an excursion, aggregated in SQL so the
   * numbers come from a single consistent read of the database.
   */
  async summary(excursionId: string): Promise<FinancialSummary> {
    const [row] = await this.dataSource.query(
      `WITH parts AS (
         SELECT p.id, p.status, p.contracted_amount,
                coalesce((SELECT sum(amount) FROM payment WHERE participation_id = p.id), 0) AS paid,
                coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                           WHERE pm.participation_id = p.id), 0) AS refunded
           FROM participation p WHERE p.excursion_id = $1
       ),
       tickets AS (
         SELECT tp.id, tp.quantity * tp.sold_price AS total,
                coalesce((SELECT sum(amount) FROM payment WHERE ticket_purchase_id = tp.id), 0) AS paid,
                coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                           WHERE pm.ticket_purchase_id = tp.id), 0) AS refunded
           FROM ticket_purchase tp
           JOIN participation p ON p.id = tp.participation_id
          WHERE p.excursion_id = $1
       )
       SELECT
         (SELECT count(*) FROM parts WHERE status = 'ACTIVE')::int AS active,
         (SELECT count(*) FROM parts WHERE status = 'CANCELLED')::int AS cancelled,
         (SELECT coalesce(sum(contracted_amount), 0) FROM parts WHERE status = 'ACTIVE')::text AS contracted,
         (SELECT coalesce(sum(greatest(contracted_amount - (paid - refunded), 0)), 0)
            FROM parts WHERE status = 'ACTIVE')::text AS package_receivable,
         (SELECT coalesce(sum(paid - refunded), 0) FROM parts WHERE status = 'CANCELLED')::text AS retained,
         (SELECT coalesce(sum(total), 0) FROM tickets)::text AS tickets_sold,
         (SELECT coalesce(sum(greatest(total - (paid - refunded), 0)), 0) FROM tickets)::text AS tickets_receivable,
         ((SELECT coalesce(sum(paid), 0) FROM parts) + (SELECT coalesce(sum(paid), 0) FROM tickets))::text AS received,
         ((SELECT coalesce(sum(refunded), 0) FROM parts) + (SELECT coalesce(sum(refunded), 0) FROM tickets))::text AS refunded,
         (SELECT coalesce(sum(r.cost), 0) FROM room r JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
           WHERE eh.excursion_id = $1)::text AS room_cost,
         (SELECT coalesce(sum(sp.quantity * sp.unit_cost), 0) FROM ticket_supplier_purchase sp
            JOIN ticket_type tt ON tt.id = sp.ticket_type_id JOIN activity a ON a.id = tt.activity_id
           WHERE a.excursion_id = $1)::text AS supplier_cost`,
      [excursionId],
    );

    const categories: Array<{ category: ExpenseCategory; total: string }> = await this.dataSource.query(
      `SELECT category, sum(amount)::text AS total FROM expense
        WHERE excursion_id = $1 GROUP BY category ORDER BY sum(amount) DESC`,
      [excursionId],
    );

    const c = (value: string) => toCents(value);
    const expensesCents = categories.reduce((total, line) => total + c(line.total), 0);
    const expectedCents = c(row.contracted) + c(row.tickets_sold) + c(row.retained);
    const netReceivedCents = c(row.received) - c(row.refunded);

    return {
      excursionId,
      participants: { active: row.active, cancelled: row.cancelled },
      revenue: {
        packagesContracted: money(row.contracted),
        ticketsSold: money(row.tickets_sold),
        retainedFromCancellations: money(row.retained),
        expected: fromCents(expectedCents),
      },
      cash: {
        received: money(row.received),
        refunded: money(row.refunded),
        netReceived: fromCents(netReceivedCents),
        receivable: fromCents(c(row.package_receivable) + c(row.tickets_receivable)),
      },
      expenses: {
        total: fromCents(expensesCents),
        byCategory: categories.map((line) => ({ category: line.category, total: money(line.total) })),
      },
      plannedCosts: { rooms: money(row.room_cost), ticketsFromSuppliers: money(row.supplier_cost) },
      result: {
        realized: fromCents(netReceivedCents - expensesCents),
        projected: fromCents(expectedCents - expensesCents),
      },
    };
  }

  private async lockTarget(manager: EntityManager, payment: Payment): Promise<PaymentTarget> {
    if (payment.participationId) {
      const [participation] = await manager.query(
        `SELECT p.id, p.excursion_id, p.status, p.contracted_amount::text AS contracted,
                e.status AS excursion_status
           FROM participation p JOIN excursion e ON e.id = p.excursion_id
          WHERE p.id = $1 FOR UPDATE OF p`,
        [payment.participationId],
      );
      if (!participation) throw new NotFoundException('Participation not found');
      const [paid] = await manager.query(
        `SELECT coalesce(sum(pm.amount), 0)::text AS paid,
                coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment p2 ON p2.id = rf.payment_id
                           WHERE p2.participation_id = $1), 0)::text AS refunded
           FROM payment pm WHERE pm.participation_id = $1`,
        [payment.participationId],
      );
      return {
        kind: 'PACKAGE',
        excursionId: participation.excursion_id,
        excursionStatus: participation.excursion_status,
        participationStatus: participation.status,
        dueCents: toCents(participation.contracted),
        netPaidCents: toCents(paid.paid) - toCents(paid.refunded),
      };
    }

    const [ticket] = await manager.query(
      `SELECT tp.id, (tp.quantity * tp.sold_price)::text AS total, p.excursion_id, p.status,
              e.status AS excursion_status
         FROM ticket_purchase tp
         JOIN participation p ON p.id = tp.participation_id
         JOIN excursion e ON e.id = p.excursion_id
        WHERE tp.id = $1 FOR UPDATE OF tp`,
      [payment.ticketPurchaseId],
    );
    if (!ticket) throw new NotFoundException('Ticket purchase not found');
    const [paid] = await manager.query(
      `SELECT coalesce(sum(pm.amount), 0)::text AS paid,
              coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment p2 ON p2.id = rf.payment_id
                         WHERE p2.ticket_purchase_id = $1), 0)::text AS refunded
         FROM payment pm WHERE pm.ticket_purchase_id = $1`,
      [payment.ticketPurchaseId],
    );
    return {
      kind: 'TICKET',
      excursionId: ticket.excursion_id,
      excursionStatus: ticket.excursion_status,
      participationStatus: ticket.status,
      dueCents: toCents(ticket.total),
      netPaidCents: toCents(paid.paid) - toCents(paid.refunded),
    };
  }

  private async findByIdempotencyKey(manager: EntityManager, key: string): Promise<Payment | null> {
    const rows = await manager.query(`${PAYMENT_VIEW_SQL} WHERE pm.idempotency_key = $1`, [key]);
    return rows.length ? toPayment(rows[0]) : null;
  }

  private async withRefunds(rows: Array<Record<string, any>>): Promise<PaymentView[]> {
    if (!rows.length) return [];
    const refundRows: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT id, payment_id, amount::text AS amount, refund_date::text AS refund_date, reason,
              created_at, updated_at
         FROM refund WHERE payment_id = ANY($1::uuid[])
        ORDER BY refund_date ASC, created_at ASC`,
      [rows.map((row) => row.id)],
    );

    return rows.map((row) => {
      const refunds = refundRows.filter((refund) => refund.payment_id === row.id).map(toRefund);
      const refundedCents = refunds.reduce((total, refund) => total + toCents(refund.amount), 0);
      return {
        ...toPayment(row),
        target: row.participation_id ? 'PACKAGE' : 'TICKET',
        description: row.description,
        refunded: fromCents(refundedCents),
        refundable: fromCents(toCents(row.amount) - refundedCents),
        refunds,
      };
    });
  }
}
