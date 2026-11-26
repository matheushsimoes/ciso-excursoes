import { BadRequestException, ConflictException } from '@nestjs/common';
import { assertCanAssignTransport } from './transport-rules.js';
import type { VehicleInfo } from './transport.js';

describe('assertCanAssignTransport', () => {
  const vehicle: VehicleInfo = {
    id: 'vehicle-1',
    identifier: 'Ônibus 1',
    excursionId: 'excursion-1',
    excursionBusId: 'bus-1',
    capacity: 2,
    occupied: 1,
  };
  const participation = { excursionId: 'excursion-1', excursionVehicleId: null };

  it('should allow a seat within the capacity of a vehicle with free places', () => {
    expect(() =>
      assertCanAssignTransport({ participation, vehicle, seatNumber: 2 }),
    ).not.toThrow();
  });

  it('should reject a vehicle from another excursion', () => {
    expect(() =>
      assertCanAssignTransport({
        participation: { ...participation, excursionId: 'excursion-2' },
        vehicle,
        seatNumber: null,
      }),
    ).toThrow(BadRequestException);
  });

  it('should reject a seat number above the vehicle capacity', () => {
    expect(() =>
      assertCanAssignTransport({ participation, vehicle, seatNumber: 3 }),
    ).toThrow(BadRequestException);
  });

  it('should reject a full vehicle (RN19)', () => {
    expect(() =>
      assertCanAssignTransport({
        participation,
        vehicle: { ...vehicle, occupied: 2 },
        seatNumber: null,
      }),
    ).toThrow(ConflictException);
  });

  it('should allow changing seats inside a full vehicle the passenger is already in', () => {
    expect(() =>
      assertCanAssignTransport({
        participation: { ...participation, excursionVehicleId: 'vehicle-1' },
        vehicle: { ...vehicle, occupied: 2 },
        seatNumber: 1,
      }),
    ).not.toThrow();
  });
});
