import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ExcursionType, ExcursionStatus } from '../domain/excursion.js';

@Entity({ name: 'excursion' })
export class ExcursionEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    name: 'name',
    type: 'varchar',
    length: 150,
  })
  name: string;

  @Column({
    name: 'destination',
    type: 'varchar',
    length: 150,
  })
  destination: string;

  @Column({
    name: 'type',
    type: 'varchar',
    length: 20,
  })
  type: ExcursionType;

  @Column({
    name: 'start_date',
    type: 'date',
  })
  startDate: string;

  @Column({
    name: 'end_date',
    type: 'date',
  })
  endDate: string;

  @Column({
    name: 'reference_price',
    type: 'numeric',
    precision: 12,
    scale: 2,
  })
  referencePrice: string;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
  })
  status: ExcursionStatus;

  @Column({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
