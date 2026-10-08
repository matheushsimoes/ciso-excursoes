import { ConflictException, NotFoundException } from '@nestjs/common';
import { jest } from '@jest/globals';

import { PersonService } from './person.service.js';
import { PersonRepository } from './person.repository.js';
import { Person } from './domain/person.js';

describe('PersonService', () => {
  let service: PersonService;
  let repository: jest.Mocked<PersonRepository>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findByDocument: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
    };

    service = new PersonService(repository);
  });

  describe('create', () => {
    const dto = {
      fullName: 'Matheus Hurtado Simões',
      document: '39751417864',
      birthDate: '1991-02-03',
      phone: '13991146924',
      email: 'matheussimoes91@gmail.com',
    };

    beforeEach(() => {
      repository.findByDocument.mockResolvedValue(null);
      repository.create.mockImplementation(async (person) => person);
    });

    it('should create a person', async () => {
      const result = await service.create(dto);

      expect(result).toEqual({
        id: expect.any(String),
        fullName: dto.fullName,
        document: dto.document,
        birthDate: new Date(dto.birthDate),
        phone: dto.phone,
        email: dto.email,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should check if the document already exists', async () => {
      await service.create(dto);

      expect(repository.findByDocument).toHaveBeenCalledTimes(1);
      expect(repository.findByDocument).toHaveBeenCalledWith(dto.document);
    });

    it('should send the created person to the repository', async () => {
      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledTimes(1);
      expect(repository.create).toHaveBeenCalledWith(result);
    });

    it('should create a person without phone and email', async () => {
      const dtoWithoutOptionalFields = {
        fullName: 'João da Silva',
        document: '12345678900',
        birthDate: '1990-05-10',
      };

      const result = await service.create(dtoWithoutOptionalFields);

      expect(result).toEqual({
        id: expect.any(String),
        fullName: dtoWithoutOptionalFields.fullName,
        document: dtoWithoutOptionalFields.document,
        birthDate: new Date(dtoWithoutOptionalFields.birthDate),
        phone: undefined,
        email: undefined,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should not create a person when the document already exists', async () => {
      const existingPerson: Person = {
        id: 'existing-person-id',
        fullName: dto.fullName,
        document: dto.document,
        birthDate: new Date(dto.birthDate),
        phone: dto.phone,
        email: dto.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findByDocument.mockResolvedValue(existingPerson);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);

      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return a person by id', async () => {
      const person: Person = {
        id: 'person-id',
        fullName: 'João da Silva',
        document: '12345678900',
        birthDate: new Date('1990-05-10'),
        phone: '11999999999',
        email: 'joao@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findById.mockResolvedValue(person);

      const result = await service.findById(person.id);

      expect(result).toEqual(person);
      expect(repository.findById).toHaveBeenCalledTimes(1);
      expect(repository.findById).toHaveBeenCalledWith(person.id);
    });

    it('should throw NotFoundException when person does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );

      expect(repository.findById).toHaveBeenCalledWith('non-existent-id');
    });
  });

  describe('findAll', () => {
    it('should return all persons', async () => {
      const persons: Person[] = [
        {
          id: 'person-id',
          fullName: 'João da Silva',
          document: '12345678900',
          birthDate: new Date('1990-05-10'),
          phone: '11999999999',
          email: 'joao@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'person-id-2',
          fullName: 'Maria Oliveira',
          document: '98765432100',
          birthDate: new Date('1985-08-15'),
          phone: '21988888888',
          email: 'maria@example.com',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      repository.findAll.mockResolvedValue(persons);

      const result = await service.findAll();

      expect(result).toEqual(persons);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });

    it('should return an empty array when no persons are found', async () => {
      const persons: Person[] = [];

      repository.findAll.mockResolvedValue(persons);

      const result = await service.findAll();

      expect(result).toEqual(persons);
      expect(repository.findAll).toHaveBeenCalledTimes(1);
      expect(repository.findAll).toHaveBeenCalledWith();
    });
  });
});
