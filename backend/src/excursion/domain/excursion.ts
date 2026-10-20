export const EXCURSION_TYPES = ['DAY_TRIP', 'OVERNIGHT'] as const;
export type ExcursionType = (typeof EXCURSION_TYPES)[number];

export const EXCURSION_STATUSES = [
  'DRAFT',
  'OPEN',
  'CONFIRMED',
  'IN_PROGRESS',
  'FINISHED',
  'CANCELLED',
] as const;
export type ExcursionStatus = (typeof EXCURSION_STATUSES)[number];

export interface Excursion {
  id: string;
  name: string;
  destination: string;
  type: ExcursionType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  referencePrice: string; // "1500.00"
  status: ExcursionStatus;
  createdAt: Date;
  updatedAt: Date;
}
