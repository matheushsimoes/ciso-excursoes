import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'excursion_hotel' })
export class ExcursionHotelEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'excursion_id', type: 'uuid' })
  excursionId: string;

  @Column({ name: 'hotel_id', type: 'uuid' })
  hotelId: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
