import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { TicketPurchaseStatus } from '../domain/activity.js';

@Entity({ name: 'activity' })
export class ActivityEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'excursion_id', type: 'uuid' }) excursionId: string;
  @Column({ name: 'name', type: 'varchar', length: 150 }) name: string;
  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description: string | null;
  @Column({ name: 'is_optional', type: 'boolean' }) isOptional: boolean;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'ticket_type' })
export class TicketTypeEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'activity_id', type: 'uuid' }) activityId: string;
  @Column({ name: 'name', type: 'varchar', length: 100 }) name: string;
  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description: string | null;
  @Column({ name: 'current_price', type: 'numeric', precision: 12, scale: 2 })
  currentPrice: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'ticket_purchase' })
export class TicketPurchaseEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'participation_id', type: 'uuid' }) participationId: string;
  @Column({ name: 'ticket_type_id', type: 'uuid' }) ticketTypeId: string;
  @Column({ name: 'quantity', type: 'integer' }) quantity: number;
  @Column({ name: 'sold_price', type: 'numeric', precision: 12, scale: 2 }) soldPrice: string;
  @Column({ name: 'status', type: 'varchar', length: 20 }) status: TicketPurchaseStatus;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'supplier' })
export class SupplierEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'name', type: 'varchar', length: 150 }) name: string;
  @Column({ name: 'document', type: 'varchar', length: 20, nullable: true })
  document: string | null;
  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true }) phone: string | null;
  @Column({ name: 'email', type: 'varchar', length: 254, nullable: true }) email: string | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

@Entity({ name: 'ticket_supplier_purchase' })
export class TicketSupplierPurchaseEntity {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'supplier_id', type: 'uuid' }) supplierId: string;
  @Column({ name: 'ticket_type_id', type: 'uuid' }) ticketTypeId: string;
  @Column({ name: 'quantity', type: 'integer' }) quantity: number;
  @Column({ name: 'unit_cost', type: 'numeric', precision: 12, scale: 2 }) unitCost: string;
  @Column({ name: 'status', type: 'varchar', length: 20 }) status: TicketPurchaseStatus;
  @Column({ name: 'purchase_date', type: 'date' }) purchaseDate: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}
