export interface Quote {
  id?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children8to15: number;
  childrenUnder7: number;
  season: 'Alta' | 'Baja';
  cabinType: 'Cabaña Pequeña (Max 3p)' | 'Cabaña Mediana 1 (Max 4p)' | 'Cabaña Mediana 2 (Max 4p)' | 'Cabaña Grande (Max 6p)';
  arrivalFlight: 'LA841' | 'LA843';
  departureFlight: 'LA842' | 'LA844';
  totalPrice: number;
  validUntil: string;
  notes?: string;
  createdAt?: Date;
}

export interface QuoteFormData extends Omit<Quote, 'id' | 'totalPrice' | 'validUntil' | 'createdAt'> {}