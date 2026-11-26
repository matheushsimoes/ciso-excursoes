import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateExcursionDto } from './dto/create-excursion.dto.js';
import { UpdateExcursionDto } from './dto/update-excursion.dto.js';
import { ExcursionRepository } from './excursion.repository.js';
import { Excursion } from './domain/excursion.js';
import { randomUUID } from 'crypto';
import { normalizeMoney } from '../common/money.js';
import { canTransition, isFinalStatus } from './domain/excursion-status.js';
import { ChangeExcursionStatusDto } from './dto/change-excursion-status.dto.js';

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
      referencePrice: normalizeMoney(dto.referencePrice),
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

  /**
   * Returns the excursion only if its operational data can still change
   * (participants, transport, accommodation, activities). Finished or cancelled
   * excursions are history (RN56).
   */
  async findEditable(id: string): Promise<Excursion> {
    const excursion = await this.findById(id);

    if (isFinalStatus(excursion.status)) {
      throw new ConflictException(
        `Excursion is ${excursion.status} and can no longer be changed`,
      );
    }

    return excursion;
  }

  async update(id: string, dto: UpdateExcursionDto): Promise<Excursion> {
    const excursion = await this.findById(id);

    if (isFinalStatus(excursion.status)) {
      throw new ConflictException(
        `Cannot edit an excursion with status ${excursion.status}`,
      );
    }

    if (
      dto.type === 'DAY_TRIP' &&
      excursion.type !== 'DAY_TRIP' &&
      (await this.excursionRepository.countHotels(id)) > 0
    ) {
      throw new ConflictException(
        'Remove the hotels of this excursion before changing it to a day trip',
      );
    }

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
      referencePrice: dto.referencePrice
        ? normalizeMoney(dto.referencePrice)
        : excursion.referencePrice,
      updatedAt: new Date(),
    };

    return this.excursionRepository.update(updatedExcursion);
  }

  async changeStatus(
    id: string,
    dto: ChangeExcursionStatusDto,
  ): Promise<Excursion> {
    const excursion = await this.findById(id);

    if (excursion.status === dto.status) {
      return excursion;
    }

    if (!canTransition(excursion.status, dto.status)) {
      throw new ConflictException(
        `Cannot change excursion status from ${excursion.status} to ${dto.status}`,
      );
    }

    if (dto.status === 'CONFIRMED' && excursion.type === 'OVERNIGHT') {
      const withoutRoom =
        await this.excursionRepository.countActiveParticipantsWithoutRoom(id);

      if (withoutRoom > 0) {
        throw new ConflictException(
          `Cannot confirm the excursion: ${withoutRoom} active participant(s) without a room (RN22)`,
        );
      }
    }

    return this.excursionRepository.update({
      ...excursion,
      status: dto.status,
      updatedAt: new Date(),
    });
  }
}
