import { ReservationFormData, Reservation } from '@/types/reservation';
import { calculateNights } from './dateUtils';
import { getPricing } from './adminConfig';

export const calculatePrice = (data: ReservationFormData): number => {
  // If using custom price, return that value
  if (data.useCustomPrice && data.customPrice) {
    return data.customPrice;
  }

  // Otherwise calculate automatically
  const nights = calculateNights(data.checkIn, data.checkOut);
  if (nights <= 0) return 0;

  const pricing = getPricing();
  const adultRate = data.season === 'Alta' ? pricing.adultHighSeason : pricing.adultLowSeason;
  const costPerNight =
    (data.adults * adultRate) +
    (data.children * pricing.childRate) +
    (data.babies * pricing.babyRate);

  return costPerNight * nights;
};

export const calculateRemainingBalance = (reservation: Reservation): number => {
  const payments = reservation.payments || [];
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, reservation.totalPrice - totalPaid);
};
