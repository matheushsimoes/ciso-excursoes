import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, In } from 'typeorm';

import { isUniqueViolation } from '../common/database-errors.js';
import type {
  BusType,
  ExcursionBus,
  ExcursionVehicle,
  SeatMap,
  TransportOverview,
  VehicleInfo,
} from './domain/transport.js';
import { BusTypeEntity } from './entities/bus-type.entity.js';
import { ExcursionBusEntity } from './entities/excursion-bus.entity.js';
import { ExcursionVehicleEntity } from './entities/excursion-vehicle.entity.js';
import {
  ParticipationTransport,
  TransportRepository,
} from './transport.repository.js';

const SEAT_TAKEN = 'uq_participation_active_vehicle_seat';

const VEHICLE_SQL = `
  SELECT v.id, v.identifier, v.excursion_bus_id, eb.excursion_id, bt.capacity,
         (SELECT count(*)::int FROM participation p
           WHERE p.excursion_vehicle_id = v.id AND p.status = 'ACTIVE') AS occupied
    FROM excursion_vehicle v
    JOIN excursion_bus eb ON eb.id = v.excursion_bus_id
    JOIN bus_type bt ON bt.id = eb.bus_type_id
`;

function toVehicleInfo(row: Record<string, any>): VehicleInfo {
  return {
    id: row.id,
    identifier: row.identifier,
    excursionId: row.excursion_id,
    excursionBusId: row.excursion_bus_id,
    capacity: row.capacity,
    occupied: row.occupied,
  };
}

@Injectable()
export class TypeOrmTransportRepository implements TransportRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async createBusType(busType: BusType): Promise<BusType> {
    await this.dataSource.getRepository(BusTypeEntity).insert(busType);
    return busType;
  }

  async findBusType(id: string): Promise<BusType | null> {
    return this.dataSource.getRepository(BusTypeEntity).findOne({ where: { id } });
  }

  async listBusTypes(): Promise<BusType[]> {
    return this.dataSource.getRepository(BusTypeEntity).find({ order: { name: 'ASC' } });
  }

  async updateBusType(busType: BusType): Promise<BusType> {
    const repository = this.dataSource.getRepository(BusTypeEntity);
    await repository.save(repository.create(busType));
    return busType;
  }

  async busTypeUsage(busTypeId: string): Promise<{ maxOccupied: number; maxSeat: number }> {
    const [row] = await this.dataSource.query(
      `SELECT coalesce(max(per_vehicle.occupied), 0)::int AS max_occupied,
              coalesce(max(per_vehicle.max_seat), 0)::int AS max_seat
         FROM (
           SELECT count(p.id) AS occupied, max(p.seat_number) AS max_seat
             FROM excursion_vehicle v
             JOIN excursion_bus eb ON eb.id = v.excursion_bus_id
             LEFT JOIN participation p
               ON p.excursion_vehicle_id = v.id AND p.status = 'ACTIVE'
            WHERE eb.bus_type_id = $1
            GROUP BY v.id
         ) per_vehicle`,
      [busTypeId],
    );
    return { maxOccupied: row.max_occupied, maxSeat: row.max_seat };
  }

  async overview(excursionId: string): Promise<TransportOverview> {
    const buses: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT eb.id, eb.quantity, bt.id AS bus_type_id, bt.name, bt.capacity, bt.description,
              bt.created_at, bt.updated_at
         FROM excursion_bus eb
         JOIN bus_type bt ON bt.id = eb.bus_type_id
        WHERE eb.excursion_id = $1
        ORDER BY eb.created_at ASC`,
      [excursionId],
    );
    const vehicles: Array<Record<string, any>> = await this.dataSource.query(
      `${VEHICLE_SQL} WHERE eb.excursion_id = $1`,
      [excursionId],
    );
    const byNumber = (a: { identifier: string }, b: { identifier: string }) =>
      a.identifier.localeCompare(b.identifier, 'pt-BR', { numeric: true });

    const result = buses.map((bus) => ({
      id: bus.id,
      quantity: bus.quantity,
      busType: {
        id: bus.bus_type_id,
        name: bus.name,
        capacity: bus.capacity,
        description: bus.description,
        createdAt: bus.created_at,
        updatedAt: bus.updated_at,
      },
      vehicles: vehicles
        .filter((vehicle) => vehicle.excursion_bus_id === bus.id)
        .map((vehicle) => ({
          id: vehicle.id,
          identifier: vehicle.identifier,
          capacity: vehicle.capacity,
          occupied: vehicle.occupied,
        }))
        .sort(byNumber),
    }));

    const allVehicles = result.flatMap((bus) => bus.vehicles);
    return {
      excursionId,
      totalCapacity: allVehicles.reduce((total, vehicle) => total + vehicle.capacity, 0),
      totalOccupied: allVehicles.reduce((total, vehicle) => total + vehicle.occupied, 0),
      buses: result,
    };
  }

  async findExcursionBus(id: string): Promise<ExcursionBus | null> {
    return this.dataSource.getRepository(ExcursionBusEntity).findOne({ where: { id } });
  }

  async findExcursionBusByType(excursionId: string, busTypeId: string) {
    return this.dataSource
      .getRepository(ExcursionBusEntity)
      .findOne({ where: { excursionId, busTypeId } });
  }

  async vehicleIdentifiers(excursionId: string): Promise<string[]> {
    const rows = await this.dataSource.query(
      `SELECT v.identifier FROM excursion_vehicle v
         JOIN excursion_bus eb ON eb.id = v.excursion_bus_id
        WHERE eb.excursion_id = $1`,
      [excursionId],
    );
    return rows.map((row: { identifier: string }) => row.identifier);
  }

  async vehiclesOfBus(excursionBusId: string): Promise<VehicleInfo[]> {
    const rows = await this.dataSource.query(`${VEHICLE_SQL} WHERE v.excursion_bus_id = $1`, [
      excursionBusId,
    ]);
    return rows.map(toVehicleInfo);
  }

  async addExcursionBus(bus: ExcursionBus, vehicles: ExcursionVehicle[]): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.insert(ExcursionBusEntity, bus);
      await manager.insert(ExcursionVehicleEntity, vehicles);
    });
  }

  async resizeExcursionBus(
    bus: ExcursionBus,
    vehiclesToAdd: ExcursionVehicle[],
    vehicleIdsToRemove: string[],
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      if (vehicleIdsToRemove.length) {
        await this.assertVehiclesEmpty(manager, vehicleIdsToRemove);
        await manager.delete(ExcursionVehicleEntity, { id: In(vehicleIdsToRemove) });
      }
      if (vehiclesToAdd.length) {
        await manager.insert(ExcursionVehicleEntity, vehiclesToAdd);
      }
      await manager.save(ExcursionBusEntity, manager.create(ExcursionBusEntity, bus));
    });
  }

  async deleteExcursionBus(id: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const vehicles = await manager.find(ExcursionVehicleEntity, {
        where: { excursionBusId: id },
      });
      const ids = vehicles.map((vehicle) => vehicle.id);
      if (ids.length) {
        await this.assertVehiclesEmpty(manager, ids);
        await manager.delete(ExcursionVehicleEntity, { id: In(ids) });
      }
      await manager.delete(ExcursionBusEntity, { id });
    });
  }

  async findVehicle(id: string): Promise<VehicleInfo | null> {
    const rows = await this.dataSource.query(`${VEHICLE_SQL} WHERE v.id = $1`, [id]);
    return rows.length ? toVehicleInfo(rows[0]) : null;
  }

  async seatMap(vehicleId: string): Promise<SeatMap | null> {
    const vehicle = await this.findVehicle(vehicleId);
    if (!vehicle) return null;

    const passengers: Array<Record<string, any>> = await this.dataSource.query(
      `SELECT p.id, p.seat_number, per.full_name
         FROM participation p
         JOIN person per ON per.id = p.person_id
        WHERE p.excursion_vehicle_id = $1 AND p.status = 'ACTIVE'
        ORDER BY per.full_name ASC`,
      [vehicleId],
    );

    const bySeat = new Map(
      passengers
        .filter((passenger) => passenger.seat_number !== null)
        .map((passenger) => [passenger.seat_number as number, passenger]),
    );

    return {
      vehicle: {
        id: vehicle.id,
        identifier: vehicle.identifier,
        capacity: vehicle.capacity,
        excursionId: vehicle.excursionId,
      },
      seats: Array.from({ length: vehicle.capacity }, (_, index) => {
        const passenger = bySeat.get(index + 1);
        return {
          number: index + 1,
          participationId: passenger?.id ?? null,
          personName: passenger?.full_name ?? null,
        };
      }),
      withoutSeat: passengers
        .filter((passenger) => passenger.seat_number === null)
        .map((passenger) => ({ participationId: passenger.id, personName: passenger.full_name })),
    };
  }

  async assignTransport(
    participationId: string,
    vehicleId: string | null,
    seatNumber: number | null,
    check: (participation: ParticipationTransport, vehicle: VehicleInfo | null) => void,
  ): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        const [participation] = await manager.query(
          `SELECT id, excursion_id, status, excursion_vehicle_id, seat_number
             FROM participation WHERE id = $1 FOR UPDATE`,
          [participationId],
        );
        if (!participation) throw new NotFoundException('Participation not found');

        let vehicle: VehicleInfo | null = null;
        if (vehicleId) {
          // Locking the vehicle row serializes concurrent assignments to it, so
          // two operators can't both take the last free place (RN19).
          const locked = await manager.query(
            'SELECT id FROM excursion_vehicle WHERE id = $1 FOR UPDATE',
            [vehicleId],
          );
          if (!locked.length) throw new NotFoundException('Vehicle not found');
          const [row] = await manager.query(`${VEHICLE_SQL} WHERE v.id = $1`, [vehicleId]);
          vehicle = toVehicleInfo(row);
        }

        check(
          {
            id: participation.id,
            excursionId: participation.excursion_id,
            status: participation.status,
            excursionVehicleId: participation.excursion_vehicle_id,
            seatNumber: participation.seat_number,
          },
          vehicle,
        );

        await manager.query(
          `UPDATE participation
              SET excursion_vehicle_id = $2, seat_number = $3, updated_at = now()
            WHERE id = $1`,
          [participationId, vehicleId, seatNumber],
        );
      });
    } catch (error) {
      if (isUniqueViolation(error, SEAT_TAKEN)) {
        throw new ConflictException(`Seat ${seatNumber} is already taken (RN17)`);
      }
      throw error;
    }
  }

  private async assertVehiclesEmpty(manager: EntityManager, vehicleIds: string[]) {
    const [row] = await manager.query(
      `SELECT count(*)::int AS total FROM participation
        WHERE excursion_vehicle_id = ANY($1::uuid[]) AND status = 'ACTIVE'`,
      [vehicleIds],
    );
    if (row.total > 0) {
      throw new ConflictException(
        'These vehicles still have passengers: reallocate them first (RN20)',
      );
    }
  }
}
