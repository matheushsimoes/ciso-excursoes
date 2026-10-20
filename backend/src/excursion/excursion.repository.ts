import { Excursion } from './domain/excursion.js';

export abstract class ExcursionRepository {
  abstract create(excursion: Excursion): Promise<Excursion>;
  abstract findById(id: string): Promise<Excursion | null>;
  abstract findAll(): Promise<Excursion[]>;
  abstract update(excursion: Excursion): Promise<Excursion>;
}
