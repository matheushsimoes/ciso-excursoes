export const PARTICIPATION_STATUSES = ['ACTIVE', 'CANCELLED'] as const;
export type ParticipationStatus = (typeof PARTICIPATION_STATUSES)[number];

export interface Participation {
  id: string;
  personId: string;
  excursionId: string;
  contractedAmount: string; // "1500.00"
  status: ParticipationStatus;
  excursionVehicleId: string | null;
  seatNumber: number | null;
  roomId: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentSituation = 'PAID' | 'PARTIAL' | 'PENDING' | 'CANCELLED';

/**
 * Participation enriched with what the screens need to show: who the person
 * is, where they sit and sleep, and how much is still owed (RN41: the balance
 * is always calculated, never stored).
 */
export interface ParticipationView extends Participation {
  person: {
    id: string;
    fullName: string;
    document: string;
    birthDate: string;
    phone: string | null;
    email: string | null;
  };
  excursion: { id: string; name: string; status: string; type: string };
  vehicleIdentifier: string | null;
  room: { id: string; identifier: string; hotelName: string } | null;
  financial: {
    paid: string;
    refunded: string;
    netPaid: string;
    balance: string;
    situation: PaymentSituation;
  };
}
