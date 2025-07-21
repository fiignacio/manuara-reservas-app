
export interface Payment {
  id: string;
  amount: number;
  paymentDate: string; // ISO date string
  method: 'cash' | 'transfer' | 'credit_card' | 'other';
  notes?: string;
  createdBy: string;
  createdAt: Date;
}

export interface PaymentFormData extends Omit<Payment, 'id' | 'createdAt'> {}
