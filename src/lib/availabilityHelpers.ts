import { Reservation } from '@/types/reservation';
import { checkCabinAvailability } from './availability';
import { 
  CABIN_TYPES, 
  getMaxCapacity, 
  getCabinDisplayName, 
  getCabinColor,
  type CabinType 
} from './cabinConfig';

// Re-export from cabinConfig for backward compatibility
export { 
  CABIN_TYPES, 
  getMaxCapacity, 
  getCabinDisplayName, 
  getCabinColor,
  type CabinType 
};

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
