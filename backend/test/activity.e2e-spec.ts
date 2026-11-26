import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Activities and tickets (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  const buy = (participationId: string, ticketTypeId: string, quantity = 1) =>
    a.http().post(`/participations/${participationId}/ticket-purchases`).send({ ticketTypeId, quantity });

  it('should list activities with their ticket types (UC25, UC27)', async () => {
    const excursion = await a.excursion();
    await a.ticketType(excursion.id, { name: 'Pista', currentPrice: '80' });

    const response = await a.http().get(`/excursions/${excursion.id}/activities`).expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        name: 'Quadra do Salgueiro',
        isOptional: true,
        ticketTypes: [expect.objectContaining({ name: 'Pista', currentPrice: '80.00' })],
      }),
    ]);
  });

  it('should freeze the sold price when the current price changes (RN35, UC28)', async () => {
    const excursion = await a.excursion();
    const ticketType = await a.ticketType(excursion.id, { currentPrice: '100.00' });
    const participation = await a.participation(excursion.id);

    const purchase = await buy(participation.id, ticketType.id, 2).expect(201);
    await a.http().patch(`/ticket-types/${ticketType.id}`).send({ currentPrice: '120.00' }).expect(200);

    const purchases = await a.http().get(`/participations/${participation.id}/ticket-purchases`).expect(200);
    expect(purchase.body).toMatchObject({ soldPrice: '100.00', total: '200.00', status: 'REQUESTED' });
    expect(purchases.body[0].soldPrice).toBe('100.00');
  });

  it('should allow only one ticket type per activity per participant (RN32)', async () => {
    const excursion = await a.excursion();
    const full = await a.ticketType(excursion.id, { name: 'Inteira' });
    const activityId = full.activityId;
    const half = await a
      .http()
      .post(`/activities/${activityId}/ticket-types`)
      .send({ name: 'Meia', currentPrice: '50.00' })
      .expect(201);
    const participation = await a.participation(excursion.id);

    await buy(participation.id, full.id).expect(201);
    await buy(participation.id, half.body.id).expect(409);
  });

  it('should reject concurrent duplicate purchases (double click)', async () => {
    const excursion = await a.excursion();
    const ticketType = await a.ticketType(excursion.id);
    const participation = await a.participation(excursion.id);

    const results = await Promise.all([
      buy(participation.id, ticketType.id),
      buy(participation.id, ticketType.id),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
  });

  it('should reject a ticket type of another excursion', async () => {
    const excursion = await a.excursion();
    const other = await a.excursion({ name: 'Outra' });
    const ticketType = await a.ticketType(other.id);
    const participation = await a.participation(excursion.id);

    await buy(participation.id, ticketType.id).expect(409);
  });

  it('should calculate the ticket demand against supplier purchases (UC30, UC31)', async () => {
    const excursion = await a.excursion();
    const ticketType = await a.ticketType(excursion.id, { currentPrice: '100.00' });
    const first = await a.participation(excursion.id);
    const second = await a.participation(excursion.id);
    const purchase = await buy(first.id, ticketType.id, 2).expect(201);
    await buy(second.id, ticketType.id, 1).expect(201);
    await a.http().post(`/ticket-purchases/${purchase.body.id}/confirm`).expect(200);

    const supplier = await a.http().post('/suppliers').send({ name: 'Liesa' }).expect(201);
    await a
      .http()
      .post(`/ticket-types/${ticketType.id}/supplier-purchases`)
      .send({ supplierId: supplier.body.id, quantity: 2, unitCost: '70.00', purchaseDate: '2026-12-10' })
      .expect(201);

    const demand = await a.http().get(`/excursions/${excursion.id}/ticket-demand`).expect(200);

    expect(demand.body).toEqual([
      expect.objectContaining({
        requested: 3,
        confirmed: 2,
        purchasedFromSuppliers: 2,
        toPurchase: 1,
        salesTotal: '300.00',
        supplierCost: '140.00',
      }),
    ]);

    const purchases = await a.http().get(`/excursions/${excursion.id}/supplier-purchases`).expect(200);
    expect(purchases.body[0]).toMatchObject({ supplierName: 'Liesa', total: '140.00' });
  });

  it('should not create two activities with the same name in an excursion', async () => {
    const excursion = await a.excursion();
    await a.http().post(`/excursions/${excursion.id}/activities`).send({ name: 'Passeio' }).expect(201);
    await a.http().post(`/excursions/${excursion.id}/activities`).send({ name: 'Passeio' }).expect(409);
  });
});
