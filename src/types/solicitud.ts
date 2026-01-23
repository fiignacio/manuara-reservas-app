export interface SolicitudReserva {
  id: string;
  cabinType: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  message?: string;
  status: 'pendiente' | 'aprobada' | 'rechazada';
  rejectionReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SolicitudFormData {
  cabinType: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  adults: number;
  children: number;
  message?: string;
}
