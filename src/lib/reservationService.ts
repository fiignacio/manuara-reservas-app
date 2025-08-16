import { supabase } from '@/integrations/supabase/client';
import { Reservation, ReservationFormData, CheckInOutData } from '@/types/reservation';
import { Payment, PaymentFormData } from '@/types/payment';
import { addDays, getTomorrowDate } from './dateUtils';

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

// Validate cabin capacity considering babies don't count towards the limit
export const validateCabinCapacity = (cabinType: string, adults: number, children: number, babies: number): { isValid: boolean; error?: string } => {
  const totalGuests = adults + children; // Babies don't count towards capacity limit
  const maxCapacity = cabinType.includes('Pequeña') ? 3 : 
                     cabinType.includes('Mediana') ? 4 : 6;
  
  if (totalGuests > maxCapacity) {
    return {
      isValid: false,
      error: `La ${cabinType} tiene capacidad máxima para ${maxCapacity} personas (adultos + niños), pero has seleccionado ${totalGuests} huéspedes (${adults} adultos + ${children} niños). Los bebés no cuentan para el límite de capacidad.`
    };
  }
  
  return { isValid: true };
};

export const calculatePrice = (data: ReservationFormData): number => {
  // If using custom price, return that value
  if (data.useCustomPrice && data.customPrice) {
    return data.customPrice;
  }

  // Otherwise calculate automatically
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
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

export const updatePaymentStatus = (reservation: Reservation): 'pending' | 'partially_paid' | 'fully_paid' | 'overdue' => {
  const remainingBalance = calculateRemainingBalance(reservation);
  const totalPaid = reservation.payments.reduce((sum, payment) => sum + payment.amount, 0);
  
  if (remainingBalance === 0) {
    return 'fully_paid';
  } else if (totalPaid > 0) {
    return 'partially_paid';
  } else {
    // Check if overdue (checkout date has passed)
    const checkOutDate = new Date(reservation.checkOut);
    const today = new Date();
    if (checkOutDate < today) {
      return 'overdue';
    }
    return 'pending';
  }
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
  const updatedPayments = [...reservation.payments, newPayment];
  const updatedReservation = {
    ...reservation,
    payments: updatedPayments
  };
  
  const newRemainingBalance = calculateRemainingBalance(updatedReservation);
  const newPaymentStatus = updatePaymentStatus(updatedReservation);
  
  const updateData = cleanReservationData({
    payments: updatedPayments,
    remainingBalance: newRemainingBalance,
    paymentStatus: newPaymentStatus,
    updatedAt: new Date()
  });
  
  const { error } = await supabase
    .from(COLLECTION_NAME)
    .update(updateData)
    .eq('id', reservationId);
    
  if (error) throw error;
};

export const checkCabinAvailability = async (
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('cabinType', cabinType);
    
  if (error) throw error;
  
  const conflictingReservations = (data || [])
    .filter(reservation => {
      // Excluir la reserva actual si estamos editando
      if (excludeReservationId && reservation.id === excludeReservationId) {
        return false;
      }

      const resCheckIn = reservation.checkIn;
      const resCheckOut = reservation.checkOut;

      return checkIn < resCheckOut && checkOut > resCheckIn;
    });

  return conflictingReservations.length === 0;
};

export const validateReservationDates = (checkIn: string, checkOut: string): { isValid: boolean; error?: string } => {
  const today = new Date().toISOString().split('T')[0];
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const maxDate = addDays(today, 730); // 2 años en el futuro
  const daysDifference = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

  // Validar que check-in no sea en el pasado
  if (checkIn < today) {
    return {
      isValid: false,
      error: `La fecha de check-in no puede ser anterior a hoy (${new Date(today).toLocaleDateString('es-ES')})`
    };
  }

  // Validar que check-out sea posterior a check-in
  if (checkOut <= checkIn) {
    return {
      isValid: false,
      error: 'La fecha de check-out debe ser al menos un día después del check-in'
    };
  }

  // Validar que no sea muy lejana en el futuro
  if (checkIn > maxDate) {
    return {
      isValid: false,
      error: 'No se pueden hacer reservas con más de 2 años de anticipación'
    };
  }

  // Validar duración máxima de estancia
  if (daysDifference > 30) {
    return {
      isValid: false,
      error: 'La estancia máxima permitida es de 30 días'
    };
  }

  return { isValid: true };
};

export const getNextAvailableDate = async (cabinType: string, preferredCheckIn: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('cabinType', cabinType)
    .gt('checkOut', preferredCheckIn)
    .order('checkOut', { ascending: true });
    
  if (error) throw error;
  
  if (!data || data.length === 0) {
    return preferredCheckIn; // Cabaña disponible desde la fecha preferida
  }

  // Buscar el primer gap disponible
  const reservations = data as Reservation[];
  
  for (const reservation of reservations) {
    if (preferredCheckIn < reservation.checkIn) {
      return preferredCheckIn; // Hay un gap antes de esta reserva
    }
    // La cabaña estará disponible desde el día de check-out de esta reserva
    preferredCheckIn = reservation.checkOut;
  }

  return preferredCheckIn;
};

export const createReservation = async (data: ReservationFormData): Promise<string> => {
  if (!data.checkIn || !data.checkOut) {
    throw new Error('Las fechas de check-in y check-out son obligatorias.');
  }
  
  // Validar fechas antes de verificar disponibilidad
  const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
  if (!dateValidation.isValid) {
    throw new Error(dateValidation.error);
  }
  
  // Validar capacidad de la cabaña
  const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
  if (!capacityValidation.isValid) {
    throw new Error(capacityValidation.error);
  }
  
  // Validar disponibilidad antes de crear
  const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut);
  
  if (!isAvailable) {
    const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
    throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Próxima fecha disponible: ${nextAvailable ? new Date(nextAvailable).toLocaleDateString('es-ES') : 'No disponible'}`);
  }

  const totalPrice = calculatePrice(data);
  const reservation: Omit<Reservation, 'id'> = {
    ...data,
    totalPrice,
    payments: [],
    remainingBalance: totalPrice,
    paymentStatus: 'pending',
    checkInStatus: 'pending',
    checkOutStatus: 'pending',
    confirmationSent: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Clean the data before sending to Supabase
  const cleanedReservation = cleanReservationData(reservation);
  
  const { data: result, error } = await supabase
    .from(COLLECTION_NAME)
    .insert(cleanedReservation)
    .select()
    .single();
    
  if (error) throw error;
  
  return result.id;
};

export const updateReservation = async (id: string, data: ReservationFormData, shouldUpdateDates: boolean = true): Promise<void> => {
  // Validar capacidad de la cabaña siempre
  const capacityValidation = validateCabinCapacity(data.cabinType, data.adults, data.children, data.babies);
  if (!capacityValidation.isValid) {
    throw new Error(capacityValidation.error);
  }
  
  // Solo validar fechas si shouldUpdateDates es true
  if (shouldUpdateDates) {
    if (!data.checkIn || !data.checkOut) {
      throw new Error('Las fechas de check-in y check-out son obligatorias.');
    }
    const dateValidation = validateReservationDates(data.checkIn, data.checkOut);
    if (!dateValidation.isValid) {
      throw new Error(dateValidation.error);
    }
    
    const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut, id);
    
    if (!isAvailable) {
      const nextAvailable = await getNextAvailableDate(data.cabinType, data.checkIn);
      throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Próxima fecha disponible: ${nextAvailable ? new Date(nextAvailable).toLocaleDateString('es-ES') : 'No disponible'}`);
    }
  }

  const totalPrice = calculatePrice(data);
  
  // Get current reservation to preserve payments
  const reservations = await getAllReservations();
  const currentReservation = reservations.find(r => r.id === id);
  const payments = currentReservation?.payments || [];
  
  // Recalculate remaining balance and payment status
  const updatedReservation = {
    ...data,
    totalPrice,
    payments
  } as Reservation;
  
  const remainingBalance = calculateRemainingBalance(updatedReservation);
  const paymentStatus = updatePaymentStatus(updatedReservation);
  
  const reservation: Partial<Reservation> = {
    ...data,
    totalPrice,
    remainingBalance,
    paymentStatus,
    updatedAt: new Date()
  };
  
  // Clean the data before sending to Supabase
  const cleanedReservation = cleanReservationData(reservation);
  
  const { error } = await supabase
    .from(COLLECTION_NAME)
    .update(cleanedReservation)
    .eq('id', id);
    
  if (error) throw error;
};

export const deleteReservation = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from(COLLECTION_NAME)
    .delete()
    .eq('id', id);
    
  if (error) throw error;
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .order('checkIn', { ascending: true });
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .lte('checkIn', date)
    .gt('checkOut', date);
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getTodayArrivals = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkIn', today);
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getTodayDepartures = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkOut', today);
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getUpcomingArrivals = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .gt('checkIn', today)
    .lte('checkIn', futureDate)
    .order('checkIn', { ascending: true });
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getUpcomingDepartures = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .gt('checkOut', today)
    .lte('checkOut', futureDate)
    .order('checkOut', { ascending: true });
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  const tomorrow = getTomorrowDate();
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkOut', tomorrow);
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkIn', date);
    
  if (error) throw error;
  
  return (data || []) as Reservation[];
};

export const deleteExpiredReservations = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .delete()
    .lt('checkOut', today)
    .select('id');
    
  if (error) throw error;
  
  return (data || []).length;
};

// ============= CHECK-IN/CHECK-OUT FUNCTIONS =============

export const performCheckIn = async (data: CheckInOutData): Promise<void> => {
  const { data: reservation, error: fetchError } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('id', data.reservationId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!reservation) throw new Error('Reserva no encontrada');
  
  // Validar que no haya check-in previo
  if (reservation.checkInStatus === 'checked_in') {
    throw new Error('Esta reserva ya tiene check-in registrado');
  }

  const { error } = await supabase
    .from(COLLECTION_NAME)
    .update({
      actualCheckIn: data.actualDateTime,
      checkInStatus: 'checked_in',
      checkInNotes: data.notes || '',
      updatedAt: new Date().toISOString()
    })
    .eq('id', data.reservationId);
    
  if (error) throw error;
};

export const performCheckOut = async (data: CheckInOutData): Promise<void> => {
  const { data: reservation, error: fetchError } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('id', data.reservationId)
    .single();
    
  if (fetchError) throw fetchError;
  if (!reservation) throw new Error('Reserva no encontrada');
  
  // Validar que haya check-in previo
  if (reservation.checkInStatus !== 'checked_in') {
    throw new Error('No se puede hacer check-out sin check-in previo');
  }

  // Validar que no haya check-out previo
  if (reservation.checkOutStatus === 'checked_out') {
    throw new Error('Esta reserva ya tiene check-out registrado');
  }

  const { error } = await supabase
    .from(COLLECTION_NAME)
    .update({
      actualCheckOut: data.actualDateTime,
      checkOutStatus: 'checked_out',
      checkOutNotes: data.notes || '',
      updatedAt: new Date().toISOString()
    })
    .eq('id', data.reservationId);
    
  if (error) throw error;
};

export const getCurrentlyStaying = async (): Promise<Reservation[]> => {
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkInStatus', 'checked_in')
    .eq('checkOutStatus', 'pending')
    .order('passengerName', { ascending: true });
    
  if (error) return [];
  
  return (data || []) as Reservation[];
};

export const getPendingCheckIns = async (date?: string): Promise<Reservation[]> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkIn', targetDate)
    .eq('checkInStatus', 'pending')
    .order('passengerName', { ascending: true });
    
  if (error) return [];
  
  return (data || []) as Reservation[];
};

export const getPendingCheckOuts = async (date?: string): Promise<Reservation[]> => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkOut', targetDate)
    .eq('checkOutStatus', 'pending')
    .eq('checkInStatus', 'checked_in')
    .order('passengerName', { ascending: true });
    
  if (error) return [];
  
  return (data || []) as Reservation[];
};

export const getNoShows = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from(COLLECTION_NAME)
    .select('*')
    .eq('checkInStatus', 'pending')
    .lt('checkIn', today)
    .order('checkIn', { ascending: true });
    
  if (error) return [];
  
  return (data || []) as Reservation[];
};

// Confirmation management
export const markConfirmationSent = async (
  reservationId: string,
  method: 'email' | 'whatsapp' | 'manual',
  notes?: string
): Promise<void> => {
  const { error } = await supabase
    .from(COLLECTION_NAME)
    .update({
      confirmationSent: true,
      confirmationSentDate: new Date().toISOString(),
      confirmationMethod: method,
      updatedAt: new Date().toISOString()
    })
    .eq('id', reservationId);
    
  if (error) throw new Error('Error al marcar confirmación como enviada');
};
