import type {
  AccommodationOverview,
  ExcursionHotel,
  Hotel,
  Room,
  RoomInfo,
} from './domain/accommodation.js';

export interface ParticipationRoom {
  id: string;
  excursionId: string;
  status: string;
  roomId: string | null;
}

export abstract class AccommodationRepository {
  abstract createHotel(hotel: Hotel): Promise<Hotel>;
  abstract findHotel(id: string): Promise<Hotel | null>;
  abstract listHotels(): Promise<Hotel[]>;
  abstract updateHotel(hotel: Hotel): Promise<Hotel>;

  abstract overview(excursionId: string): Promise<AccommodationOverview>;
  abstract findExcursionHotel(id: string): Promise<ExcursionHotel | null>;
  abstract linkHotel(excursionHotel: ExcursionHotel): Promise<void>;
  abstract unlinkHotel(id: string): Promise<void>;

  abstract createRoom(room: Room): Promise<Room>;
  abstract findRoom(id: string): Promise<Room | null>;
  abstract findRoomInfo(id: string): Promise<RoomInfo | null>;
  abstract updateRoom(room: Room): Promise<Room>;
  abstract deleteRoom(id: string): Promise<void>;

  /** Locks participation and room, runs `check`, saves the room in one transaction. */
  abstract assignRoom(
    participationId: string,
    roomId: string | null,
    check: (participation: ParticipationRoom, room: RoomInfo | null) => void,
  ): Promise<void>;
}
