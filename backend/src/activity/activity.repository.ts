import type {
  Activity,
  ActivityWithTickets,
  Supplier,
  SupplierPurchaseView,
  TicketDemandLine,
  TicketPurchase,
  TicketPurchaseView,
  TicketSupplierPurchase,
  TicketType,
} from './domain/activity.js';

export interface TicketTypeInfo extends TicketType {
  excursionId: string;
  activityName: string;
}

export interface PurchaseContext {
  participation: { id: string; excursionId: string; status: string };
  /** Ticket types of the same activity the participation already bought. */
  sameActivityPurchases: number;
}

export abstract class ActivityRepository {
  abstract createActivity(activity: Activity): Promise<Activity>;
  abstract findActivity(id: string): Promise<Activity | null>;
  abstract updateActivity(activity: Activity): Promise<Activity>;
  abstract listActivities(excursionId: string): Promise<ActivityWithTickets[]>;

  abstract createTicketType(ticketType: TicketType): Promise<TicketType>;
  abstract findTicketType(id: string): Promise<TicketTypeInfo | null>;
  abstract updateTicketType(ticketType: TicketType): Promise<TicketType>;

  /** Locks the participation, runs `check`, inserts the purchase (RN32). */
  abstract createTicketPurchase(
    purchase: TicketPurchase,
    activityId: string,
    check: (context: PurchaseContext) => void,
  ): Promise<void>;
  abstract findTicketPurchase(id: string): Promise<TicketPurchase | null>;
  abstract updateTicketPurchase(purchase: TicketPurchase): Promise<void>;
  abstract listTicketPurchases(participationId: string): Promise<TicketPurchaseView[]>;
  abstract findTicketPurchaseView(id: string): Promise<TicketPurchaseView | null>;

  abstract ticketDemand(excursionId: string): Promise<TicketDemandLine[]>;

  abstract createSupplier(supplier: Supplier): Promise<Supplier>;
  abstract findSupplier(id: string): Promise<Supplier | null>;
  abstract listSuppliers(): Promise<Supplier[]>;
  abstract updateSupplier(supplier: Supplier): Promise<Supplier>;

  abstract createSupplierPurchase(purchase: TicketSupplierPurchase): Promise<void>;
  abstract listSupplierPurchases(excursionId: string): Promise<SupplierPurchaseView[]>;
}
