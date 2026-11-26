import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './reset-database.js';
import request from 'supertest';

describe('Excursion (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();

    dataSource = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createExcursion(overrides: Record<string, unknown> = {}) {
    const response = await request(app.getHttpServer())
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
  }

  const NON_EXISTENT_ID = '00000000-0000-0000-0000-000000000000';

  describe('POST /excursions', () => {
    it('should create an excursion as DRAFT', async () => {
      const excursion = await createExcursion();

      expect(excursion).toEqual({
        id: expect.any(String),
        name: 'Rio 2027',
        destination: 'Rio de Janeiro',
        type: 'OVERNIGHT',
        startDate: '2027-02-10',
        endDate: '2027-02-15',
        referencePrice: '1500.00',
        status: 'DRAFT',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return the reference price with two decimal places on POST and GET', async () => {
      const excursion = await createExcursion({ referencePrice: '1500' });
      expect(excursion.referencePrice).toBe('1500.00');

      const persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);
      expect(persisted.body.referencePrice).toBe('1500.00');
    });

    it.each([
      ['status is sent', { status: 'OPEN' }],
      [
        'endDate is before startDate',
        { startDate: '2027-02-15', endDate: '2027-02-10' },
      ],
      ['type is invalid', { type: 'CRUISE' }],
      ['referencePrice uses a comma', { referencePrice: '15,00' }],
    ])('should return 400 when %s', async (_, overrides) => {
      await request(app.getHttpServer())
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
        .expect(400);
    });
  });

  describe('GET /excursions/:id', () => {
    it('should return the excursion', async () => {
      const excursion = await createExcursion();

      const response = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(response.body).toEqual(excursion);
    });

    it('should return 404 when the excursion does not exist', async () => {
      await request(app.getHttpServer())
        .get(`/excursions/${NON_EXISTENT_ID}`)
        .expect(404);
    });

    it('should return 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer()).get('/excursions/abc').expect(400);
    });
  });

  describe('GET /excursions', () => {
    it('should return excursions ordered by start date', async () => {
      await createExcursion({
        name: 'March',
        startDate: '2027-03-01',
        endDate: '2027-03-02',
      });
      await createExcursion({
        name: 'January',
        startDate: '2027-01-01',
        endDate: '2027-01-02',
      });
      await createExcursion({
        name: 'February',
        startDate: '2027-02-01',
        endDate: '2027-02-02',
      });

      const response = await request(app.getHttpServer())
        .get('/excursions')
        .expect(200);

      expect(response.body.map((e: { name: string }) => e.name)).toEqual([
        'January',
        'February',
        'March',
      ]);
    });
  });

  describe('PATCH /excursions/:id', () => {
    it('should update the given fields and keep the others', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}`)
        .send({ name: 'Rio 2027 - Carnaval' })
        .expect(200);

      const persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body).toMatchObject({
        name: 'Rio 2027 - Carnaval',
        destination: excursion.destination,
        startDate: excursion.startDate,
        referencePrice: excursion.referencePrice,
        status: 'DRAFT',
      });
    });

    it('should return 400 when the new end date is before the stored start date', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}`)
        .send({ endDate: '2027-02-05' })
        .expect(400);
    });

    it('should return 400 when trying to change the status', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}`)
        .send({ status: 'OPEN' })
        .expect(400);
    });

    it('should return 404 when the excursion does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/excursions/${NON_EXISTENT_ID}`)
        .send({ name: 'Nobody' })
        .expect(404);
    });

    it('should not update an excursion with a final status', async () => {
      const excursion = await createExcursion();
      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'CANCELLED' })
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}`)
        .send({ name: 'Rio 2027 - Carnaval' })
        .expect(409);
    });
  });

  describe('PATCH /excursions/:id/status', () => {
    it('should change the status of the excursion from DRAFT to OPEN', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'OPEN' })
        .expect(200);

      let persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('OPEN');

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('CONFIRMED');

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('IN_PROGRESS');

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'FINISHED' })
        .expect(200);

      persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('FINISHED');
    });

    it('should not change the status if the request is invalid', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'FINISHED' })
        .expect(409);

      const persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('DRAFT');
    });

    it('should be idempotent when the requested status is the current one', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'DRAFT' })
        .expect(200);

      const persisted = await request(app.getHttpServer())
        .get(`/excursions/${excursion.id}`)
        .expect(200);

      expect(persisted.body.status).toBe('DRAFT');
      expect(persisted.body.updatedAt).toBe(excursion.updatedAt);
    });

    it('should return 404 when the excursion does not exist', async () => {
      await request(app.getHttpServer())
        .patch(`/excursions/${NON_EXISTENT_ID}/status`)
        .send({ status: 'OPEN' })
        .expect(404);
    });

    it('should return 400 when the status is invalid', async () => {
      const excursion = await createExcursion();

      await request(app.getHttpServer())
        .patch(`/excursions/${excursion.id}/status`)
        .send({ status: 'PAUSED' })
        .expect(400);
    });
  });
});
