import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'person' })
export class PersonEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({
    name: 'full_name',
    type: 'varchar',
    length: 150,
  })
  fullName: string;

  @Column({
    name: 'document',
    type: 'varchar',
    length: 20,
    unique: true,
  })
  document: string;

  @Column({
    name: 'birth_date',
    type: 'date',
  })
  birthDate: string;

  @Column({
    name: 'phone',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  phone: string | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 254,
    nullable: true,
  })
  email: string | null;

  @Column({
    name: 'nickname',
    type: 'varchar',
    length: 60,
    nullable: true,
  })
  nickname: string | null;

  @Column({
    name: 'rg',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  rg: string | null;

  @Column({
    name: 'rg_issuer',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  rgIssuer: string | null;

  @Column({
    name: 'address',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  address: string | null;

  @Column({
    name: 'neighborhood',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  neighborhood: string | null;

  @Column({
    name: 'city',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  city: string | null;

  @Column({
    name: 'state',
    type: 'char',
    length: 2,
    nullable: true,
  })
  state: string | null;

  @Column({
    name: 'postal_code',
    type: 'varchar',
    length: 9,
    nullable: true,
  })
  postalCode: string | null;

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
