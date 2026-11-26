export interface Hotel {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExcursionHotel {
  id: string;
  excursionId: string;
  hotelId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Room {
  id: string;
  excursionHotelId: string;
  identifier: string;
  capacity: number;
  /** Internal cost paid to the hotel (RN26), not charged to passengers. */
  cost: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomInfo {
  id: string;
  identifier: string;
  capacity: number;
  excursionId: string;
  occupied: number;
}

export interface AccommodationOverview {
  excursionId: string;
  totalCapacity: number;
  totalOccupied: number;
  /** Planned cost of all rooms (informational, RN26). */
  totalRoomCost: string;
  hotels: Array<{
    id: string; // excursion_hotel id
    hotel: Hotel;
    rooms: Array<{
      id: string;
      identifier: string;
      capacity: number;
      cost: string;
      occupants: Array<{ participationId: string; personName: string }>;
    }>;
  }>;
}
