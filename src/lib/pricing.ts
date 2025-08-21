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
  const totalPaid = reservation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.max(0, reservation.totalPrice - totalPaid);
};

export const updatePaymentStatus = (reservation: Reservation): 'pending_deposit' | 'pending_payment' | 'deposit_made' | 'fully_paid' | 'overdue' => {
  const remainingBalance = calculateRemainingBalance(reservation);
  const totalPaid = reservation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const today = new Date().toISOString().split('T')[0];
  
  // Check if overdue (checkout date has passed and not fully paid)
  if (remainingBalance > 0 && reservation.checkOut < today) {
    return 'overdue';
  }
  
  // Check if fully paid
  if (remainingBalance === 0) {
    return 'fully_paid';
  }
  
  // Check if at least some payment has been made
  if (totalPaid > 0) {
    // Consider it a deposit if less than 50% is paid, otherwise pending payment
    const paymentPercentage = totalPaid / reservation.totalPrice;
    return paymentPercentage >= 0.5 ? 'pending_payment' : 'deposit_made';
  }
  
  // Check if more than 7 days have passed since reservation was created without payment
  const createdAt = reservation.createdAt ? new Date(reservation.createdAt) : new Date();
  const daysSinceCreated = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceCreated > 7) {
    return 'pending_payment';
  }
  
  return 'pending_deposit';
};

export const updateReservationStatus = (reservation: Reservation): 'pending_checkin' | 'in_stay' | 'checked_out' | 'departed' => {
  const today = new Date().toISOString().split('T')[0];
  const checkInDate = reservation.checkIn;
  const checkOutDate = reservation.checkOut;
  
  // If marked as checked out and it's past checkout date + 1 day, mark as departed
  if (reservation.checkOutStatus === 'checked_out' && checkOutDate < today) {
    const daysPastCheckout = Math.floor((new Date(today).getTime() - new Date(checkOutDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysPastCheckout >= 1) {
      return 'departed';
    }
    return 'checked_out';
  }
  
  // If checked in and today is between check-in and check-out dates
  if (reservation.checkInStatus === 'checked_in' && today >= checkInDate && today <= checkOutDate) {
    return 'in_stay';
  }
  
  // If today is past check-out date and not checked out
  if (today > checkOutDate) {
    return 'checked_out';
  }
  
  // Default state
  return 'pending_checkin';
};
