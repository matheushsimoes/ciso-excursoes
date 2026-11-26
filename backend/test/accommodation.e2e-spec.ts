import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Accommodation (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  const assign = (participationId: string, roomId: string | null) =>
    a.http().patch(`/participations/${participationId}/room`).send({ roomId });

  it('should manage hotels, link them to the excursion and create rooms (UC18 – UC21)', async () => {
    const excursion = await a.excursion();
    const room = await a.room(excursion.id, { identifier: '201', capacity: 3, cost: '450' });

    const overview = await a.http().get(`/excursions/${excursion.id}/accommodation`).expect(200);

    expect(overview.body).toMatchObject({
      totalCapacity: 3,
      totalOccupied: 0,
      totalRoomCost: '450.00',
      hotels: [{ hotel: { name: 'Hotel Copacabana' }, rooms: [{ id: room.id, identifier: '201' }] }],
    });
  });

  it('should not link hotels to a day trip (RN22)', async () => {
    const excursion = await a.excursion({ type: 'DAY_TRIP', startDate: '2027-05-01', endDate: '2027-05-01' });
    const hotel = await a.hotel();

    await a.http().post(`/excursions/${excursion.id}/hotels`).send({ hotelId: hotel.id }).expect(409);
  });

  it('should assign participants to rooms up to the capacity (UC22, RN25)', async () => {
    const excursion = await a.excursion();
    const room = await a.room(excursion.id, { capacity: 1 });
    const first = await a.participation(excursion.id);
    const second = await a.participation(excursion.id);

    const response = await assign(first.id, room.id).expect(200);
    expect(response.body.room).toMatchObject({ identifier: '101', hotelName: 'Hotel Copacabana' });

    await assign(second.id, room.id).expect(409);
  });

  it('should move a participant between rooms (UC23, RN23)', async () => {
    const excursion = await a.excursion();
    const roomA = await a.room(excursion.id, { identifier: 'A' });
    const roomB = await a.room(excursion.id, { identifier: 'B' });
    const participation = await a.participation(excursion.id);

    await assign(participation.id, roomA.id).expect(200);
    const moved = await assign(participation.id, roomB.id).expect(200);

    expect(moved.body.roomId).toBe(roomB.id);
  });

  it('should confirm the excursion once every participant has a room (RN22)', async () => {
    const excursion = await a.excursion();
    const room = await a.room(excursion.id);
    const participation = await a.participation(excursion.id);
    await a.status(excursion.id, 'OPEN');
    await a.status(excursion.id, 'CONFIRMED', 409);

    await assign(participation.id, room.id).expect(200);

    await a.status(excursion.id, 'CONFIRMED', 200);
  });

  it('should protect rooms with occupants', async () => {
    const excursion = await a.excursion();
    const room = await a.room(excursion.id, { capacity: 2 });
    const first = await a.participation(excursion.id);
    const second = await a.participation(excursion.id);
    await assign(first.id, room.id).expect(200);
    await assign(second.id, room.id).expect(200);

    await a.http().patch(`/rooms/${room.id}`).send({ capacity: 1 }).expect(409);
    await a.http().delete(`/rooms/${room.id}`).expect(409);

    await assign(first.id, null).expect(200);
    await assign(second.id, null).expect(200);
    await a.http().delete(`/rooms/${room.id}`).expect(204);
  });

  it('should not turn an excursion with hotels into a day trip', async () => {
    const excursion = await a.excursion();
    await a.room(excursion.id);

    await a.http().patch(`/excursions/${excursion.id}`).send({ type: 'DAY_TRIP' }).expect(409);
  });
});
