export interface Referrer {
  id?: string;
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type ReferrerPaymentStatus = 'pending' | 'paid';
