
import { Payment } from './payment';

export interface Reservation {
  id?: string;
  passengerName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  season: 'Alta' | 'Baja';
  cabinType: 'Cabaña Pequeña (Max 3p)' | 'Cabaña Mediana 1 (Max 4p)' | 'Cabaña Mediana 2 (Max 4p)' | 'Cabaña Grande (Max 6p)';
  arrivalFlight: 'LA841' | 'LA843';
  departureFlight: 'LA842' | 'LA844';
  totalPrice: number;
  useCustomPrice: boolean;
  customPrice?: number;
  comments?: string;
  payments: Payment[];
  remainingBalance: number;
  paymentStatus: 'pending' | 'partially_paid' | 'fully_paid' | 'overdue';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReservationFormData extends Omit<Reservation, 'id' | 'totalPrice' | 'payments' | 'remainingBalance' | 'paymentStatus' | 'createdAt' | 'updatedAt'> {}
