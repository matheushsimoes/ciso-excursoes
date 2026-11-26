import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { normalizeMoney } from '../common/money.js';
import { ExcursionService } from '../excursion/excursion.service.js';
import { ParticipationService } from '../participation/participation.service.js';
import { ActivityRepository, TicketTypeInfo } from './activity.repository.js';
import type {
  Activity,
  ActivityWithTickets,
  Supplier,
  SupplierPurchaseView,
  TicketDemandLine,
  TicketPurchaseView,
  TicketType,
} from './domain/activity.js';
import {
  CreateActivityDto,
  CreateSupplierDto,
  CreateSupplierPurchaseDto,
  CreateTicketPurchaseDto,
  CreateTicketTypeDto,
  UpdateActivityDto,
  UpdateSupplierDto,
  UpdateTicketTypeDto,
} from './dto/activity.dto.js';

@Injectable()
export class ActivityService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly excursionService: ExcursionService,
    private readonly participationService: ParticipationService,
  ) {}

  // ---------------------------------------------------------- activities (UC25, UC26)

  /** Activities can be added after the excursion opened for sale (RN06). */
  async createActivity(excursionId: string, dto: CreateActivityDto): Promise<Activity> {
    await this.excursionService.findEditable(excursionId);
    const now = new Date();
    return this.activityRepository.createActivity({
      id: randomUUID(),
      excursionId,
      name: dto.name,
      description: dto.description ?? null,
      isOptional: dto.isOptional ?? true,
      createdAt: now,
      updatedAt: now,
    });
  }

  async listActivities(excursionId: string): Promise<ActivityWithTickets[]> {
    await this.excursionService.findById(excursionId);
    return this.activityRepository.listActivities(excursionId);
  }

  async updateActivity(id: string, dto: UpdateActivityDto): Promise<Activity> {
    const activity = await this.findActivity(id);
    await this.excursionService.findEditable(activity.excursionId);
    return this.activityRepository.updateActivity({
      ...activity,
      name: dto.name ?? activity.name,
      description: dto.description ?? activity.description,
      isOptional: dto.isOptional ?? activity.isOptional,
      updatedAt: new Date(),
    });
  }

  // -------------------------------------------------------- ticket types (UC27, UC28)

  async createTicketType(activityId: string, dto: CreateTicketTypeDto): Promise<TicketType> {
    const activity = await this.findActivity(activityId);
    await this.excursionService.findEditable(activity.excursionId);
    const now = new Date();
    return this.activityRepository.createTicketType({
      id: randomUUID(),
      activityId,
      name: dto.name,
      description: dto.description ?? null,
      currentPrice: normalizeMoney(dto.currentPrice),
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Changing the current price only affects new sales: purchases already made
   * keep the price they were sold for (RN35).
   */
  async updateTicketType(id: string, dto: UpdateTicketTypeDto): Promise<TicketType> {
    const ticketType = await this.findTicketType(id);
    await this.excursionService.findEditable(ticketType.excursionId);
    const { excursionId: _excursionId, activityName: _activityName, ...current } = ticketType;
    return this.activityRepository.updateTicketType({
      ...current,
      name: dto.name ?? current.name,
      description: dto.description ?? current.description,
      currentPrice: dto.currentPrice ? normalizeMoney(dto.currentPrice) : current.currentPrice,
      updatedAt: new Date(),
    });
  }

  // ------------------------------------------------------ ticket purchases (UC29)

  async createTicketPurchase(
    participationId: string,
    dto: CreateTicketPurchaseDto,
  ): Promise<TicketPurchaseView> {
    await this.participationService.findEditable(participationId);
    const ticketType = await this.findTicketType(dto.ticketTypeId);
    const now = new Date();
    const purchase = {
      id: randomUUID(),
      participationId,
      ticketTypeId: ticketType.id,
      quantity: dto.quantity,
      soldPrice: ticketType.currentPrice,
      status: 'REQUESTED' as const,
      createdAt: now,
      updatedAt: now,
    };

    await this.activityRepository.createTicketPurchase(
      purchase,
      ticketType.activityId,
      ({ participation, sameActivityPurchases }) => {
        if (participation.status !== 'ACTIVE') {
          throw new ConflictException('Participation is cancelled');
        }
        if (participation.excursionId !== ticketType.excursionId) {
          throw new ConflictException('The ticket type belongs to another excursion');
        }
        if (sameActivityPurchases > 0) {
          throw new ConflictException(
            `This participant already has a ticket for "${ticketType.activityName}" (RN32)`,
          );
        }
      },
    );

    return (await this.activityRepository.findTicketPurchaseView(purchase.id))!;
  }

  async listTicketPurchases(participationId: string): Promise<TicketPurchaseView[]> {
    await this.participationService.findById(participationId);
    return this.activityRepository.listTicketPurchases(participationId);
  }

  /** Marks a requested ticket as confirmed with the supplier. Idempotent. */
  async confirmTicketPurchase(id: string): Promise<TicketPurchaseView> {
    const purchase = await this.activityRepository.findTicketPurchase(id);
    if (!purchase) throw new NotFoundException('Ticket purchase not found');

    if (purchase.status !== 'CONFIRMED') {
      await this.activityRepository.updateTicketPurchase({
        ...purchase,
        status: 'CONFIRMED',
        updatedAt: new Date(),
      });
    }
    return (await this.activityRepository.findTicketPurchaseView(id))!;
  }

  /** UC30 — tickets requested by participants vs. bought from suppliers. */
  async ticketDemand(excursionId: string): Promise<TicketDemandLine[]> {
    await this.excursionService.findById(excursionId);
    return this.activityRepository.ticketDemand(excursionId);
  }

  // ----------------------------------------------------------- suppliers (UC31)

  createSupplier(dto: CreateSupplierDto): Promise<Supplier> {
    const now = new Date();
    return this.activityRepository.createSupplier({
      id: randomUUID(),
      name: dto.name,
      document: dto.document ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  listSuppliers(): Promise<Supplier[]> {
    return this.activityRepository.listSuppliers();
  }

  async updateSupplier(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.findSupplier(id);
    return this.activityRepository.updateSupplier({
      ...supplier,
      name: dto.name ?? supplier.name,
      document: dto.document ?? supplier.document,
      phone: dto.phone ?? supplier.phone,
      email: dto.email ?? supplier.email,
      updatedAt: new Date(),
    });
  }

  async createSupplierPurchase(
    ticketTypeId: string,
    dto: CreateSupplierPurchaseDto,
  ): Promise<SupplierPurchaseView[]> {
    const ticketType = await this.findTicketType(ticketTypeId);
    await this.findSupplier(dto.supplierId);
    const now = new Date();
    await this.activityRepository.createSupplierPurchase({
      id: randomUUID(),
      supplierId: dto.supplierId,
      ticketTypeId,
      quantity: dto.quantity,
      unitCost: normalizeMoney(dto.unitCost),
      status: dto.status ?? 'CONFIRMED',
      purchaseDate: dto.purchaseDate,
      createdAt: now,
      updatedAt: now,
    });
    return this.activityRepository.listSupplierPurchases(ticketType.excursionId);
  }

  async listSupplierPurchases(excursionId: string): Promise<SupplierPurchaseView[]> {
    await this.excursionService.findById(excursionId);
    return this.activityRepository.listSupplierPurchases(excursionId);
  }

  private async findActivity(id: string): Promise<Activity> {
    const activity = await this.activityRepository.findActivity(id);
    if (!activity) throw new NotFoundException('Activity not found');
    return activity;
  }

  private async findTicketType(id: string): Promise<TicketTypeInfo> {
    const ticketType = await this.activityRepository.findTicketType(id);
    if (!ticketType) throw new NotFoundException('Ticket type not found');
    return ticketType;
  }

  private async findSupplier(id: string): Promise<Supplier> {
    const supplier = await this.activityRepository.findSupplier(id);
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }
}
