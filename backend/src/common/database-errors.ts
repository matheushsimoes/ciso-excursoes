import { QueryFailedError } from 'typeorm';

const UNIQUE_VIOLATION = '23505';
const FOREIGN_KEY_VIOLATION = '23503';

function driverError(error: unknown): { code?: string; constraint?: string } {
  if (error instanceof QueryFailedError) {
    return (error as QueryFailedError & { driverError: { code?: string; constraint?: string } })
      .driverError ?? {};
  }
  return {};
}

/**
 * True when PostgreSQL rejected a write because of a UNIQUE constraint or
 * unique index. When `constraint` is given, only that constraint matches.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  const { code, constraint: name } = driverError(error);
  return code === UNIQUE_VIOLATION && (!constraint || name === constraint);
}

/** True when PostgreSQL rejected a write because of a FOREIGN KEY constraint. */
export function isForeignKeyViolation(error: unknown): boolean {
  return driverError(error).code === FOREIGN_KEY_VIOLATION;
}
