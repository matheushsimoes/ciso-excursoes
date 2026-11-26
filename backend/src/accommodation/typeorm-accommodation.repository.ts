import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { isForeignKeyViolation, isUniqueViolation } from '../common/database-errors.js';
import { fromCents, toCents } from '../common/money.js';
import type {
  AccommodationOverview,
  ExcursionHotel,
  Hotel,
  Room,
  RoomInfo,
} from './domain/accommodation.js';
import { AccommodationRepository, ParticipationRoom } from './accommodation.repository.js';
import { ExcursionHotelEntity } from './entities/excursion-hotel.entity.js';
import { HotelEntity } from './entities/hotel.entity.js';
import { RoomEntity } from './entities/room.entity.js';

const ROOM_INFO_SQL = `
  SELECT r.id, r.identifier, r.capacity, eh.excursion_id,
         (SELECT count(*)::int FROM participation p
           WHERE p.room_id = r.id AND p.status = 'ACTIVE') AS occupied
    FROM room r
    JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
`;

function toRoomInfo(row: Record<string, any>): RoomInfo {
  return {
    id: row.id,
    identifier: row.identifier,
    capacity: row.capacity,
    excursionId: row.excursion_id,
    occupied: row.occupied,
  };
}

@Injectable()
export class TypeOrmAccommodationRepository implements AccommodationRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createHotel(hotel: Hotel): Promise<Hotel> {
    await this.dataSource.getRepository(HotelEntity).insert(hotel);
    return hotel;
  }

  findHotel(id: string): Promise<Hotel | null> {
    return this.dataSource.getRepository(HotelEntity).findOne({ where: { id } });
  }

  listHotels(): Promise<Hotel[]> {
    return this.dataSource.getRepository(HotelEntity).find({ order: { name: 'ASC' } });
  }

  async updateHotel(hotel: Hotel): Promise<Hotel> {
    const repository = this.dataSource.getRepository(HotelEntity);
    await repository.save(repository.create(hotel));
    return hotel;
  }

  async overview(excursionId: string): Promise<AccommodationOverview> {
    const hotels: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT eh.id, h.id AS hotel_id, h.name, h.address, h.phone, h.created_at, h.updated_at
         FROM excursion_hotel eh
         JOIN hotel h ON h.id = eh.hotel_id
        WHERE eh.excursion_id = $1
        ORDER BY h.name ASC`,
      [excursionId],
    );
    const rooms: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT r.id, r.excursion_hotel_id, r.identifier, r.capacity, r.cost::text AS cost
         FROM room r
         JOIN excursion_hotel eh ON eh.id = r.excursion_hotel_id
        WHERE eh.excursion_id = $1`,
      [excursionId],
    );
    const occupants: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT p.id, p.room_id, per.full_name
         FROM participation p
         JOIN person per ON per.id = p.person_id
        WHERE p.excursion_id = $1 AND p.status = 'ACTIVE' AND p.room_id IS NOT NULL
        ORDER BY per.full_name ASC`,
      [excursionId],
    );

    const byIdentifier = (a: { identifier: string }, b: { identifier: string }) =>
      a.identifier.localeCompare(b.identifier, 'pt-BR', { numeric: true });

    const result = hotels.map((hotel) => ({
      id: hotel.id,
      hotel: {
        id: hotel.hotel_id,
        name: hotel.name,
        address: hotel.address,
        phone: hotel.phone,
        createdAt: hotel.created_at,
        updatedAt: hotel.updated_at,
      },
      rooms: rooms
        .filter((room) => room.excursion_hotel_id === hotel.id)
        .map((room) => ({
          id: room.id,
          identifier: room.identifier,
          capacity: room.capacity,
          cost: fromCents(toCents(room.cost)),
          occupants: occupants
            .filter((occupant) => occupant.room_id === room.id)
            .map((occupant) => ({ participationId: occupant.id, personName: occupant.full_name })),
        }))
        .sort(byIdentifier),
    }));

    const allRooms = result.flatMap((hotel) => hotel.rooms);
    return {
      excursionId,
      totalCapacity: allRooms.reduce((total, room) => total + room.capacity, 0),
      totalOccupied: allRooms.reduce((total, room) => total + room.occupants.length, 0),
      totalRoomCost: fromCents(allRooms.reduce((total, room) => total + toCents(room.cost), 0)),
      hotels: result,
    };
  }

  findExcursionHotel(id: string): Promise<ExcursionHotel | null> {
    return this.dataSource.getRepository(ExcursionHotelEntity).findOne({ where: { id } });
  }

  async linkHotel(excursionHotel: ExcursionHotel): Promise<void> {
    try {
      await this.dataSource.getRepository(ExcursionHotelEntity).insert(excursionHotel);
    } catch (error) {
      if (isUniqueViolation(error, 'uq_excursion_hotel')) {
        throw new ConflictException('This hotel is already linked to the excursion');
      }
      throw error;
    }
  }

  async unlinkHotel(id: string): Promise<void> {
    try {
      await this.dataSource.getRepository(ExcursionHotelEntity).delete({ id });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        throw new ConflictException('Remove the rooms of this hotel first');
      }
      throw error;
    }
  }

  async createRoom(room: Room): Promise<Room> {
    try {
      await this.dataSource.getRepository(RoomEntity).insert(room);
      return room;
    } catch (error) {
      throw this.translateRoomError(error);
    }
  }

  async findRoom(id: string): Promise<Room | null> {
    const room = await this.dataSource.getRepository(RoomEntity).findOne({ where: { id } });
    return room ? { ...room, cost: fromCents(toCents(room.cost)) } : null;
  }

  async findRoomInfo(id: string): Promise<RoomInfo | null> {
    const rows = await this.dataSource.query(`${ROOM_INFO_SQL} WHERE r.id = $1`, [id]);
    return rows.length ? toRoomInfo(rows[0]) : null;
  }

  async updateRoom(room: Room): Promise<Room> {
    try {
      const repository = this.dataSource.getRepository(RoomEntity);
      await repository.save(repository.create(room));
      return room;
    } catch (error) {
      throw this.translateRoomError(error);
    }
  }

  async deleteRoom(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query(
        `SELECT count(*)::int AS total FROM participation WHERE room_id = $1 AND status = 'ACTIVE'`,
        [id],
      );
      if (row.total > 0) {
        throw new ConflictException('This room has occupants: move them first');
      }
      await manager.delete(RoomEntity, { id });
    });
  }

  async assignRoom(
    participationId: string,
    roomId: string | null,
    check: (participation: ParticipationRoom, room: RoomInfo | null) => void,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const [participation] = await manager.query(
        'SELECT id, excursion_id, status, room_id FROM participation WHERE id = $1 FOR UPDATE',
        [participationId],
      );
      if (!participation) throw new NotFoundException('Participation not found');

      let room: RoomInfo | null = null;
      if (roomId) {
        // Serializes concurrent assignments to the same room (RN25).
        const locked = await manager.query('SELECT id FROM room WHERE id = $1 FOR UPDATE', [
          roomId,
        ]);
        if (!locked.length) throw new NotFoundException('Room not found');
        const [row] = await manager.query(`${ROOM_INFO_SQL} WHERE r.id = $1`, [roomId]);
        room = toRoomInfo(row);
      }

      check(
        {
          id: participation.id,
          excursionId: participation.excursion_id,
          status: participation.status,
          roomId: participation.room_id,
        },
        room,
      );

      await manager.query(
        'UPDATE participation SET room_id = $2, updated_at = now() WHERE id = $1',
        [participationId, roomId],
      );
    });
  }

  private translateRoomError(error: unknown): unknown {
    if (isUniqueViolation(error, 'uq_room_identifier')) {
      return new ConflictException('There is already a room with this identifier in this hotel');
    }
    return error;
  }
}
