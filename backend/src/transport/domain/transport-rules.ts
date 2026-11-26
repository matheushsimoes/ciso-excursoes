import { BadRequestException, ConflictException } from '@nestjs/common';
import type { VehicleInfo } from './transport.js';

interface AssignmentContext {
  participation: {
    excursionId: string;
    excursionVehicleId: string | null;
  };
  vehicle: VehicleInfo;
  seatNumber: number | null;
}

/**
 * Rules for putting a participant in a vehicle/seat. Runs inside the database
 * transaction, after the vehicle row is locked, so the occupancy it sees cannot
 * change until the assignment is saved.
 */
export function assertCanAssignTransport({
  participation,
  vehicle,
  seatNumber,
}: AssignmentContext): void {
  if (vehicle.excursionId !== participation.excursionId) {
    throw new BadRequestException('The vehicle does not belong to this excursion');
  }

  if (seatNumber !== null && seatNumber > vehicle.capacity) {
    throw new BadRequestException(
      `Seat ${seatNumber} does not exist: ${vehicle.identifier} has ${vehicle.capacity} seats`,
    );
  }

  const movingIn = participation.excursionVehicleId !== vehicle.id;
  if (movingIn && vehicle.occupied >= vehicle.capacity) {
    throw new ConflictException(`${vehicle.identifier} is full (RN19)`);
  }
}
