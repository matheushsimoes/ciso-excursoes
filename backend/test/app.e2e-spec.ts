import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';

describe('Person (e2e)', () => {
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
    await dataSource.query(`
    TRUNCATE TABLE
      ticket_purchase,
      ticket_supplier_purchase,
      payment,
      refund,
      expense,
      participation,
      ticket_type,
      activity,
      room,
      excursion_vehicle,
      excursion_hotel,
      excursion_bus,
      supplier,
      hotel,
      bus_type,
      excursion,
      person
    RESTART IDENTITY CASCADE;
  `);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /persons', () => {
    it('should create a person', async () => {
      const response = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'João da Silva',
          document: '12345678900',
          birthDate: '1990-05-10',
          phone: '11999999999',
          email: 'joao@example.com',
        })
        .expect(201);

      expect(response.body).toEqual({
        id: expect.any(String),
        fullName: 'João da Silva',
        document: '12345678900',
        birthDate: expect.any(String),
        phone: '11999999999',
        email: 'joao@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should not create a person with an existing document', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Maria da Silva',
          document: '12345678901',
          birthDate: '1992-08-15',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Outra Pessoa',
          document: '12345678901',
          birthDate: '1995-03-20',
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        message: 'Person with this document already exists',
      });
    });
  });

  describe('GET /persons/:id', () => {
    it('should return a person by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Carlos da Silva',
          document: '98765432100',
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'carlos@example.com',
        })
        .expect(201);

      const personId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/persons/${personId}`)
        .expect(200);

      expect(response.body).toEqual({
        id: personId,
        fullName: 'Carlos da Silva',
        document: '98765432100',
        birthDate: expect.any(String),
        phone: '11988888888',
        email: 'carlos@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 404 when person does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/persons/00000000-0000-0000-0000-000000000000')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        message: 'Person not found',
      });
    });
  });

  describe('GET /persons', () => {
    it('should return all persons', async () => {
      const createPerson1 = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Mauricio da Silva',
          document: '11111111111',
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'mauricio@example.com',
        })
        .expect(201);

      const person1Id = createPerson1.body.id;

      const createPerson2 = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Joao da Silva',
          document: '22222222222',
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'joao@example.com',
        })
        .expect(201);

      const person2Id = createPerson2.body.id;

      const createPerson3 = await request(app.getHttpServer())
        .post('/persons')
        .send({
          fullName: 'Carlos da Silva',
          document: '33333333333',
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'carlos@example.com',
        })
        .expect(201);

      const person3Id = createPerson3.body.id;

      const response = await request(app.getHttpServer())
        .get(`/persons`)
        .expect(200);

      expect(response.body).toEqual([
        {
          id: person3Id,
          fullName: 'Carlos da Silva',
          document: '33333333333',
          birthDate: expect.any(String),
          phone: '11988888888',
          email: 'carlos@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        {
          id: person2Id,
          fullName: 'Joao da Silva',
          document: '22222222222',
          birthDate: expect.any(String),
          phone: '11988888888',
          email: 'joao@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        {
          id: person1Id,
          fullName: 'Mauricio da Silva',
          document: '11111111111',
          birthDate: expect.any(String),
          phone: '11988888888',
          email: 'mauricio@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ]);
    });

    it('should return an empty list when there are no persons', async () => {
      const response = await request(app.getHttpServer())
        .get(`/persons`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });
});
