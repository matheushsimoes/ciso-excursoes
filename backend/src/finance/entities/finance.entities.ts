import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ExpenseCategory, PaymentMethod } from '../domain/finance.js';

@Entity({ name: 'payment' })
export class PaymentEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'participation_id', type: 'uuid', nullable: true })
  participationId: string | null;
  @Column({ name: 'ticket_purchase_id', type: 'uuid', nullable: true })
  ticketPurchaseId: string | null;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 }) amount: string;
  @Column({ name: 'payment_date', type: 'date' }) paymentDate: string;
  @Column({ name: 'method', type: 'varchar', length: 20 }) method: PaymentMethod;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
  idempotencyKey: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'refund' })
export class RefundEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'payment_id', type: 'uuid' }) paymentId: string;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 }) amount: string;
  @Column({ name: 'refund_date', type: 'date' }) refundDate: string;
  @Column({ name: 'reason', type: 'varchar', length: 255, nullable: true }) reason: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'expense' })
export class ExpenseEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'excursion_id', type: 'uuid' }) excursionId: string;
  @Column({ name: 'description', type: 'varchar', length: 255 }) description: string;
  @Column({ name: 'category', type: 'varchar', length: 30 }) category: ExpenseCategory;
  @Column({ name: 'amount', type: 'numeric', precision: 12, scale: 2 }) amount: string;
  @Column({ name: 'expense_date', type: 'date' }) expenseDate: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
