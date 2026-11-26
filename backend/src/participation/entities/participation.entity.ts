import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ParticipationStatus } from '../domain/participation.js';

@Entity({ name: 'participation' })
export class ParticipationEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'person_id', type: 'uuid' })
  personId: string;

  @Column({ name: 'excursion_id', type: 'uuid' })
  excursionId: string;

  @Column({ name: 'contracted_amount', type: 'numeric', precision: 12, scale: 2 })
  contractedAmount: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: ParticipationStatus;

  @Column({ name: 'excursion_vehicle_id', type: 'uuid', nullable: true })
  excursionVehicleId: string | null;

  @Column({ name: 'seat_number', type: 'integer', nullable: true })
  seatNumber: number | null;

  @Column({ name: 'room_id', type: 'uuid', nullable: true })
  roomId: string | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ name: 'cancellation_reason', type: 'varchar', length: 255, nullable: true })
  cancellationReason: string | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
