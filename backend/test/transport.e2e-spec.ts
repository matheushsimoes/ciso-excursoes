import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Transport (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  async function excursionWithBus(capacity = 3, quantity = 1) {
    const excursion = await a.excursion();
    const busType = await a.busType({ capacity });
    const response = await a
      .http()
      .post(`/excursions/${excursion.id}/buses`)
      .send({ busTypeId: busType.id, quantity })
      .expect(201);
    return { excursion, busType, transport: response.body };
  }

  const assign = (participationId: string, body: Record<string, unknown>) =>
    a.http().patch(`/participations/${participationId}/transport`).send(body);

  describe('bus types (UC11)', () => {
    it('should create, list and update bus types', async () => {
      const busType = await a.busType({ name: 'Executivo', capacity: 46 });
      await a.http().patch(`/bus-types/${busType.id}`).send({ capacity: 44 }).expect(200);

      const list = await a.http().get('/bus-types').expect(200);
      expect(list.body).toEqual([expect.objectContaining({ name: 'Executivo', capacity: 44 })]);
    });

    it('should reject a capacity of zero', async () => {
      await a.http().post('/bus-types').send({ name: 'X', capacity: 0 }).expect(400);
    });
  });

  describe('excursion buses (UC12, UC13)', () => {
    it('should create one vehicle per unit, numbered across the excursion (RN11, RN12)', async () => {
      const { excursion, transport } = await excursionWithBus(64, 2);
      const executive = await a.busType({ name: 'Executivo', capacity: 46 });

      const response = await a
        .http()
        .post(`/excursions/${excursion.id}/buses`)
        .send({ busTypeId: executive.id, quantity: 1 })
        .expect(201);

      expect(transport.buses[0].vehicles.map((v: { identifier: string }) => v.identifier)).toEqual([
        'Ônibus 1',
        'Ônibus 2',
      ]);
      expect(response.body.buses[1].vehicles[0].identifier).toBe('Ônibus 3');
      expect(response.body.totalCapacity).toBe(64 * 2 + 46);
    });

    it('should not add the same bus type twice (RN11)', async () => {
      const { excursion, busType } = await excursionWithBus();
      await a
        .http()
        .post(`/excursions/${excursion.id}/buses`)
        .send({ busTypeId: busType.id, quantity: 1 })
        .expect(409);
    });

    it('should grow, and shrink only through empty vehicles (RN20)', async () => {
      const { excursion, transport } = await excursionWithBus(3, 1);
      const busId = transport.buses[0].id;

      const grown = await a.http().patch(`/excursion-buses/${busId}`).send({ quantity: 2 }).expect(200);
      const [first, second] = grown.body.buses[0].vehicles;

      const participation = await a.participation(excursion.id);
      await assign(participation.id, { excursionVehicleId: second.id }).expect(200);

      // Vehicle 1 is empty, vehicle 2 has a passenger: shrinking removes vehicle 1.
      const shrunk = await a.http().patch(`/excursion-buses/${busId}`).send({ quantity: 1 }).expect(200);
      expect(shrunk.body.buses[0].vehicles.map((v: { id: string }) => v.id)).toEqual([second.id]);
      expect(first.id).not.toBe(second.id);

      // The remaining vehicle has a passenger: it can't be removed.
      await a.http().delete(`/excursion-buses/${busId}`).expect(409);
    });
  });

  describe('PATCH /participations/:id/transport (UC14 – UC16)', () => {
    it('should assign vehicle and seat and show them on the seat map (UC17)', async () => {
      const { excursion, transport } = await excursionWithBus(3);
      const vehicleId = transport.buses[0].vehicles[0].id;
      const participation = await a.participation(excursion.id);

      const response = await assign(participation.id, {
        excursionVehicleId: vehicleId,
        seatNumber: 2,
      }).expect(200);
      expect(response.body).toMatchObject({ seatNumber: 2, vehicleIdentifier: 'Ônibus 1' });

      const seats = await a.http().get(`/excursion-vehicles/${vehicleId}/seats`).expect(200);
      expect(seats.body.seats).toHaveLength(3);
      expect(seats.body.seats[1]).toMatchObject({ number: 2, participationId: participation.id });
    });

    it('should not allow two active passengers on the same seat (RN17)', async () => {
      const { excursion, transport } = await excursionWithBus(3);
      const vehicleId = transport.buses[0].vehicles[0].id;
      const first = await a.participation(excursion.id);
      const second = await a.participation(excursion.id);

      await assign(first.id, { excursionVehicleId: vehicleId, seatNumber: 1 }).expect(200);
      await assign(second.id, { excursionVehicleId: vehicleId, seatNumber: 1 }).expect(409);
    });

    it('should not exceed the vehicle capacity (RN19)', async () => {
      const { excursion, transport } = await excursionWithBus(1);
      const vehicleId = transport.buses[0].vehicles[0].id;
      const first = await a.participation(excursion.id);
      const second = await a.participation(excursion.id);

      await assign(first.id, { excursionVehicleId: vehicleId }).expect(200);
      await assign(second.id, { excursionVehicleId: vehicleId }).expect(409);
    });

    it('should keep the capacity under concurrent assignments', async () => {
      const { excursion, transport } = await excursionWithBus(1);
      const vehicleId = transport.buses[0].vehicles[0].id;
      const participations = await Promise.all([
        a.participation(excursion.id),
        a.participation(excursion.id),
        a.participation(excursion.id),
      ]);

      const results = await Promise.all(
        participations.map((p) => assign(p.id, { excursionVehicleId: vehicleId })),
      );

      expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);
    });

    it('should reject a seat without vehicle (RN18) and a seat above capacity', async () => {
      const { excursion, transport } = await excursionWithBus(3);
      const vehicleId = transport.buses[0].vehicles[0].id;
      const participation = await a.participation(excursion.id);

      await assign(participation.id, { excursionVehicleId: null, seatNumber: 1 }).expect(400);
      await assign(participation.id, { excursionVehicleId: vehicleId, seatNumber: 4 }).expect(400);
    });

    it('should reject a vehicle of another excursion', async () => {
      const { transport } = await excursionWithBus(3);
      const other = await a.excursion({ name: 'Outra' });
      const participation = await a.participation(other.id);

      await assign(participation.id, {
        excursionVehicleId: transport.buses[0].vehicles[0].id,
      }).expect(400);
    });

    it('should remove the transport with a null vehicle (RN13)', async () => {
      const { excursion, transport } = await excursionWithBus(3);
      const participation = await a.participation(excursion.id);
      await assign(participation.id, {
        excursionVehicleId: transport.buses[0].vehicles[0].id,
        seatNumber: 3,
      }).expect(200);

      const response = await assign(participation.id, { excursionVehicleId: null }).expect(200);

      expect(response.body).toMatchObject({ excursionVehicleId: null, seatNumber: null });
    });
  });

  it('should not reduce a bus type capacity below the passengers already seated', async () => {
    const { excursion, busType, transport } = await excursionWithBus(5);
    const participation = await a.participation(excursion.id);
    await assign(participation.id, {
      excursionVehicleId: transport.buses[0].vehicles[0].id,
      seatNumber: 5,
    }).expect(200);

    await a.http().patch(`/bus-types/${busType.id}`).send({ capacity: 4 }).expect(409);
  });
});
