import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

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
  birthDate: Date;

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

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}