import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'excursion_bus' })
export class ExcursionBusEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'excursion_id', type: 'uuid' })
  excursionId: string;

  @Column({ name: 'bus_type_id', type: 'uuid' })
  busTypeId: string;

  @Column({ name: 'quantity', type: 'integer' })
  quantity: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
