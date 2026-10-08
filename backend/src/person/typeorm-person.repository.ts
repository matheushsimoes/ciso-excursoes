import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PersonRepository } from './person.repository.js';
import { Person } from './domain/person.js';
import { PersonEntity } from './entities/person.entity.js';

@Injectable()
export class TypeOrmPersonRepository implements PersonRepository {
  constructor(
    @InjectRepository(PersonEntity)
    private readonly repository: Repository<PersonEntity>,
  ) {}

  async create(person: Person): Promise<Person> {
    const savedEntity = await this.repository.save(this.toEntity(person));
    return this.toDomain(savedEntity);
  }

  async findByDocument(document: string): Promise<Person | null> {
    const entity = await this.repository.findOne({
      where: { document },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findById(id: string): Promise<Person | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Person[]> {
    const entities = await this.repository.find({ order: { fullName: 'ASC' } });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(person: Person): Promise<Person> {
    const savedEntity = await this.repository.save(this.toEntity(person));
    return this.toDomain(savedEntity);
  }

  private toEntity(person: Person): PersonEntity {
    return this.repository.create({
      id: person.id,
      fullName: person.fullName,
      document: person.document,
      birthDate: person.birthDate,
      phone: person.phone ?? null,
      email: person.email ?? null,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
  }


  private toDomain(entity: PersonEntity): Person {
    return {
      id: entity.id,
      fullName: entity.fullName,
      document: entity.document,
      birthDate: entity.birthDate,
      phone: entity.phone ?? undefined,
      email: entity.email ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
