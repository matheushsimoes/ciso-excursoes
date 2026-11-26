export interface Person {
  id: string;
  fullName: string;
  document: string;
  birthDate: string;
  phone?: string;
  email?: string;
  nickname?: string;
  rg?: string;
  rgIssuer?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
