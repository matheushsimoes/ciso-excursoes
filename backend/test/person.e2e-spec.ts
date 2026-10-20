import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module.js';
import { resetDatabase } from './reset-database.js';

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
    await resetDatabase(dataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createPerson(overrides: Record<string, unknown> = {}) {
    const response = await request(app.getHttpServer())
      .post('/persons')
      .send({
        fullName: 'João da Silva',
        document: '12345678900',
        birthDate: '1990-05-10',
        ...overrides,
      })
      .expect(201);

    return response.body;
  }

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
        birthDate: '1990-05-10',
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
        birthDate: '1988-07-20',
        phone: '11988888888',
        email: 'carlos@example.com',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 400 when the id is not a UUID', async () => {
      await request(app.getHttpServer()).get('/persons/abc').expect(400);
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
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'carlos@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        {
          id: person2Id,
          fullName: 'Joao da Silva',
          document: '22222222222',
          birthDate: '1988-07-20',
          phone: '11988888888',
          email: 'joao@example.com',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        {
          id: person1Id,
          fullName: 'Mauricio da Silva',
          document: '11111111111',
          birthDate: '1988-07-20',
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

  describe('PATCH /persons/:id', () => {
    it('should update the given fields and keep the others', async () => {
      const person = await createPerson({ phone: '11999999999' });

      const response = await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ fullName: 'João Atualizado' })
        .expect(200);

      expect(response.body).toMatchObject({
        id: person.id,
        fullName: 'João Atualizado',
        document: person.document,
        birthDate: '1990-05-10',
        phone: '11999999999',
      });

      const persisted = await request(app.getHttpServer())
        .get(`/persons/${person.id}`)
        .expect(200);

      expect(persisted.body.fullName).toBe('João Atualizado');
    });

    it('should return birthDate as YYYY-MM-DD after updating it', async () => {
      const person = await createPerson();

      const response = await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ birthDate: '1991-01-01' })
        .expect(200);

      expect(response.body.birthDate).toBe('1991-01-01');

      const persisted = await request(app.getHttpServer())
        .get(`/persons/${person.id}`)
        .expect(200);

      expect(persisted.body.birthDate).toBe('1991-01-01');
    });

    it('should return 404 when the person does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/persons/00000000-0000-0000-0000-000000000000')
        .send({ fullName: 'Ninguém' })
        .expect(404);
    });

    it('should return 409 when the document belongs to another person', async () => {
      await createPerson({ document: '11111111111' });
      const person = await createPerson({ document: '22222222222' });

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ document: '11111111111' })
        .expect(409);
    });
  });

  describe('payload validation', () => {
    const validPayload = {
      fullName: 'João da Silva',
      document: '12345678900',
      birthDate: '1990-05-10',
    };

    it('should return 400 when a required field is missing', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({
          document: validPayload.document,
          birthDate: validPayload.birthDate,
        })
        .expect(400);
    });

    it('should return 400 when the email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPayload, email: 'invalid-email' })
        .expect(400);
    });

    it('should return 400 when birthDate is not in YYYY-MM-DD format', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPayload, birthDate: '10/05/1990' })
        .expect(400);
    });

    it('should return 400 when birthDate is not a real date', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPayload, birthDate: '1990-02-31' })
        .expect(400);
    });

    it('should return 400 when a field exceeds the column length', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPayload, document: '1'.repeat(21) })
        .expect(400);
    });

    it('should return 400 when an unknown field is sent', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({ ...validPayload, id: '00000000-0000-0000-0000-000000000000' })
        .expect(400);
    });

    it('should return 400 when trying to update a read-only field', async () => {
      const person = await createPerson();

      await request(app.getHttpServer())
        .patch(`/persons/${person.id}`)
        .send({ createdAt: '2000-01-01T00:00:00.000Z' })
        .expect(400);
    });
  });
});
