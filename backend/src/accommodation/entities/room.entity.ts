import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'room' })
export class RoomEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'excursion_hotel_id', type: 'uuid' })
  excursionHotelId: string;

  @Column({ name: 'identifier', type: 'varchar', length: 30 })
  identifier: string;

  @Column({ name: 'capacity', type: 'integer' })
  capacity: number;

  @Column({ name: 'cost', type: 'numeric', precision: 12, scale: 2 })
  cost: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
