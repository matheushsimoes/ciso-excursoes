import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';

import { normalizeMoney } from '../common/money.js';
import { ExcursionService } from '../excursion/excursion.service.js';
import type { ParticipationView } from '../participation/domain/participation.js';
import { ParticipationService } from '../participation/participation.service.js';
import { AccommodationRepository } from './accommodation.repository.js';
import type { AccommodationOverview, Hotel, Room } from './domain/accommodation.js';
import { assertCanAssignRoom } from './domain/accommodation-rules.js';
import { CreateHotelDto, UpdateHotelDto } from './dto/hotel.dto.js';
import { AssignRoomDto, CreateRoomDto, LinkHotelDto, UpdateRoomDto } from './dto/room.dto.js';

@Injectable()
export class AccommodationService {
  constructor(
    private readonly accommodationRepository: AccommodationRepository,
    private readonly excursionService: ExcursionService,
    private readonly participationService: ParticipationService,
  ) {}

  // -------------------------------------------------------------- hotels (UC18)

  createHotel(dto: CreateHotelDto): Promise<Hotel> {
    const now = new Date();
    return this.accommodationRepository.createHotel({
      id: randomUUID(),
      name: dto.name,
      address: dto.address ?? null,
      phone: dto.phone ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  listHotels(): Promise<Hotel[]> {
    return this.accommodationRepository.listHotels();
  }

  async findHotel(id: string): Promise<Hotel> {
    const hotel = await this.accommodationRepository.findHotel(id);
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async updateHotel(id: string, dto: UpdateHotelDto): Promise<Hotel> {
    const hotel = await this.findHotel(id);
    return this.accommodationRepository.updateHotel({
      ...hotel,
      name: dto.name ?? hotel.name,
      address: dto.address ?? hotel.address,
      phone: dto.phone ?? hotel.phone,
      updatedAt: new Date(),
    });
  }

  // ------------------------------------------------- excursion hotels (UC19, UC21)

  async overview(excursionId: string): Promise<AccommodationOverview> {
    await this.excursionService.findById(excursionId);
    return this.accommodationRepository.overview(excursionId);
  }

  async linkHotel(excursionId: string, dto: LinkHotelDto): Promise<AccommodationOverview> {
    const excursion = await this.excursionService.findEditable(excursionId);
    if (excursion.type === 'DAY_TRIP') {
      throw new ConflictException('Day trips have no accommodation (RN22)');
    }
    await this.findHotel(dto.hotelId);

    const now = new Date();
    await this.accommodationRepository.linkHotel({
      id: randomUUID(),
      excursionId,
      hotelId: dto.hotelId,
      createdAt: now,
      updatedAt: now,
    });
    return this.accommodationRepository.overview(excursionId);
  }

  async unlinkHotel(excursionHotelId: string): Promise<AccommodationOverview> {
    const link = await this.findExcursionHotel(excursionHotelId);
    await this.excursionService.findEditable(link.excursionId);
    await this.accommodationRepository.unlinkHotel(excursionHotelId);
    return this.accommodationRepository.overview(link.excursionId);
  }

  // --------------------------------------------------------------- rooms (UC20)

  async createRoom(excursionHotelId: string, dto: CreateRoomDto): Promise<Room> {
    const link = await this.findExcursionHotel(excursionHotelId);
    await this.excursionService.findEditable(link.excursionId);

    const now = new Date();
    return this.accommodationRepository.createRoom({
      id: randomUUID(),
      excursionHotelId,
      identifier: dto.identifier,
      capacity: dto.capacity,
      cost: normalizeMoney(dto.cost),
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateRoom(id: string, dto: UpdateRoomDto): Promise<Room> {
    const room = await this.findRoom(id);
    const info = await this.accommodationRepository.findRoomInfo(id);
    await this.excursionService.findEditable(info!.excursionId);

    if (dto.capacity !== undefined && dto.capacity < info!.occupied) {
      throw new ConflictException(
        `Room ${room.identifier} has ${info!.occupied} occupant(s): capacity cannot be lower (RN25)`,
      );
    }

    return this.accommodationRepository.updateRoom({
      ...room,
      identifier: dto.identifier ?? room.identifier,
      capacity: dto.capacity ?? room.capacity,
      cost: dto.cost ? normalizeMoney(dto.cost) : room.cost,
      updatedAt: new Date(),
    });
  }

  async deleteRoom(id: string): Promise<void> {
    await this.findRoom(id);
    const info = await this.accommodationRepository.findRoomInfo(id);
    await this.excursionService.findEditable(info!.excursionId);
    await this.accommodationRepository.deleteRoom(id);
  }

  // ------------------------------------------------------- allocation (UC22, UC23)

  async assignRoom(participationId: string, dto: AssignRoomDto): Promise<ParticipationView> {
    const participation = await this.participationService.findEditable(participationId);
    const roomId = dto.roomId ?? null;

    if (roomId) {
      const excursion = await this.excursionService.findById(participation.excursionId);
      if (excursion.type === 'DAY_TRIP') {
        throw new ConflictException('Day trips have no accommodation (RN22)');
      }
    }

    await this.accommodationRepository.assignRoom(participationId, roomId, (current, room) => {
      if (current.status !== 'ACTIVE') {
        throw new ConflictException('Participation is cancelled');
      }
      if (room) {
        assertCanAssignRoom(current, room);
      }
    });

    return this.participationService.findView(participationId);
  }

  private async findExcursionHotel(id: string) {
    const link = await this.accommodationRepository.findExcursionHotel(id);
    if (!link) throw new NotFoundException('Excursion hotel not found');
    return link;
  }

  private async findRoom(id: string): Promise<Room> {
    const room = await this.accommodationRepository.findRoom(id);
    if (!room) throw new NotFoundException('Room not found');
    return room;
  }
}
