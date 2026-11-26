import { randomUUID } from 'crypto';

import { Person } from './domain/person.js';
import { CreatePersonDto } from './dto/create-person.dto.js';
import { UpdatePersonDto } from './dto/update-person.dto.js';
import { PersonRepository } from './person.repository.js';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

@Injectable()
export class PersonService {
  constructor(private readonly personRepository: PersonRepository) {}

  async create(dto: CreatePersonDto): Promise<Person> {
    const existingPerson = await this.personRepository.findByDocument(
      dto.document,
    );

    if (existingPerson) {
      throw new ConflictException('Person with this document already exists');
    }

    const now = new Date();

    const person: Person = {
      id: randomUUID(),
      fullName: dto.fullName,
      document: dto.document,
      birthDate: dto.birthDate,
      phone: dto.phone,
      email: dto.email,
      nickname: optional(dto.nickname),
      rg: optional(dto.rg),
      rgIssuer: optional(dto.rgIssuer),
      address: optional(dto.address),
      neighborhood: optional(dto.neighborhood),
      city: optional(dto.city),
      state: optional(dto.state)?.toUpperCase(),
      postalCode: optional(dto.postalCode),
      createdAt: now,
      updatedAt: now,
    };

    return this.personRepository.create(person);
  }

  async findById(id: string): Promise<Person> {
    const person = await this.personRepository.findById(id);

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async findAll(search?: string): Promise<Person[]> {
    const term = search?.trim();
    if (term) {
      return this.personRepository.search(term);
    }
    return this.personRepository.findAll();
  }

  async update(id: string, dto: UpdatePersonDto): Promise<Person> {
    const person = await this.findById(id);

    if (dto.document && dto.document !== person.document) {
      const existing = await this.personRepository.findByDocument(dto.document);

      if (existing) {
        throw new ConflictException('Person with this document already exists');
      }
    }

    const updatedPerson: Person = {
      ...person,
      fullName: dto.fullName ?? person.fullName,
      document: dto.document ?? person.document,
      birthDate: dto.birthDate ?? person.birthDate,
      phone: dto.phone ?? person.phone,
      email: dto.email ?? person.email,
      nickname: dto.nickname === undefined ? person.nickname : optional(dto.nickname),
      rg: dto.rg === undefined ? person.rg : optional(dto.rg),
      rgIssuer: dto.rgIssuer === undefined ? person.rgIssuer : optional(dto.rgIssuer),
      address: dto.address === undefined ? person.address : optional(dto.address),
      neighborhood: dto.neighborhood === undefined ? person.neighborhood : optional(dto.neighborhood),
      city: dto.city === undefined ? person.city : optional(dto.city),
      state: dto.state === undefined ? person.state : optional(dto.state)?.toUpperCase(),
      postalCode: dto.postalCode === undefined ? person.postalCode : optional(dto.postalCode),
      updatedAt: new Date(),
    };

    return this.personRepository.update(updatedPerson);
  }
}

/** Optional text fields: trimmed, and an empty string means "no value". */
function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
