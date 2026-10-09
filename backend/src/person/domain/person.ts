export interface Person {
  id: string;
  fullName: string;
  document: string;
  birthDate: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}
