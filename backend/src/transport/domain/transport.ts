export interface BusType {
  id: string;
  name: string;
  capacity: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExcursionBus {
  id: string;
  excursionId: string;
  busTypeId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExcursionVehicle {
  id: string;
  excursionBusId: string;
  identifier: string;
  createdAt: Date;
  updatedAt: Date;
}

/** A vehicle with the data needed to allocate passengers. */
export interface VehicleInfo {
  id: string;
  identifier: string;
  excursionId: string;
  excursionBusId: string;
  capacity: number;
  occupied: number;
}

export interface TransportOverview {
  excursionId: string;
  totalCapacity: number;
  totalOccupied: number;
  buses: Array<{
    id: string;
    quantity: number;
    busType: BusType;
    vehicles: Array<{ id: string; identifier: string; capacity: number; occupied: number }>;
  }>;
}

export interface SeatMap {
  vehicle: { id: string; identifier: string; capacity: number; excursionId: string };
  seats: Array<{
    number: number;
    participationId: string | null;
    personName: string | null;
  }>;
  /** Passengers assigned to the vehicle but without a seat yet. */
  withoutSeat: Array<{ participationId: string; personName: string }>;
}
