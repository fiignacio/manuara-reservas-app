import { ReservationFormData, Reservation } from '@/types/reservation';
import { calculateNights } from './dateUtils';

export const calculatePrice = (data: ReservationFormData): number => {
  // If using custom price, return that value
  if (data.useCustomPrice && data.customPrice) {
    return data.customPrice;
  }

  // Otherwise calculate automatically
  const nights = calculateNights(data.checkIn, data.checkOut);
  
  if (nights <= 0) return 0;
  
  const costPerNightAdults = data.season === 'Alta' ? 30000 : 25000;
  const costPerNightChildren = 15000;
  // Babies don't pay
  
  const costPerNight = (data.adults * costPerNightAdults) + (data.children * costPerNightChildren);
  
  return costPerNight * nights;
};

export const calculateRemainingBalance = (reservation: Reservation): number => {
  const payments = reservation.payments || [];
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, reservation.totalPrice - totalPaid);
};
