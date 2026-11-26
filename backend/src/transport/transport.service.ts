import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { ExcursionService } from '../excursion/excursion.service.js';
import type { ParticipationView } from '../participation/domain/participation.js';
import { ParticipationService } from '../participation/participation.service.js';
import type {
  BusType,
  ExcursionVehicle,
  SeatMap,
  TransportOverview,
} from './domain/transport.js';
import { assertCanAssignTransport } from './domain/transport-rules.js';
import { nextVehicleNumbers, vehicleNumber } from './domain/vehicle-numbering.js';
import { AssignTransportDto } from './dto/assign-transport.dto.js';
import { CreateBusTypeDto, UpdateBusTypeDto } from './dto/bus-type.dto.js';
import { AddExcursionBusDto, UpdateExcursionBusDto } from './dto/excursion-bus.dto.js';
import { TransportRepository } from './transport.repository.js';

@Injectable()
export class TransportService {
  constructor(
    private readonly transportRepository: TransportRepository,
    private readonly excursionService: ExcursionService,
    private readonly participationService: ParticipationService,
  ) {}

  // ---------------------------------------------------------------- bus types (UC11)

  async createBusType(dto: CreateBusTypeDto): Promise<BusType> {
    const now = new Date();
    return this.transportRepository.createBusType({
      id: randomUUID(),
      name: dto.name,
      capacity: dto.capacity,
      description: dto.description ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  listBusTypes(): Promise<BusType[]> {
    return this.transportRepository.listBusTypes();
  }

  async findBusType(id: string): Promise<BusType> {
    const busType = await this.transportRepository.findBusType(id);
    if (!busType) throw new NotFoundException('Bus type not found');
    return busType;
  }

  async updateBusType(id: string, dto: UpdateBusTypeDto): Promise<BusType> {
    const busType = await this.findBusType(id);

    if (dto.capacity !== undefined && dto.capacity < busType.capacity) {
      const usage = await this.transportRepository.busTypeUsage(id);
      if (usage.maxOccupied > dto.capacity || usage.maxSeat > dto.capacity) {
        throw new ConflictException(
          'A vehicle of this type has more passengers or a higher seat number than the new capacity',
        );
      }
    }

    return this.transportRepository.updateBusType({
      ...busType,
      name: dto.name ?? busType.name,
      capacity: dto.capacity ?? busType.capacity,
      description: dto.description ?? busType.description,
      updatedAt: new Date(),
    });
  }

  // ------------------------------------------------------- excursion buses (UC12, UC13)

  async overview(excursionId: string): Promise<TransportOverview> {
    await this.excursionService.findById(excursionId);
    return this.transportRepository.overview(excursionId);
  }

  async addExcursionBus(
    excursionId: string,
    dto: AddExcursionBusDto,
  ): Promise<TransportOverview> {
    await this.excursionService.findEditable(excursionId);
    await this.findBusType(dto.busTypeId);

    if (await this.transportRepository.findExcursionBusByType(excursionId, dto.busTypeId)) {
      throw new ConflictException(
        'This bus type is already in the excursion: change its quantity instead (RN11)',
      );
    }

    const now = new Date();
    const bus = {
      id: randomUUID(),
      excursionId,
      busTypeId: dto.busTypeId,
      quantity: dto.quantity,
      createdAt: now,
      updatedAt: now,
    };
    const identifiers = nextVehicleNumbers(
      await this.transportRepository.vehicleIdentifiers(excursionId),
      dto.quantity,
    );

    await this.transportRepository.addExcursionBus(
      bus,
      identifiers.map((identifier) => this.newVehicle(bus.id, identifier, now)),
    );
    return this.transportRepository.overview(excursionId);
  }

  /**
   * Changes how many units of a bus type the excursion uses. Growing creates new
   * vehicles; shrinking removes the highest-numbered empty ones. Vehicles with
   * passengers are never removed: they must be reallocated first (RN20, RN21).
   */
  async resizeExcursionBus(
    id: string,
    dto: UpdateExcursionBusDto,
  ): Promise<TransportOverview> {
    const bus = await this.findExcursionBus(id);
    await this.excursionService.findEditable(bus.excursionId);

    const vehicles = await this.transportRepository.vehiclesOfBus(id);
    const now = new Date();
    let toAdd: ExcursionVehicle[] = [];
    let toRemove: string[] = [];

    if (dto.quantity > vehicles.length) {
      const identifiers = nextVehicleNumbers(
        await this.transportRepository.vehicleIdentifiers(bus.excursionId),
        dto.quantity - vehicles.length,
      );
      toAdd = identifiers.map((identifier) => this.newVehicle(id, identifier, now));
    } else if (dto.quantity < vehicles.length) {
      const removable = vehicles
        .filter((vehicle) => vehicle.occupied === 0)
        .sort((a, b) => vehicleNumber(b.identifier) - vehicleNumber(a.identifier));
      const needed = vehicles.length - dto.quantity;

      if (removable.length < needed) {
        throw new ConflictException(
          `Only ${removable.length} vehicle(s) of this type are empty: reallocate passengers before reducing the quantity (RN20)`,
        );
      }
      toRemove = removable.slice(0, needed).map((vehicle) => vehicle.id);
    }

    await this.transportRepository.resizeExcursionBus(
      { ...bus, quantity: dto.quantity, updatedAt: now },
      toAdd,
      toRemove,
    );
    return this.transportRepository.overview(bus.excursionId);
  }

  async removeExcursionBus(id: string): Promise<TransportOverview> {
    const bus = await this.findExcursionBus(id);
    await this.excursionService.findEditable(bus.excursionId);
    await this.transportRepository.deleteExcursionBus(id);
    return this.transportRepository.overview(bus.excursionId);
  }

  // ------------------------------------------------------ allocation (UC14 – UC17)

  async seatMap(vehicleId: string): Promise<SeatMap> {
    const seatMap = await this.transportRepository.seatMap(vehicleId);
    if (!seatMap) throw new NotFoundException('Vehicle not found');
    return seatMap;
  }

  /**
   * Puts a participant in a vehicle and, optionally, a seat. A seat always needs
   * a vehicle (RN18); the database guarantees no duplicated seat (RN17).
   */
  async assignTransport(
    participationId: string,
    dto: AssignTransportDto,
  ): Promise<ParticipationView> {
    const vehicleId = dto.excursionVehicleId ?? null;
    const seatNumber = dto.seatNumber ?? null;

    if (seatNumber !== null && vehicleId === null) {
      throw new BadRequestException('A seat requires a vehicle (RN18)');
    }

    await this.participationService.findEditable(participationId);

    await this.transportRepository.assignTransport(
      participationId,
      vehicleId,
      seatNumber,
      (participation, vehicle) => {
        // Re-checked under the row lock: it may have been cancelled meanwhile.
        if (participation.status !== 'ACTIVE') {
          throw new ConflictException('Participation is cancelled');
        }
        if (vehicle) {
          assertCanAssignTransport({ participation, vehicle, seatNumber });
        }
      },
    );

    return this.participationService.findView(participationId);
  }

  private async findExcursionBus(id: string) {
    const bus = await this.transportRepository.findExcursionBus(id);
    if (!bus) throw new NotFoundException('Excursion bus not found');
    return bus;
  }

  private newVehicle(excursionBusId: string, identifier: string, now: Date): ExcursionVehicle {
    return { id: randomUUID(), excursionBusId, identifier, createdAt: now, updatedAt: now };
  }
}
