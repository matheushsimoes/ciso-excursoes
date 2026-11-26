import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Reports (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  it('should list active passengers with age at departure, transport and room (UC40)', async () => {
    const excursion = await a.excursion({ startDate: '2027-02-10', endDate: '2027-02-15' });
    const person = await a.person({ fullName: 'Ana Lima', birthDate: '1990-02-11' });
    const participation = await a.participation(excursion.id, { personId: person.id });
    const cancelled = await a.participation(excursion.id);
    await a.http().post(`/participations/${cancelled.id}/cancel`).send({}).expect(200);
    const room = await a.room(excursion.id);
    await a.http().patch(`/participations/${participation.id}/room`).send({ roomId: room.id }).expect(200);

    const response = await a.http().get(`/excursions/${excursion.id}/reports/passengers`).expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        fullName: 'Ana Lima',
        ageAtDeparture: 36,
        hotel: 'Hotel Copacabana',
        room: '101',
        balance: '1500.00',
      }),
    ]);
  });

  it('should export the passenger list as CSV for the travel insurance', async () => {
    const excursion = await a.excursion({ name: 'Carnaval no Rio' });
    const person = await a.person({ fullName: 'José; da Silva', birthDate: '1985-07-01' });
    await a.participation(excursion.id, { personId: person.id });

    const response = await a
      .http()
      .get(`/excursions/${excursion.id}/reports/passengers?format=csv`)
      .expect(200);

    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('passageiros-carnaval-no-rio.csv');
    const [header, line] = response.text.replace('﻿', '').split('\r\n');
    expect(header.split(';')[0]).toBe('Nome completo');
    expect(line).toContain('"José; da Silva"');
    expect(line).toContain('01/07/1985');
    expect(line).toContain('1500,00');
  });

  it('should summarize every excursion on the dashboard', async () => {
    const open = await a.excursion({ name: 'Aberta' });
    const finished = await a.excursion({ name: 'Antiga', startDate: '2026-01-10', endDate: '2026-01-12' });
    const participation = await a.participation(open.id, { contractedAmount: '1000.00' });
    await a.pay({ participationId: participation.id, amount: '250.00' }).expect(201);
    await a.status(finished.id, 'CANCELLED');

    const response = await a.http().get('/dashboard').expect(200);

    expect(response.body.totals).toEqual({
      persons: 1,
      activeExcursions: 1,
      activeParticipants: 1,
      receivable: '750.00',
      netReceived: '250.00',
    });
    expect(response.body.excursions.map((e: { name: string }) => e.name)).toEqual(['Aberta', 'Antiga']);
  });
});
