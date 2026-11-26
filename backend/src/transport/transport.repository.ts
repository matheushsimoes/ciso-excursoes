import type {
  BusType,
  ExcursionBus,
  ExcursionVehicle,
  SeatMap,
  TransportOverview,
  VehicleInfo,
} from './domain/transport.js';

export interface ParticipationTransport {
  id: string;
  excursionId: string;
  status: string;
  excursionVehicleId: string | null;
  seatNumber: number | null;
}

export abstract class TransportRepository {
  abstract createBusType(busType: BusType): Promise<BusType>;
  abstract findBusType(id: string): Promise<BusType | null>;
  abstract listBusTypes(): Promise<BusType[]>;
  abstract updateBusType(busType: BusType): Promise<BusType>;
  /** Largest number of passengers / highest seat in any vehicle of this type. */
  abstract busTypeUsage(busTypeId: string): Promise<{ maxOccupied: number; maxSeat: number }>;

  abstract overview(excursionId: string): Promise<TransportOverview>;
  abstract findExcursionBus(id: string): Promise<ExcursionBus | null>;
  abstract findExcursionBusByType(
    excursionId: string,
    busTypeId: string,
  ): Promise<ExcursionBus | null>;
  abstract vehicleIdentifiers(excursionId: string): Promise<string[]>;
  abstract vehiclesOfBus(excursionBusId: string): Promise<VehicleInfo[]>;
  abstract addExcursionBus(bus: ExcursionBus, vehicles: ExcursionVehicle[]): Promise<void>;
  abstract resizeExcursionBus(
    bus: ExcursionBus,
    vehiclesToAdd: ExcursionVehicle[],
    vehicleIdsToRemove: string[],
  ): Promise<void>;
  abstract deleteExcursionBus(id: string): Promise<void>;

  abstract findVehicle(id: string): Promise<VehicleInfo | null>;
  abstract seatMap(vehicleId: string): Promise<SeatMap | null>;

  /**
   * Locks the participation and the target vehicle, runs `check` with the
   * current data and saves the new vehicle/seat in the same transaction.
   */
  abstract assignTransport(
    participationId: string,
    vehicleId: string | null,
    seatNumber: number | null,
    check: (participation: ParticipationTransport, vehicle: VehicleInfo | null) => void,
  ): Promise<void>;
}
