export interface Person {
  id: string;
  fullName: string;
  document: string;
  birthDate: Date;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}
