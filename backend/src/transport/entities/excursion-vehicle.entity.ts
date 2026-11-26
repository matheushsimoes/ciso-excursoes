import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'excursion_vehicle' })
export class ExcursionVehicleEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'excursion_bus_id', type: 'uuid' })
  excursionBusId: string;

  @Column({ name: 'identifier', type: 'varchar', length: 50 })
  identifier: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
