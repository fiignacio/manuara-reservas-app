export interface Reservation {
  id?: string;
  passengerName: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  season: 'Alta' | 'Baja';
  cabinType: 'Cabaña Pequeña (Max 3p)' | 'Cabaña Mediana 1 (Max 4p)' | 'Cabaña Mediana 2 (Max 4p)' | 'Cabaña Grande (Max 6p)';
  arrivalFlight: 'LA841' | 'LA843';
  departureFlight: 'LA842' | 'LA844';
  totalPrice: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReservationFormData extends Omit<Reservation, 'id' | 'totalPrice' | 'createdAt' | 'updatedAt'> {}