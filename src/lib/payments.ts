import { doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Payment, PaymentFormData } from '@/types/payment';
import { Reservation } from '@/types/reservation';
import { calculateRemainingBalance, updatePaymentStatus, updateReservationStatus } from './pricing';
import { getAllReservations } from './reservations';

const COLLECTION_NAME = 'reservations';

// Clean reservation data to remove undefined fields and set defaults
const cleanReservationData = (data: Partial<Reservation>) => {
  const cleaned: Record<string, any> = {};
  
  // Copy all defined values
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  
  // Ensure critical fields have default values
  if (cleaned.useCustomPrice === undefined) {
    cleaned.useCustomPrice = false;
  }
  
  if (cleaned.babies === undefined) {
    cleaned.babies = 0;
  }
  
  // Only include customPrice if useCustomPrice is true
  if (!cleaned.useCustomPrice) {
    delete cleaned.customPrice;
  } else if (cleaned.customPrice === undefined) {
    cleaned.customPrice = 0;
  }
  
  return cleaned;
};

export const addPayment = async (reservationId: string, paymentData: PaymentFormData): Promise<void> => {
  // Get current reservation
  const reservations = await getAllReservations();
  const reservation = reservations.find(r => r.id === reservationId);
  
  if (!reservation) {
    throw new Error('Reserva no encontrada');
  }
  
  // Validate payment amount
  const currentBalance = calculateRemainingBalance(reservation);
  if (paymentData.amount > currentBalance) {
    throw new Error(`El monto del pago (${paymentData.amount.toLocaleString('es-CL')}) excede el balance pendiente (${currentBalance.toLocaleString('es-CL')})`);
  }
  
  if (paymentData.amount <= 0) {
    throw new Error('El monto del pago debe ser mayor a 0');
  }
  
  // Create new payment
  const newPayment: Payment = {
    ...paymentData,
    id: Date.now().toString(), // Simple ID generation
    createdAt: new Date()
  };
  
  // Update reservation with new payment
  const updatedPayments = [...(reservation.payments || []), newPayment];
  const updatedReservation = {
    ...reservation,
    payments: updatedPayments
  };
  
  const newRemainingBalance = calculateRemainingBalance(updatedReservation);
  const newPaymentStatus = updatePaymentStatus(updatedReservation);
  const newReservationStatus = updateReservationStatus(updatedReservation);
  
  const updateData = cleanReservationData({
    payments: updatedPayments,
    remainingBalance: newRemainingBalance,
    paymentStatus: newPaymentStatus,
    reservationStatus: newReservationStatus,
    updatedAt: new Date()
  });
  
  const docRef = doc(db, COLLECTION_NAME, reservationId);
  await updateDoc(docRef, updateData);
};