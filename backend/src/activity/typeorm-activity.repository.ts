import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { isUniqueViolation } from '../common/database-errors.js';
import { fromCents, toCents } from '../common/money.js';
import {
  ActivityRepository,
  PurchaseContext,
  TicketTypeInfo,
} from './activity.repository.js';
import type {
  Activity,
  ActivityWithTickets,
  Supplier,
  SupplierPurchaseView,
  TicketDemandLine,
  TicketPurchase,
  TicketPurchaseView,
  TicketSupplierPurchase,
  TicketType,
} from './domain/activity.js';
import {
  ActivityEntity,
  SupplierEntity,
  TicketPurchaseEntity,
  TicketSupplierPurchaseEntity,
  TicketTypeEntity,
} from './entities/activity.entities.js';

const money = (value: string | null | undefined) => fromCents(toCents(value ?? '0'));

const PURCHASE_VIEW_SQL = `
  SELECT tp.id, tp.participation_id, tp.ticket_type_id, tp.quantity,
         tp.sold_price::text AS sold_price, tp.status, tp.created_at, tp.updated_at,
         tt.name AS ticket_type_name, a.id AS activity_id, a.name AS activity_name,
         coalesce((SELECT sum(pm.amount) FROM payment pm WHERE pm.ticket_purchase_id = tp.id), 0)::text AS paid,
         coalesce((SELECT sum(rf.amount) FROM refund rf JOIN payment pm ON pm.id = rf.payment_id
                    WHERE pm.ticket_purchase_id = tp.id), 0)::text AS refunded
    FROM ticket_purchase tp
    JOIN ticket_type tt ON tt.id = tp.ticket_type_id
    JOIN activity a ON a.id = tt.activity_id
`;

function toPurchaseView(row: Record<string, any>): TicketPurchaseView {
  const totalCents = toCents(row.sold_price) * row.quantity;
  const netPaidCents = toCents(row.paid) - toCents(row.refunded);
  return {
    id: row.id,
    participationId: row.participation_id,
    ticketTypeId: row.ticket_type_id,
    quantity: row.quantity,
    soldPrice: money(row.sold_price),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    activityId: row.activity_id,
    activityName: row.activity_name,
    ticketTypeName: row.ticket_type_name,
    total: fromCents(totalCents),
    netPaid: fromCents(netPaidCents),
    balance: fromCents(totalCents - netPaidCents),
  };
}

@Injectable()
export class TypeOrmActivityRepository implements ActivityRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createActivity(activity: Activity): Promise<Activity> {
    try {
      await this.dataSource.getRepository(ActivityEntity).insert(activity);
      return activity;
    } catch (error) {
      throw this.translate(error);
    }
  }

  findActivity(id: string): Promise<Activity | null> {
    return this.dataSource.getRepository(ActivityEntity).findOne({ where: { id } });
  }

  async updateActivity(activity: Activity): Promise<Activity> {
    try {
      const repository = this.dataSource.getRepository(ActivityEntity);
      await repository.save(repository.create(activity));
      return activity;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async listActivities(excursionId: string): Promise<ActivityWithTickets[]> {
    const activities = await this.dataSource
      .getRepository(ActivityEntity)
      .find({ where: { excursionId }, order: { name: 'ASC' } });
    if (!activities.length) return [];

    const ticketTypes: TicketTypeEntity[] = await this.dataSource
      .getRepository(TicketTypeEntity)
      .createQueryBuilder('tt')
      .where('tt.activityId IN (:...ids)', { ids: activities.map((activity) => activity.id) })
      .orderBy('tt.name', 'ASC')
      .getMany();

    return activities.map((activity) => ({
      ...activity,
      ticketTypes: ticketTypes
        .filter((ticketType) => ticketType.activityId === activity.id)
        .map((ticketType) => ({ ...ticketType, currentPrice: money(ticketType.currentPrice) })),
    }));
  }

  async createTicketType(ticketType: TicketType): Promise<TicketType> {
    try {
      await this.dataSource.getRepository(TicketTypeEntity).insert(ticketType);
      return ticketType;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findTicketType(id: string): Promise<TicketTypeInfo | null> {
    const rows = await this.dataSource.query(
      `SELECT tt.id, tt.activity_id, tt.name, tt.description, tt.current_price::text AS current_price,
              tt.created_at, tt.updated_at, a.excursion_id, a.name AS activity_name
         FROM ticket_type tt JOIN activity a ON a.id = tt.activity_id
        WHERE tt.id = $1`,
      [id],
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      activityId: row.activity_id,
      name: row.name,
      description: row.description,
      currentPrice: money(row.current_price),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      excursionId: row.excursion_id,
      activityName: row.activity_name,
    };
  }

  async updateTicketType(ticketType: TicketType): Promise<TicketType> {
    try {
      const repository = this.dataSource.getRepository(TicketTypeEntity);
      await repository.save(repository.create(ticketType));
      return ticketType;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async createTicketPurchase(
    purchase: TicketPurchase,
    activityId: string,
    check: (context: PurchaseContext) => void,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Locking the participation serializes purchases of the same participant,
      // so a double click can't create two tickets for one activity (RN32).
      const [participation] = await manager.query(
        'SELECT id, excursion_id, status FROM participation WHERE id = $1 FOR UPDATE',
        [purchase.participationId],
      );
      if (!participation) throw new NotFoundException('Participation not found');

      const [row] = await manager.query(
        `SELECT count(*)::int AS total
           FROM ticket_purchase tp JOIN ticket_type tt ON tt.id = tp.ticket_type_id
          WHERE tp.participation_id = $1 AND tt.activity_id = $2`,
        [purchase.participationId, activityId],
      );

      check({
        participation: {
          id: participation.id,
          excursionId: participation.excursion_id,
          status: participation.status,
        },
        sameActivityPurchases: row.total,
      });

      await manager.insert(TicketPurchaseEntity, purchase);
    });
  }

  async findTicketPurchase(id: string): Promise<TicketPurchase | null> {
    const purchase = await this.dataSource
      .getRepository(TicketPurchaseEntity)
      .findOne({ where: { id } });
    return purchase ? { ...purchase, soldPrice: money(purchase.soldPrice) } : null;
  }

  async updateTicketPurchase(purchase: TicketPurchase): Promise<void> {
    const repository = this.dataSource.getRepository(TicketPurchaseEntity);
    await repository.save(repository.create(purchase));
  }

  async listTicketPurchases(participationId: string): Promise<TicketPurchaseView[]> {
    const rows = await this.dataSource.query(
      `${PURCHASE_VIEW_SQL} WHERE tp.participation_id = $1 ORDER BY a.name, tt.name`,
      [participationId],
    );
    return rows.map(toPurchaseView);
  }

  async findTicketPurchaseView(id: string): Promise<TicketPurchaseView | null> {
    const rows = await this.dataSource.query(`${PURCHASE_VIEW_SQL} WHERE tp.id = $1`, [id]);
    return rows.length ? toPurchaseView(rows[0]) : null;
  }

  async ticketDemand(excursionId: string): Promise<TicketDemandLine[]> {
    // Ticket purchases can't be cancelled (RN36): every sold ticket counts,
    // even when the participation was cancelled afterwards.
    const rows = await this.dataSource.query(
      `SELECT tt.id, tt.name, tt.current_price::text AS current_price,
              a.id AS activity_id, a.name AS activity_name,
              coalesce(sales.requested, 0)::int AS requested,
              coalesce(sales.confirmed, 0)::int AS confirmed,
              coalesce(sales.total, 0)::text AS sales_total,
              coalesce(bought.quantity, 0)::int AS purchased,
              coalesce(bought.cost, 0)::text AS supplier_cost
         FROM ticket_type tt
         JOIN activity a ON a.id = tt.activity_id
         LEFT JOIN LATERAL (
           SELECT sum(tp.quantity) AS requested,
                  sum(tp.quantity) FILTER (WHERE tp.status = 'CONFIRMED') AS confirmed,
                  sum(tp.quantity * tp.sold_price) AS total
             FROM ticket_purchase tp WHERE tp.ticket_type_id = tt.id
         ) sales ON true
         LEFT JOIN LATERAL (
           SELECT sum(sp.quantity) AS quantity, sum(sp.quantity * sp.unit_cost) AS cost
             FROM ticket_supplier_purchase sp WHERE sp.ticket_type_id = tt.id
         ) bought ON true
        WHERE a.excursion_id = $1
        ORDER BY a.name, tt.name`,
      [excursionId],
    );
    return rows.map((row: Record<string, any>) => ({
      ticketTypeId: row.id,
      ticketTypeName: row.name,
      activityId: row.activity_id,
      activityName: row.activity_name,
      currentPrice: money(row.current_price),
      requested: row.requested,
      confirmed: row.confirmed,
      purchasedFromSuppliers: row.purchased,
      toPurchase: Math.max(row.requested - row.purchased, 0),
      salesTotal: money(row.sales_total),
      supplierCost: money(row.supplier_cost),
    }));
  }

  async createSupplier(supplier: Supplier): Promise<Supplier> {
    try {
      await this.dataSource.getRepository(SupplierEntity).insert(supplier);
      return supplier;
    } catch (error) {
      throw this.translate(error);
    }
  }

  findSupplier(id: string): Promise<Supplier | null> {
    return this.dataSource.getRepository(SupplierEntity).findOne({ where: { id } });
  }

  listSuppliers(): Promise<Supplier[]> {
    return this.dataSource.getRepository(SupplierEntity).find({ order: { name: 'ASC' } });
  }

  async updateSupplier(supplier: Supplier): Promise<Supplier> {
    try {
      const repository = this.dataSource.getRepository(SupplierEntity);
      await repository.save(repository.create(supplier));
      return supplier;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async createSupplierPurchase(purchase: TicketSupplierPurchase): Promise<void> {
    await this.dataSource.getRepository(TicketSupplierPurchaseEntity).insert(purchase);
  }

  async listSupplierPurchases(excursionId: string): Promise<SupplierPurchaseView[]> {
    const rows = await this.dataSource.query(
      `SELECT sp.id, sp.supplier_id, sp.ticket_type_id, sp.quantity, sp.unit_cost::text AS unit_cost,
              sp.status, sp.purchase_date::text AS purchase_date, sp.created_at, sp.updated_at,
              s.name AS supplier_name, tt.name AS ticket_type_name, a.name AS activity_name
         FROM ticket_supplier_purchase sp
         JOIN supplier s ON s.id = sp.supplier_id
         JOIN ticket_type tt ON tt.id = sp.ticket_type_id
         JOIN activity a ON a.id = tt.activity_id
        WHERE a.excursion_id = $1
        ORDER BY sp.purchase_date DESC, sp.created_at DESC`,
      [excursionId],
    );
    return rows.map((row: Record<string, any>) => ({
      id: row.id,
      supplierId: row.supplier_id,
      ticketTypeId: row.ticket_type_id,
      quantity: row.quantity,
      unitCost: money(row.unit_cost),
      status: row.status,
      purchaseDate: row.purchase_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      supplierName: row.supplier_name,
      ticketTypeName: row.ticket_type_name,
      activityName: row.activity_name,
      total: fromCents(toCents(row.unit_cost) * row.quantity),
    }));
  }

  private translate(error: unknown): unknown {
    if (isUniqueViolation(error, 'uq_activity_name')) {
      return new ConflictException('There is already an activity with this name in the excursion');
    }
    if (isUniqueViolation(error, 'uq_ticket_type_name')) {
      return new ConflictException('There is already a ticket type with this name in the activity');
    }
    if (isUniqueViolation(error, 'uq_supplier_document')) {
      return new ConflictException('There is already a supplier with this document');
    }
    return error;
  }
}
