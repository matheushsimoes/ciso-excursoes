import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { isUniqueViolation } from '../common/database-errors.js';
import { fromCents, toCents } from '../common/money.js';
import type { Participation, ParticipationView } from './domain/participation.js';
import { paymentSituation } from './domain/payment-situation.js';
import { ParticipationEntity } from './entities/participation.entity.js';
import { ParticipationRepository } from './participation.repository.js';

const DUPLICATE_PARTICIPATION = 'uq_participation_person_excursion';

/**
 * One query feeds every participation screen. Payments and refunds are summed
 * in LATERAL subqueries so a participation with many payments still produces a
 * single row, and the balance is derived from them (RN41).
 */
const VIEW_SQL = `
  SELECT p.id, p.person_id, p.excursion_id, p.contracted_amount::text AS contracted_amount,
         p.status, p.excursion_vehicle_id, p.seat_number, p.room_id,
         p.cancelled_at, p.cancellation_reason, p.created_at, p.updated_at,
         per.full_name, per.nickname, per.document, per.birth_date::text AS birth_date, per.phone, per.email,
         e.name AS excursion_name, e.status AS excursion_status, e.type AS excursion_type,
         v.identifier AS vehicle_identifier,
         r.identifier AS room_identifier, h.name AS hotel_name,
         fin.paid::text AS paid, fin.refunded::text AS refunded
    FROM participation p
    JOIN person per ON per.id = p.person_id
    JOIN excursion e ON e.id = p.excursion_id
    LEFT JOIN excursion_vehicle v ON v.id = p.excursion_vehicle_id
    LEFT JOIN room r ON r.id = p.room_id
    LEFT JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
    LEFT JOIN hotel h ON h.id = eh.hotel_id
    LEFT JOIN LATERAL (
      SELECT coalesce(sum(pm.amount), 0) AS paid,
             coalesce(sum(rf.total), 0) AS refunded
        FROM payment pm
        LEFT JOIN LATERAL (
          SELECT coalesce(sum(amount), 0) AS total FROM refund WHERE payment_id = pm.id
        ) rf ON true
       WHERE pm.participation_id = p.id
    ) fin ON true
`;

type ViewRow = Record<string, any>;

@Injectable()
export class TypeOrmParticipationRepository implements ParticipationRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repository() {
    return this.dataSource.getRepository(ParticipationEntity);
  }

  async create(participation: Participation): Promise<Participation> {
    try {
      await this.repository.insert(participation);
      return participation;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findById(id: string): Promise<Participation | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async update(participation: Participation): Promise<Participation> {
    await this.repository.save(this.repository.create(participation));
    return participation;
  }

  async replace(cancelled: Participation, replacement: Participation): Promise<Participation> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(ParticipationEntity, manager.create(ParticipationEntity, cancelled));
        await manager.insert(ParticipationEntity, replacement);
      });
      return replacement;
    } catch (error) {
      throw this.translate(error);
    }
  }

  async findViewById(id: string): Promise<ParticipationView | null> {
    const rows = await this.dataSource.query(`${VIEW_SQL} WHERE p.id = $1`, [id]);
    return rows.length ? this.toView(rows[0]) : null;
  }

  async findViewsByExcursion(excursionId: string): Promise<ParticipationView[]> {
    const rows = await this.dataSource.query(
      `${VIEW_SQL} WHERE p.excursion_id = $1 ORDER BY p.status ASC, per.full_name ASC`,
      [excursionId],
    );
    return rows.map((row: ViewRow) => this.toView(row));
  }

  async findViewsByPerson(personId: string): Promise<ParticipationView[]> {
    const rows = await this.dataSource.query(
      `${VIEW_SQL} WHERE p.person_id = $1 ORDER BY e.start_date DESC`,
      [personId],
    );
    return rows.map((row: ViewRow) => this.toView(row));
  }

  async netPaidCents(participationId: string): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT coalesce(sum(pm.amount), 0)::text AS paid,
              coalesce((SELECT sum(rf.amount) FROM refund rf
                          JOIN payment p2 ON p2.id = rf.payment_id
                         WHERE p2.participation_id = $1), 0)::text AS refunded
         FROM payment pm
        WHERE pm.participation_id = $1`,
      [participationId],
    );
    return toCents(row.paid) - toCents(row.refunded);
  }

  private translate(error: unknown): unknown {
    if (isUniqueViolation(error, DUPLICATE_PARTICIPATION)) {
      return new ConflictException(
        'This person already has a participation in this excursion (RN02)',
      );
    }
    return error;
  }

  private toDomain(entity: ParticipationEntity): Participation {
    return {
      id: entity.id,
      personId: entity.personId,
      excursionId: entity.excursionId,
      contractedAmount: entity.contractedAmount,
      status: entity.status,
      excursionVehicleId: entity.excursionVehicleId,
      seatNumber: entity.seatNumber,
      roomId: entity.roomId,
      cancelledAt: entity.cancelledAt,
      cancellationReason: entity.cancellationReason,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private toView(row: ViewRow): ParticipationView {
    const paidCents = toCents(row.paid);
    const refundedCents = toCents(row.refunded);
    const netPaidCents = paidCents - refundedCents;
    const active = row.status === 'ACTIVE';
    const balanceCents = active ? toCents(row.contracted_amount) - netPaidCents : 0;

    return {
      id: row.id,
      personId: row.person_id,
      excursionId: row.excursion_id,
      contractedAmount: fromCents(toCents(row.contracted_amount)),
      status: row.status,
      excursionVehicleId: row.excursion_vehicle_id,
      seatNumber: row.seat_number,
      roomId: row.room_id,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      person: {
        id: row.person_id,
        fullName: row.full_name,
        nickname: row.nickname,
        document: row.document,
        birthDate: row.birth_date,
        phone: row.phone,
        email: row.email,
      },
      excursion: {
        id: row.excursion_id,
        name: row.excursion_name,
        status: row.excursion_status,
        type: row.excursion_type,
      },
      vehicleIdentifier: row.vehicle_identifier,
      room: row.room_id
        ? { id: row.room_id, identifier: row.room_identifier, hotelName: row.hotel_name }
        : null,
      financial: {
        paid: fromCents(paidCents),
        refunded: fromCents(refundedCents),
        netPaid: fromCents(netPaidCents),
        balance: fromCents(balanceCents),
        situation: active ? paymentSituation(toCents(row.contracted_amount), balanceCents, netPaidCents) : 'CANCELLED',
      },
    };
  }
}
