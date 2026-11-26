import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './helpers.js';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    ({ app } = await createTestApp());
  });
  afterAll(() => app.close());

  it('should report the app and the database as up', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);

    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });
});
