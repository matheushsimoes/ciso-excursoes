import { Person } from './domain/person.js';

export abstract class PersonRepository {
  abstract create(person: Person): Promise<Person>;
  abstract findByDocument(document: string): Promise<Person | null>;
  abstract findById(id: string): Promise<Person | null>;
  abstract findAll(): Promise<Person[]>;
  abstract update(person: Person): Promise<Person>;
}
