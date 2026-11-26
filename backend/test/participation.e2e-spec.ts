import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Participation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  describe('POST /excursions/:id/participations', () => {
    it('should add a person with the reference price as contracted amount', async () => {
      const excursion = await a.excursion();
      const person = await a.person({ fullName: 'Maria Souza' });

      const participation = await a.participation(excursion.id, { personId: person.id });

      expect(participation).toMatchObject({
        personId: person.id,
        excursionId: excursion.id,
        contractedAmount: '1500.00',
        status: 'ACTIVE',
        seatNumber: null,
        roomId: null,
        person: { fullName: 'Maria Souza' },
        financial: { paid: '0.00', balance: '1500.00', situation: 'PENDING' },
      });
    });

    it('should accept a negotiated contracted amount (RN08)', async () => {
      const excursion = await a.excursion();
      const participation = await a.participation(excursion.id, { contractedAmount: '1400' });

      expect(participation.contractedAmount).toBe('1400.00');
    });

    it('should return 409 when the person is already in the excursion (RN02)', async () => {
      const excursion = await a.excursion();
      const person = await a.person();
      await a.participation(excursion.id, { personId: person.id });

      await a
        .http()
        .post(`/excursions/${excursion.id}/participations`)
        .send({ personId: person.id })
        .expect(409);
    });

    it('should return 404 for an unknown person and 409 for a finished excursion', async () => {
      const excursion = await a.excursion();
      await a
        .http()
        .post(`/excursions/${excursion.id}/participations`)
        .send({ personId: '00000000-0000-0000-0000-000000000000' })
        .expect(404);

      await a.status(excursion.id, 'CANCELLED');
      const person = await a.person();
      await a
        .http()
        .post(`/excursions/${excursion.id}/participations`)
        .send({ personId: person.id })
        .expect(409);
    });
  });

  it('should list participants of an excursion and the history of a person (UC07)', async () => {
    const rio = await a.excursion({ name: 'Rio' });
    const aparecida = await a.excursion({ name: 'Aparecida', type: 'DAY_TRIP', startDate: '2027-05-01', endDate: '2027-05-01' });
    const person = await a.person();
    await a.participation(rio.id, { personId: person.id });
    await a.participation(aparecida.id, { personId: person.id });
    await a.participation(rio.id);

    const list = await a.http().get(`/excursions/${rio.id}/participations`).expect(200);
    expect(list.body).toHaveLength(2);

    const history = await a.http().get(`/persons/${person.id}/participations`).expect(200);
    expect(history.body.map((p: { excursion: { name: string } }) => p.excursion.name)).toEqual([
      'Aparecida',
      'Rio',
    ]);
  });

  describe('PATCH /participations/:id/contracted-amount', () => {
    it('should change the agreed amount (UC09)', async () => {
      const excursion = await a.excursion();
      const participation = await a.participation(excursion.id);

      const response = await a
        .http()
        .patch(`/participations/${participation.id}/contracted-amount`)
        .send({ contractedAmount: '1200.50' })
        .expect(200);

      expect(response.body.contractedAmount).toBe('1200.50');
    });

    it('should not go below what was already paid', async () => {
      const excursion = await a.excursion();
      const participation = await a.participation(excursion.id);
      await a.pay({ participationId: participation.id, amount: '1000.00' }).expect(201);

      await a
        .http()
        .patch(`/participations/${participation.id}/contracted-amount`)
        .send({ contractedAmount: '999.99' })
        .expect(409);
    });
  });

  describe('POST /participations/:id/cancel', () => {
    it('should cancel, keep the history and release seat and room (RN43)', async () => {
      const excursion = await a.excursion();
      const busType = await a.busType({ capacity: 2 });
      const transport = await a
        .http()
        .post(`/excursions/${excursion.id}/buses`)
        .send({ busTypeId: busType.id, quantity: 1 })
        .expect(201);
      const vehicleId = transport.body.buses[0].vehicles[0].id;
      const room = await a.room(excursion.id);
      const participation = await a.participation(excursion.id);
      await a
        .http()
        .patch(`/participations/${participation.id}/transport`)
        .send({ excursionVehicleId: vehicleId, seatNumber: 1 })
        .expect(200);
      await a.http().patch(`/participations/${participation.id}/room`).send({ roomId: room.id }).expect(200);

      const cancelled = await a
        .http()
        .post(`/participations/${participation.id}/cancel`)
        .send({ reason: 'Desistiu' })
        .expect(200);

      expect(cancelled.body).toMatchObject({
        status: 'CANCELLED',
        cancellationReason: 'Desistiu',
        excursionVehicleId: null,
        seatNumber: null,
        roomId: null,
        financial: { situation: 'CANCELLED', balance: '0.00' },
      });
      expect(cancelled.body.cancelledAt).toEqual(expect.any(String));

      const seats = await a.http().get(`/excursion-vehicles/${vehicleId}/seats`).expect(200);
      expect(seats.body.seats[0].participationId).toBeNull();
    });

    it('should be idempotent', async () => {
      const excursion = await a.excursion();
      const participation = await a.participation(excursion.id);
      await a.http().post(`/participations/${participation.id}/cancel`).send({}).expect(200);
      await a.http().post(`/participations/${participation.id}/cancel`).send({}).expect(200);
    });
  });

  describe('POST /participations/:id/replace (UC37)', () => {
    it('should cancel the original and create a participation for the new person', async () => {
      const excursion = await a.excursion();
      const original = await a.participation(excursion.id, { contractedAmount: '1300.00' });
      const newPerson = await a.person({ fullName: 'Substituto' });

      const response = await a
        .http()
        .post(`/participations/${original.id}/replace`)
        .send({ personId: newPerson.id })
        .expect(201);

      expect(response.body).toMatchObject({
        personId: newPerson.id,
        status: 'ACTIVE',
        contractedAmount: '1300.00',
      });
      const old = await a.http().get(`/participations/${original.id}`).expect(200);
      expect(old.body.status).toBe('CANCELLED');
    });

    it('should keep the original active when the new person is already in the excursion', async () => {
      const excursion = await a.excursion();
      const original = await a.participation(excursion.id);
      const other = await a.participation(excursion.id);

      await a
        .http()
        .post(`/participations/${original.id}/replace`)
        .send({ personId: other.personId })
        .expect(409);

      const old = await a.http().get(`/participations/${original.id}`).expect(200);
      expect(old.body.status).toBe('ACTIVE');
    });
  });

  it('should not confirm an overnight excursion with participants without a room (RN22)', async () => {
    const excursion = await a.excursion();
    await a.participation(excursion.id);
    await a.status(excursion.id, 'OPEN');

    await a.status(excursion.id, 'CONFIRMED', 409);
  });
});
