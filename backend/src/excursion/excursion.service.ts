import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExcursionDto } from './dto/create-excursion.dto.js';
import { UpdateExcursionDto } from './dto/update-excursion.dto.js';
import { ExcursionRepository } from './excursion.repository.js';
import { Excursion } from './domain/excursion.js';
import { randomUUID } from 'crypto';

@Injectable()
export class ExcursionService {
  constructor(private readonly excursionRepository: ExcursionRepository) {}

  async create(dto: CreateExcursionDto): Promise<Excursion> {
    this.assertValidPeriod(dto.startDate, dto.endDate);

    const now = new Date();

    return this.excursionRepository.create({
      id: randomUUID(),
      name: dto.name,
      destination: dto.destination,
      type: dto.type,
      startDate: dto.startDate,
      endDate: dto.endDate,
      referencePrice: dto.referencePrice,
      status: 'DRAFT',
      createdAt: now,
      updatedAt: now,
    });
  }

  private assertValidPeriod(startDate: string, endDate: string): void {
    if (endDate < startDate) {
      throw new BadRequestException('endDate must be on or after startDate');
    }
  }

  async findById(id: string): Promise<Excursion> {
    const excursion = await this.excursionRepository.findById(id);

    if (!excursion) {
      throw new NotFoundException('Excursion not found');
    }

    return excursion;
  }

  async findAll(): Promise<Excursion[]> {
    return this.excursionRepository.findAll();
  }

  async update(id: string, dto: UpdateExcursionDto): Promise<Excursion> {
    const excursion = await this.findById(id);

    const startDate = dto.startDate ?? excursion.startDate;
    const endDate = dto.endDate ?? excursion.endDate;
    this.assertValidPeriod(startDate, endDate);

    const updatedExcursion: Excursion = {
      ...excursion,
      name: dto.name ?? excursion.name,
      destination: dto.destination ?? excursion.destination,
      type: dto.type ?? excursion.type,
      startDate: startDate,
      endDate: endDate,
      referencePrice: dto.referencePrice ?? excursion.referencePrice,
      updatedAt: new Date(),
    };

    return this.excursionRepository.update(updatedExcursion);
  }
}
