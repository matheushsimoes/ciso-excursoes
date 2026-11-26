export interface Activity {
  id: string;
  excursionId: string;
  name: string;
  description: string | null;
  isOptional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketType {
  id: string;
  activityId: string;
  name: string;
  description: string | null;
  /** Price for new sales. Past sales keep their soldPrice (RN35). */
  currentPrice: string;
  createdAt: Date;
  updatedAt: Date;
}

export const TICKET_PURCHASE_STATUSES = ['REQUESTED', 'CONFIRMED'] as const;
export type TicketPurchaseStatus = (typeof TICKET_PURCHASE_STATUSES)[number];

export interface TicketPurchase {
  id: string;
  participationId: string;
  ticketTypeId: string;
  quantity: number;
  /** Unit price frozen at the moment of the sale (RN35). */
  soldPrice: string;
  status: TicketPurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketSupplierPurchase {
  id: string;
  supplierId: string;
  ticketTypeId: string;
  quantity: number;
  unitCost: string;
  status: TicketPurchaseStatus;
  purchaseDate: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityWithTickets extends Activity {
  ticketTypes: TicketType[];
}

export interface TicketPurchaseView extends TicketPurchase {
  activityId: string;
  activityName: string;
  ticketTypeName: string;
  total: string;
  netPaid: string;
  balance: string;
}

/** UC30 / UC44 — how many tickets the participants want vs. what was bought. */
export interface TicketDemandLine {
  ticketTypeId: string;
  ticketTypeName: string;
  activityId: string;
  activityName: string;
  currentPrice: string;
  requested: number;
  confirmed: number;
  purchasedFromSuppliers: number;
  toPurchase: number;
  salesTotal: string;
  supplierCost: string;
}

export interface SupplierPurchaseView extends TicketSupplierPurchase {
  supplierName: string;
  ticketTypeName: string;
  activityName: string;
  total: string;
}
