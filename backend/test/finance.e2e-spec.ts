import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';

import { api, createTestApp, resetDatabase } from './helpers.js';

describe('Finance (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let a: ReturnType<typeof api>;

  beforeAll(async () => {
    ({ app, dataSource } = await createTestApp());
    a = api(app);
  });
  beforeEach(() => resetDatabase(dataSource));
  afterAll(() => app.close());

  async function participant(contractedAmount = '1000.00') {
    const excursion = await a.excursion();
    const participation = await a.participation(excursion.id, { contractedAmount });
    return { excursion, participation };
  }

  describe('POST /payments (UC32)', () => {
    it('should register installments and calculate the balance (RN37, RN41)', async () => {
      const { participation } = await participant('1000.00');

      await a.pay({ participationId: participation.id, amount: '300.00', method: 'CASH' }).expect(201);
      await a.pay({ participationId: participation.id, amount: '200', method: 'CARD' }).expect(201);

      const view = await a.http().get(`/participations/${participation.id}`).expect(200);
      expect(view.body.financial).toEqual({
        paid: '500.00',
        refunded: '0.00',
        netPaid: '500.00',
        balance: '500.00',
        situation: 'PARTIAL',
      });
    });

    it('should not accept more than the outstanding balance', async () => {
      const { participation } = await participant('1000.00');
      await a.pay({ participationId: participation.id, amount: '1000.01' }).expect(409);
      await a.pay({ participationId: participation.id, amount: '1000.00' }).expect(201);
      await a.pay({ participationId: participation.id, amount: '0.01' }).expect(409);
    });

    it('should require exactly one target (RN39)', async () => {
      const { participation } = await participant();
      await a.pay({ amount: '10.00' }).expect(400);
      await a
        .pay({ participationId: participation.id, ticketPurchaseId: participation.id, amount: '10.00' })
        .expect(400);
    });

    it('should reject zero, negative and badly formatted amounts', async () => {
      const { participation } = await participant();
      await a.pay({ participationId: participation.id, amount: '0.00' }).expect(400);
      await a.pay({ participationId: participation.id, amount: '-10.00' }).expect(400);
      await a.pay({ participationId: participation.id, amount: '10,00' }).expect(400);
      await a.pay({ participationId: participation.id, amount: '10.00', method: 'BOLETO' }).expect(400);
    });

    it('should pay a ticket independently from the package (RN40)', async () => {
      const { excursion, participation } = await participant();
      const ticketType = await a.ticketType(excursion.id, { currentPrice: '80.00' });
      const purchase = await a
        .http()
        .post(`/participations/${participation.id}/ticket-purchases`)
        .send({ ticketTypeId: ticketType.id, quantity: 2 })
        .expect(201);

      await a.pay({ ticketPurchaseId: purchase.body.id, amount: '160.00' }).expect(201);
      await a.pay({ ticketPurchaseId: purchase.body.id, amount: '0.01' }).expect(409);

      const statement = await a.http().get(`/participations/${participation.id}/statement`).expect(200);
      expect(statement.body).toMatchObject({
        package: { contracted: '1000.00', balance: '1000.00' },
        tickets: [{ total: '160.00', netPaid: '160.00', balance: '0.00' }],
        totalBalance: '1000.00',
      });
      expect(statement.body.payments[0]).toMatchObject({
        target: 'TICKET',
        description: 'Quadra do Salgueiro — Inteira',
      });
    });
  });

  describe('idempotency', () => {
    it('should return the same payment when a request is retried with the same key', async () => {
      const { participation } = await participant();
      const key = randomUUID();
      const body = { participationId: participation.id, amount: '100.00' };

      const first = await a.pay(body, key).expect(201);
      const retry = await a.pay(body, key).expect(200);

      expect(retry.headers['idempotent-replayed']).toBe('true');
      expect(retry.body.id).toBe(first.body.id);
      const statement = await a.http().get(`/participations/${participation.id}/statement`).expect(200);
      expect(statement.body.payments).toHaveLength(1);
    });

    it('should register only one payment when identical requests arrive at the same time', async () => {
      const { participation } = await participant();
      const key = randomUUID();
      const body = { participationId: participation.id, amount: '100.00' };

      const results = await Promise.all([a.pay(body, key), a.pay(body, key), a.pay(body, key)]);

      expect(new Set(results.map((r) => r.body.id)).size).toBe(1);
      const statement = await a.http().get(`/participations/${participation.id}/statement`).expect(200);
      expect(statement.body.package.paid).toBe('100.00');
    });

    it('should reject a key reused for a different payment with 422', async () => {
      const { participation } = await participant();
      const key = randomUUID();

      await a.pay({ participationId: participation.id, amount: '100.00' }, key).expect(201);
      await a.pay({ participationId: participation.id, amount: '200.00' }, key).expect(422);
    });
  });

  describe('refunds (UC36)', () => {
    it('should refund partially and never more than the payment (RN44)', async () => {
      const { participation } = await participant();
      const payment = await a.pay({ participationId: participation.id, amount: '500.00' }).expect(201);
      const refund = (amount: string) =>
        a
          .http()
          .post(`/payments/${payment.body.id}/refunds`)
          .send({ amount, refundDate: '2026-12-20', reason: 'Desistência' });

      const partial = await refund('200.00').expect(201);
      expect(partial.body).toMatchObject({ refunded: '200.00', refundable: '300.00' });

      await refund('300.01').expect(409);
      await refund('300.00').expect(201);
    });

    it('should not let concurrent refunds exceed the payment', async () => {
      const { participation } = await participant();
      const payment = await a.pay({ participationId: participation.id, amount: '100.00' }).expect(201);

      const results = await Promise.all(
        [1, 2, 3].map(() =>
          a.http().post(`/payments/${payment.body.id}/refunds`).send({ amount: '60.00', refundDate: '2026-12-20' }),
        ),
      );

      expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409]);
    });

    it('should keep cancellation money: cancel, refund part, keep the rest (RN44)', async () => {
      const { excursion, participation } = await participant('1000.00');
      const payment = await a.pay({ participationId: participation.id, amount: '400.00' }).expect(201);
      await a.http().post(`/participations/${participation.id}/cancel`).send({}).expect(200);
      await a
        .http()
        .post(`/payments/${payment.body.id}/refunds`)
        .send({ amount: '300.00', refundDate: '2026-12-20' })
        .expect(201);

      await a.pay({ participationId: participation.id, amount: '10.00' }).expect(409);

      const summary = await a.http().get(`/excursions/${excursion.id}/financial-summary`).expect(200);
      expect(summary.body.revenue.retainedFromCancellations).toBe('100.00');
      expect(summary.body.cash).toEqual({
        received: '400.00',
        refunded: '300.00',
        netReceived: '100.00',
        receivable: '0.00',
      });
    });
  });

  describe('expenses and financial result (UC38, UC39, UC45)', () => {
    it('should calculate the result from revenue and expenses (RN53)', async () => {
      const excursion = await a.excursion();
      const first = await a.participation(excursion.id, { contractedAmount: '1500.00' });
      await a.participation(excursion.id, { contractedAmount: '1500.00' });
      await a.pay({ participationId: first.id, amount: '1500.00' }).expect(201);

      const expense = await a
        .http()
        .post(`/excursions/${excursion.id}/expenses`)
        .send({ description: 'Fretamento', category: 'TRANSPORT', amount: '1200.00', expenseDate: '2027-02-01' })
        .expect(201);
      await a
        .http()
        .post(`/excursions/${excursion.id}/expenses`)
        .send({ description: 'Seguro', category: 'INSURANCE', amount: '80.00', expenseDate: '2027-02-01' })
        .expect(201);
      await a.http().patch(`/expenses/${expense.body.id}`).send({ amount: '1000.00' }).expect(200);

      const summary = await a.http().get(`/excursions/${excursion.id}/financial-summary`).expect(200);

      expect(summary.body).toMatchObject({
        participants: { active: 2, cancelled: 0 },
        revenue: { packagesContracted: '3000.00', expected: '3000.00' },
        cash: { netReceived: '1500.00', receivable: '1500.00' },
        expenses: {
          total: '1080.00',
          byCategory: [
            { category: 'TRANSPORT', total: '1000.00' },
            { category: 'INSURANCE', total: '80.00' },
          ],
        },
        result: { realized: '420.00', projected: '1920.00' },
      });

      const expenses = await a.http().get(`/excursions/${excursion.id}/expenses`).expect(200);
      expect(expenses.body).toHaveLength(2);
      await a.http().delete(`/expenses/${expense.body.id}`).expect(204);
    });

    it('should reject invalid expense categories', async () => {
      const excursion = await a.excursion();
      await a
        .http()
        .post(`/excursions/${excursion.id}/expenses`)
        .send({ description: 'X', category: 'PARTY', amount: '10.00', expenseDate: '2027-02-01' })
        .expect(400);
    });
  });
});
