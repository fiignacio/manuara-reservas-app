
import { Payment } from './payment';

export interface Reservation {
  id?: string;
  passengerName: string;
  phone: string;
  email?: string;
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
  // Check-in/Check-out tracking
  actualCheckIn?: string;
  actualCheckOut?: string;
  checkInStatus: 'pending' | 'checked_in' | 'no_show';
  checkOutStatus: 'pending' | 'checked_out' | 'late_checkout';
  checkInNotes?: string;
  checkOutNotes?: string;
  // Confirmation tracking
  confirmationSent: boolean;
  confirmationSentDate?: string;
  confirmationMethod?: 'email' | 'whatsapp' | 'manual';
  // Enhanced guest information for PDF generation
  guestRuts?: string[];
  guestNames?: string[];
  customerEmail?: string;
  customerPhone?: string;
  transferInfo?: string;
  sernateurCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReservationFormData extends Omit<Reservation, 'id' | 'totalPrice' | 'payments' | 'remainingBalance' | 'paymentStatus' | 'actualCheckIn' | 'actualCheckOut' | 'checkInStatus' | 'checkOutStatus' | 'checkInNotes' | 'checkOutNotes' | 'confirmationSent' | 'confirmationSentDate' | 'confirmationMethod' | 'createdAt' | 'updatedAt'> {}

export interface CheckInOutData {
  reservationId: string;
  actualDateTime: string;
  notes?: string;
  type: 'check_in' | 'check_out';
}
