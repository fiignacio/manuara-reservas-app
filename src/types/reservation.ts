
import { Payment } from './payment';

export type CabinType = 'Cabaña Pequeña (Max 3p)' | 'Cabaña Mediana 1 (Max 4p)' | 'Cabaña Mediana 2 (Max 4p)' | 'Cabaña Grande (Max 6p)';
export type Season = 'Alta' | 'Baja';
export type ArrivalFlight = 'LA841' | 'LA843' | '';
export type DepartureFlight = 'LA842' | 'LA844' | '';
export type PaymentStatus = 'pendiente' | 'pending_deposit' | 'pending_payment' | 'deposit_made' | 'fully_paid' | 'overdue';
export type ReservationStatusType = 'confirmada' | 'pending_checkin' | 'in_stay' | 'checked_out' | 'departed' | 'cancelled';
export type ReservationSource = 'manual' | 'web' | 'booking' | 'airbnb';

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
  season: Season;
  cabinType: CabinType;
  arrivalFlight: ArrivalFlight;
  departureFlight: DepartureFlight;
  totalPrice: number;
  useCustomPrice: boolean;
  customPrice?: number;
  comments?: string;
  payments: Payment[];
  remainingBalance: number;
  // Payment status
  paymentStatus: PaymentStatus;
  // Reservation status
  reservationStatus: ReservationStatusType;
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
  // Enhanced guest information
  guestRuts?: string[];
  guestNames?: string[];
  customerEmail?: string;
  customerPhone?: string;
  transferInfo?: string;
  sernateurCode?: string;
  createdAt?: Date;
  updatedAt?: Date;
  // Source tracking
  reservationSource?: ReservationSource;
  agency?: string;
  depositAmount?: number;
  pendingBalance?: number;
}

export interface ReservationFormData extends Omit<Reservation, 'id' | 'totalPrice' | 'payments' | 'remainingBalance' | 'paymentStatus' | 'reservationStatus' | 'actualCheckIn' | 'actualCheckOut' | 'checkInStatus' | 'checkOutStatus' | 'checkInNotes' | 'checkOutNotes' | 'confirmationSent' | 'confirmationSentDate' | 'confirmationMethod' | 'createdAt' | 'updatedAt'> {
  // Allow overriding these fields in form data
  totalPrice?: number;
  paymentStatus?: PaymentStatus;
  reservationStatus?: ReservationStatusType;
  depositAmount?: number;
  pendingBalance?: number;
}

export interface CheckInOutData {
  reservationId: string;
  actualDateTime: string;
  notes?: string;
  type: 'check_in' | 'check_out';
}
