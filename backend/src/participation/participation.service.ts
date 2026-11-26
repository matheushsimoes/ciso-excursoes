import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { normalizeMoney, toCents } from '../common/money.js';
import { ExcursionService } from '../excursion/excursion.service.js';
import { PersonService } from '../person/person.service.js';
import type { Participation, ParticipationView } from './domain/participation.js';
import { CancelParticipationDto } from './dto/cancel-participation.dto.js';
import { CreateParticipationDto } from './dto/create-participation.dto.js';
import { ReplaceParticipationDto } from './dto/replace-participation.dto.js';
import { UpdateContractedAmountDto } from './dto/update-contracted-amount.dto.js';
import { ParticipationRepository } from './participation.repository.js';

@Injectable()
export class ParticipationService {
  constructor(
    private readonly participationRepository: ParticipationRepository,
    private readonly excursionService: ExcursionService,
    private readonly personService: PersonService,
  ) {}

  /** UC08 — Add a person to an excursion. */
  async create(excursionId: string, dto: CreateParticipationDto): Promise<ParticipationView> {
    const excursion = await this.excursionService.findEditable(excursionId);
    await this.personService.findById(dto.personId);

    const participation = this.newParticipation(
      excursionId,
      dto.personId,
      dto.contractedAmount ?? excursion.referencePrice,
    );

    await this.participationRepository.create(participation);
    return this.findView(participation.id);
  }

  async findById(id: string): Promise<Participation> {
    const participation = await this.participationRepository.findById(id);
    if (!participation) {
      throw new NotFoundException('Participation not found');
    }
    return participation;
  }

  /** Returns an active participation whose excursion can still change. */
  async findEditable(id: string): Promise<Participation> {
    const participation = await this.findById(id);

    if (participation.status !== 'ACTIVE') {
      throw new ConflictException('Participation is cancelled');
    }
    await this.excursionService.findEditable(participation.excursionId);

    return participation;
  }

  /** UC10 — View a participation. */
  async findView(id: string): Promise<ParticipationView> {
    const view = await this.participationRepository.findViewById(id);
    if (!view) {
      throw new NotFoundException('Participation not found');
    }
    return view;
  }

  async listByExcursion(excursionId: string): Promise<ParticipationView[]> {
    await this.excursionService.findById(excursionId);
    return this.participationRepository.findViewsByExcursion(excursionId);
  }

  /** UC07 — Excursion history of a person. */
  async listByPerson(personId: string): Promise<ParticipationView[]> {
    await this.personService.findById(personId);
    return this.participationRepository.findViewsByPerson(personId);
  }

  /**
   * UC09 — Change the amount agreed with this participant. The new value can't
   * be lower than what was already paid: that would hide money owed back.
   */
  async updateContractedAmount(
    id: string,
    dto: UpdateContractedAmountDto,
  ): Promise<ParticipationView> {
    const participation = await this.findEditable(id);
    const contractedAmount = normalizeMoney(dto.contractedAmount);

    const netPaid = await this.participationRepository.netPaidCents(id);
    if (toCents(contractedAmount) < netPaid) {
      throw new ConflictException(
        'Contracted amount cannot be lower than the amount already paid; register a refund instead',
      );
    }

    await this.participationRepository.update({
      ...participation,
      contractedAmount,
      updatedAt: new Date(),
    });
    return this.findView(id);
  }

  /**
   * UC35 — Cancel a participation. The row is kept (RN43); seat and room are
   * released so the place can be reassigned. Cancelling twice is a no-op.
   * Refunds, when any, are registered separately (UC36, RN44).
   */
  async cancel(id: string, dto: CancelParticipationDto): Promise<ParticipationView> {
    const participation = await this.findById(id);

    if (participation.status === 'CANCELLED') {
      return this.findView(id);
    }
    await this.excursionService.findEditable(participation.excursionId);

    await this.participationRepository.update(this.cancelled(participation, dto.reason));
    return this.findView(id);
  }

  /**
   * UC37 — Replace a participant: cancel the original participation and create
   * a new one for another person, atomically. Seat and room are not carried over
   * (RN45, RN46): the new participant is allocated manually.
   */
  async replace(id: string, dto: ReplaceParticipationDto): Promise<ParticipationView> {
    const participation = await this.findEditable(id);
    await this.personService.findById(dto.personId);

    if (dto.personId === participation.personId) {
      throw new ConflictException('The replacement must be a different person');
    }

    const replacement = this.newParticipation(
      participation.excursionId,
      dto.personId,
      dto.contractedAmount ?? participation.contractedAmount,
    );

    await this.participationRepository.replace(
      this.cancelled(participation, dto.reason ?? 'Replaced by another participant'),
      replacement,
    );
    return this.findView(replacement.id);
  }

  private newParticipation(
    excursionId: string,
    personId: string,
    contractedAmount: string,
  ): Participation {
    const now = new Date();
    return {
      id: randomUUID(),
      personId,
      excursionId,
      contractedAmount: normalizeMoney(contractedAmount),
      status: 'ACTIVE',
      excursionVehicleId: null,
      seatNumber: null,
      roomId: null,
      cancelledAt: null,
      cancellationReason: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private cancelled(participation: Participation, reason?: string): Participation {
    const now = new Date();
    return {
      ...participation,
      status: 'CANCELLED',
      excursionVehicleId: null,
      seatNumber: null,
      roomId: null,
      cancelledAt: now,
      cancellationReason: reason ?? null,
      updatedAt: now,
    };
  }
}
