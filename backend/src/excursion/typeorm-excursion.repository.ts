import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExcursionRepository } from './excursion.repository.js';
import { Excursion } from './domain/excursion.js';
import { ExcursionEntity } from './entities/excursion.entity.js';

@Injectable()
export class TypeOrmExcursionRepository implements ExcursionRepository {
  constructor(
    @InjectRepository(ExcursionEntity)
    private readonly repository: Repository<ExcursionEntity>,
  ) {}

  async create(excursion: Excursion): Promise<Excursion> {
    const savedEntity = await this.repository.save(this.toEntity(excursion));
    return this.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Excursion | null> {
    const entity = await this.repository.findOne({
      where: { id },
    });

    return entity ? this.toDomain(entity) : null;
  }

  async findAll(): Promise<Excursion[]> {
    const entities = await this.repository.find({
      order: { startDate: 'ASC', name: 'ASC' },
    });
    return entities.map((entity) => this.toDomain(entity));
  }

  async update(excursion: Excursion): Promise<Excursion> {
    const savedEntity = await this.repository.save(this.toEntity(excursion));
    return this.toDomain(savedEntity);
  }

  private toEntity(excursion: Excursion): ExcursionEntity {
    return this.repository.create({
      id: excursion.id,
      name: excursion.name,
      destination: excursion.destination,
      type: excursion.type,
      startDate: excursion.startDate,
      endDate: excursion.endDate,
      referencePrice: excursion.referencePrice,
      status: excursion.status,
      createdAt: excursion.createdAt,
      updatedAt: excursion.updatedAt,
    });
  }

  private toDomain(entity: ExcursionEntity): Excursion {
    return {
      id: entity.id,
      name: entity.name,
      destination: entity.destination,
      type: entity.type,
      startDate: entity.startDate,
      endDate: entity.endDate,
      referencePrice: entity.referencePrice,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
