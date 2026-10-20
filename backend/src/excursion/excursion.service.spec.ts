import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { ExcursionService } from './excursion.service.js';
import { ExcursionRepository } from './excursion.repository.js';
import { Excursion } from './domain/excursion.js';

describe('ExcursionService', () => {
  let service: ExcursionService;
  let repository: jest.Mocked<ExcursionRepository>;

  const existingExcursion: Excursion = {
    id: 'excursion-id',
    name: 'Rio 2027',
    destination: 'Rio de Janeiro',
    type: 'OVERNIGHT',
    startDate: '2027-02-10',
    endDate: '2027-02-15',
    referencePrice: '1500.00',
    status: 'DRAFT',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
    };
    repository.create.mockImplementation(async (e) => e);
    repository.update.mockImplementation(async (e) => e);
    repository.findById.mockResolvedValue(existingExcursion);

    service = new ExcursionService(repository);
  });

  describe('create', () => {
    const dto = {
      name: 'Aparecida 2027',
      destination: 'Aparecida',
      type: 'DAY_TRIP' as const,
      startDate: '2027-05-01',
      endDate: '2027-05-01',
      referencePrice: '250.00',
    };

    it('should create the excursion as DRAFT', async () => {
      const result = await service.create(dto);

      expect(result).toEqual({
        ...dto,
        id: expect.any(String),
        status: 'DRAFT',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(repository.create).toHaveBeenCalledWith(result);
    });

    it('should normalize the reference price', async () => {
        const result = await service.create({ ...dto, referencePrice: '250' });

        expect(result.referencePrice).toBe('250.00');
    });

    it('should accept a single-day excursion', async () => {
      await expect(service.create(dto)).resolves.toBeDefined();
    });

    it('should reject an end date before the start date', async () => {
      await expect(
        service.create({
          ...dto,
          startDate: '2027-05-02',
          endDate: '2027-05-01',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should throw NotFoundException when the excursion does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update the given fields and keep the others', async () => {
      const result = await service.update(existingExcursion.id, {
        name: 'Rio 2027 - Carnaval',
      });

      expect(result).toEqual({
        ...existingExcursion,
        name: 'Rio 2027 - Carnaval',
        updatedAt: expect.any(Date),
      });
      expect(result.updatedAt).not.toEqual(existingExcursion.updatedAt);
    });

    it('should validate the period using the merged dates', async () => {
      // A excursão vai de 10 a 15; mandar só endDate = 05 deixa o período invertido.
      await expect(
        service.update(existingExcursion.id, { endDate: '2027-02-05' }),
      ).rejects.toThrow(BadRequestException);

      expect(repository.update).not.toHaveBeenCalled();
    });

    it('should not change the status', async () => {
      const result = await service.update(existingExcursion.id, {
        name: 'Outro nome',
      });

      expect(result.status).toBe('DRAFT');
    });
  });
});
