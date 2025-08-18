import { ReservationFormData } from '@/types/reservation';
import { addDays } from './dateUtils';

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