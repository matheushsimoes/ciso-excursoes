import type { Participation, ParticipationView } from './domain/participation.js';

export abstract class ParticipationRepository {
  abstract create(participation: Participation): Promise<Participation>;
  abstract findById(id: string): Promise<Participation | null>;
  abstract update(participation: Participation): Promise<Participation>;
  /** Cancels one participation and creates another atomically (UC37). */
  abstract replace(
    cancelled: Participation,
    replacement: Participation,
  ): Promise<Participation>;
  abstract findViewById(id: string): Promise<ParticipationView | null>;
  abstract findViewsByExcursion(excursionId: string): Promise<ParticipationView[]>;
  abstract findViewsByPerson(personId: string): Promise<ParticipationView[]>;
  /** Package payments minus their refunds, in cents. */
  abstract netPaidCents(participationId: string): Promise<number>;
}
