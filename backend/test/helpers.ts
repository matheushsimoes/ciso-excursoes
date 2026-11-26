import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './reset-database.js';

/** Boots the whole application against the test database. */
export async function createTestApp(): Promise<{ app: INestApplication; dataSource: DataSource }> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication();
  await app.init();
  return { app, dataSource: app.get(DataSource) };
}

export { resetDatabase };

let documentSequence = 10000000000;

/** Small factories that create data through the public API. */
export function api(app: INestApplication) {
  const http = () => request(app.getHttpServer());

  return {
    http,

    async person(overrides: Record<string, unknown> = {}) {
      const response = await http()
        .post('/persons')
        .send({
          fullName: 'Pessoa Teste',
          document: String(documentSequence++),
          birthDate: '1990-05-10',
          ...overrides,
        })
        .expect(201);
      return response.body;
    },

    async excursion(overrides: Record<string, unknown> = {}) {
      const response = await http()
        .post('/excursions')
        .send({
          name: 'Rio 2027',
          destination: 'Rio de Janeiro',
          type: 'OVERNIGHT',
          startDate: '2027-02-10',
          endDate: '2027-02-15',
          referencePrice: '1500.00',
          ...overrides,
        })
        .expect(201);
      return response.body;
    },

    async participation(excursionId: string, overrides: Record<string, unknown> = {}) {
      const personId = (overrides.personId as string) ?? (await this.person()).id;
      const response = await http()
        .post(`/excursions/${excursionId}/participations`)
        .send({ ...overrides, personId })
        .expect(201);
      return response.body;
    },

    async status(excursionId: string, status: string, expected = 200) {
      return http().patch(`/excursions/${excursionId}/status`).send({ status }).expect(expected);
    },

    async busType(overrides: Record<string, unknown> = {}) {
      const response = await http()
        .post('/bus-types')
        .send({ name: 'Double-Deck', capacity: 64, ...overrides })
        .expect(201);
      return response.body;
    },

    async hotel(overrides: Record<string, unknown> = {}) {
      const response = await http()
        .post('/hotels')
        .send({ name: 'Hotel Copacabana', ...overrides })
        .expect(201);
      return response.body;
    },

    /** Links a new hotel to the excursion and creates one room in it. */
    async room(excursionId: string, overrides: Record<string, unknown> = {}) {
      const hotel = await this.hotel();
      const linked = await http()
        .post(`/excursions/${excursionId}/hotels`)
        .send({ hotelId: hotel.id })
        .expect(201);
      const excursionHotel = linked.body.hotels.find(
        (entry: { hotel: { id: string } }) => entry.hotel.id === hotel.id,
      );
      const response = await http()
        .post(`/excursion-hotels/${excursionHotel.id}/rooms`)
        .send({ identifier: '101', capacity: 2, cost: '300.00', ...overrides })
        .expect(201);
      return response.body;
    },

    async ticketType(excursionId: string, overrides: Record<string, unknown> = {}) {
      const activity = await http()
        .post(`/excursions/${excursionId}/activities`)
        .send({ name: (overrides.activityName as string) ?? 'Quadra do Salgueiro' })
        .expect(201);
      const { activityName: _activityName, ...ticketOverrides } = overrides;
      const response = await http()
        .post(`/activities/${activity.body.id}/ticket-types`)
        .send({ name: 'Inteira', currentPrice: '100.00', ...ticketOverrides })
        .expect(201);
      return response.body;
    },

    pay(body: Record<string, unknown>, idempotencyKey?: string) {
      const call = http().post('/payments');
      if (idempotencyKey) call.set('Idempotency-Key', idempotencyKey);
      return call.send({ paymentDate: '2026-12-01', method: 'PIX', ...body });
    },
  };
}
