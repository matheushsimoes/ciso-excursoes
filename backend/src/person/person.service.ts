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
      birthDate: new Date(dto.birthDate),
      phone: dto.phone,
      email: dto.email,
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

  async findAll(): Promise<Person[]> {
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
      birthDate: dto.birthDate ? new Date(dto.birthDate) : person.birthDate,
      phone: dto.phone ?? person.phone,
      email: dto.email ?? person.email,
      updatedAt: new Date(),
    };

    return this.personRepository.update(updatedPerson);
  }
}
