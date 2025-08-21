import { Reservation } from '@/types/reservation';
import { checkCabinAvailability } from './availability';

export const CABIN_TYPES = [
  'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande (Max 6p)'
];

export interface CabinAvailability {
  cabinType: string;
  isAvailable: boolean;
  maxCapacity: number;
}

export const checkMultipleCabinAvailability = async (
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<CabinAvailability[]> => {
  const availabilityPromises = CABIN_TYPES.map(async (cabinType) => {
    const isAvailable = await checkCabinAvailability(cabinType, checkIn, checkOut, excludeReservationId);
    const maxCapacity = getMaxCapacity(cabinType);
    
    return {
      cabinType,
      isAvailable,
      maxCapacity
    };
  });

  return Promise.all(availabilityPromises);
};

export const getMaxCapacity = (cabinType: string): number => {
  if (cabinType.includes('Pequeña')) return 3;
  if (cabinType.includes('Mediana')) return 4;
  if (cabinType.includes('Grande')) return 6;
  return 3;
};

export const getCabinDisplayName = (cabinType: string): string => {
  return cabinType.split(' (')[0];
};

export const getCabinColor = (cabinType: string): string => {
  switch (cabinType) {
    case 'Cabaña Pequeña (Max 3p)':
      return 'bg-blue-500';
    case 'Cabaña Mediana 1 (Max 4p)':
      return 'bg-purple-500';
    case 'Cabaña Mediana 2 (Max 4p)':
      return 'bg-amber-500';
    case 'Cabaña Grande (Max 6p)':
      return 'bg-pink-500';
    default:
      return 'bg-emerald-500';
  }
};

// Helper function to check if we have any reservations that would conflict
export const checkLocalAvailability = (
  reservations: Reservation[],
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): boolean => {
  const conflictingReservations = reservations.filter(reservation => {
    // Exclude current reservation if editing
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }

    // Check if same cabin type
    if (reservation.cabinType !== cabinType) {
      return false;
    }

    // Check for date overlap
    return checkIn < reservation.checkOut && checkOut > reservation.checkIn;
  });

  return conflictingReservations.length === 0;
};

export const getLocalMultipleCabinAvailability = (
  reservations: Reservation[],
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): CabinAvailability[] => {
  return CABIN_TYPES.map(cabinType => ({
    cabinType,
    isAvailable: checkLocalAvailability(reservations, cabinType, checkIn, checkOut, excludeReservationId),
    maxCapacity: getMaxCapacity(cabinType)
  }));
};