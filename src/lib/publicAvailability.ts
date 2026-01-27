import { collection, getDocs, query, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { CABIN_TYPES, getMaxCapacity, getCabinDisplayName, getCabinColor, getCabinInfo, type CabinInfo } from './cabinConfig';
import { logger } from './logger';

// Re-export CabinInfo for backward compatibility
export type { CabinInfo };

export interface DayAvailability {
  date: string;
  cabins: {
    [cabinType: string]: {
      available: boolean;
      reservationId?: string;
    };
  };
}

export interface PublicAvailabilityResponse {
  cabins: CabinInfo[];
  availability: DayAvailability[];
  lastUpdated: string;
}

// Re-export getCabinInfo from cabinConfig
export { getCabinInfo };

// Get reservations for a date range (for public availability check)
const getReservationsInRange = async (startDate: string, endDate: string) => {
  try {
    const reservasRef = collection(db, 'reservas');
    const reservasSnapshot = await getDocs(reservasRef);
    
    const allReservations: any[] = [];
    
    reservasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.checkIn && data.checkOut) {
        allReservations.push({
          id: doc.id,
          cabinType: data.cabinType,
          checkIn: data.checkIn,
          checkOut: data.checkOut
        });
      }
    });
    
    // Filter to only include reservations that overlap with our date range
    return allReservations.filter(res => {
      return res.checkIn < endDate && res.checkOut > startDate;
    });
  } catch (error) {
    logger.error('publicAvailability.getReservationsInRange.error', { error: String(error) });
    return [];
  }
};

// Generate availability for each day in the range
const generateDayAvailability = (
  date: string, 
  reservations: any[]
): DayAvailability => {
  const cabins: DayAvailability['cabins'] = {};
  
  CABIN_TYPES.forEach(cabinType => {
    // Check if any reservation occupies this cabin on this date
    const occupyingReservation = reservations.find(res => 
      res.cabinType === cabinType && 
      res.checkIn <= date && 
      res.checkOut > date
    );
    
    cabins[cabinType] = {
      available: !occupyingReservation,
      reservationId: occupyingReservation?.id
    };
  });
  
  return { date, cabins };
};

// Get all dates between two dates
const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Main function to get public availability
export const getPublicAvailability = async (
  startDate: string, 
  endDate: string
): Promise<PublicAvailabilityResponse> => {
  try {
    logger.info('publicAvailability.get.start', { startDate, endDate });
    
    const reservations = await getReservationsInRange(startDate, endDate);
    const dates = getDateRange(startDate, endDate);
    
    const availability = dates.map(date => 
      generateDayAvailability(date, reservations)
    );
    
    const response: PublicAvailabilityResponse = {
      cabins: getCabinInfo(),
      availability,
      lastUpdated: new Date().toISOString()
    };
    
    logger.info('publicAvailability.get.success', { 
      daysCount: dates.length, 
      reservationsCount: reservations.length 
    });
    
    return response;
  } catch (error) {
    logger.exception('publicAvailability.get.error', error);
    throw error;
  }
};

// Check if a specific cabin is available for a date range
export const checkCabinAvailabilityPublic = async (
  cabinType: string,
  checkIn: string,
  checkOut: string
): Promise<boolean> => {
  try {
    const reservations = await getReservationsInRange(checkIn, checkOut);
    
    const hasConflict = reservations.some(res => 
      res.cabinType === cabinType &&
      res.checkIn < checkOut &&
      res.checkOut > checkIn
    );
    
    return !hasConflict;
  } catch (error) {
    logger.exception('publicAvailability.checkCabin.error', error);
    return false;
  }
};

// Get available cabins for a date range
export const getAvailableCabins = async (
  checkIn: string,
  checkOut: string
): Promise<CabinInfo[]> => {
  try {
    const reservations = await getReservationsInRange(checkIn, checkOut);
    const cabinInfo = getCabinInfo();
    
    return cabinInfo.filter(cabin => {
      const hasConflict = reservations.some(res => 
        res.cabinType === cabin.name &&
        res.checkIn < checkOut &&
        res.checkOut > checkIn
      );
      return !hasConflict;
    });
  } catch (error) {
    logger.exception('publicAvailability.getAvailableCabins.error', error);
    return [];
  }
};

// Real-time subscription to availability changes
export const subscribeToAvailability = (
  startDate: string,
  endDate: string,
  callback: (data: PublicAvailabilityResponse) => void,
  onError?: (error: Error) => void
): (() => void) => {
  logger.info('publicAvailability.subscribe.start', { startDate, endDate });
  
  const reservasRef = collection(db, 'reservas');

  const unsubscribe = onSnapshot(
    query(reservasRef),
    (snapshot) => {
      const reservasData = snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (data.checkIn && data.checkOut && data.cabinType) {
            return {
              id: doc.id,
              cabinType: data.cabinType,
              checkIn: data.checkIn,
              checkOut: data.checkOut
            };
          }
          return null;
        })
        .filter(res => res !== null)
        .filter(res => res!.checkIn < endDate && res!.checkOut > startDate);
      
      const dates = getDateRange(startDate, endDate);
      const availability = dates.map(date => generateDayAvailability(date, reservasData as any[]));
      
      const response: PublicAvailabilityResponse = {
        cabins: getCabinInfo(),
        availability,
        lastUpdated: new Date().toISOString()
      };
      
      logger.info('publicAvailability.subscribe.updated', { 
        reservationsCount: reservasData.length 
      });
      
      callback(response);
    },
    (error) => {
      logger.error('publicAvailability.subscribe.error', { error: String(error) });
      onError?.(error);
    }
  );

  return () => {
    logger.info('publicAvailability.subscribe.cleanup');
    unsubscribe();
  };
};
