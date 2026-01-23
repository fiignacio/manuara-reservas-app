import { useState, useEffect, useCallback } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CABIN_TYPES, getMaxCapacity, getCabinDisplayName, getCabinColor } from '@/lib/availabilityHelpers';
import { logger } from '@/lib/logger';
import type { CabinInfo, DayAvailability, PublicAvailabilityData } from '@/components/public/types';

interface Reservation {
  id: string;
  cabinType: string;
  checkIn: string;
  checkOut: string;
}

// Get cabin information
const getCabinInfo = (): CabinInfo[] => {
  return CABIN_TYPES.map((cabinType, index) => ({
    id: `cabin-${index + 1}`,
    name: cabinType,
    displayName: getCabinDisplayName(cabinType),
    maxCapacity: getMaxCapacity(cabinType),
    color: getCabinColor(cabinType)
  }));
};

// Generate date range
const getDateRange = (startDate: string, endDate: string): string[] => {
  const dates: string[] = [];
  const current = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Calculate availability for a specific day
const calculateDayAvailability = (date: string, reservations: Reservation[]): DayAvailability => {
  const cabinStatus: Record<string, boolean> = {};
  let availableCabins = 0;
  
  CABIN_TYPES.forEach(cabinType => {
    const isOccupied = reservations.some(res => 
      res.cabinType === cabinType && 
      res.checkIn <= date && 
      res.checkOut > date
    );
    
    cabinStatus[cabinType] = !isOccupied;
    if (!isOccupied) availableCabins++;
  });
  
  return {
    date,
    availableCabins,
    totalCabins: CABIN_TYPES.length,
    cabinStatus
  };
};

export const usePublicAvailability = (startDate: string, endDate: string) => {
  const [data, setData] = useState<PublicAvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const processReservations = useCallback((reservations: Reservation[]) => {
    const dates = getDateRange(startDate, endDate);
    const availability = dates.map(date => calculateDayAvailability(date, reservations));
    
    return {
      cabins: getCabinInfo(),
      availability,
      lastUpdated: new Date().toISOString()
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    logger.info('usePublicAvailability.subscribe', { startDate, endDate });

    // Subscribe to both collections in real-time
    const reservasRef = collection(db, 'reservas');
    const reservationsRef = collection(db, 'reservations');
    
    let reservasData: Reservation[] = [];
    let reservationsData: Reservation[] = [];
    let reservasLoaded = false;
    let reservationsLoaded = false;

    const updateAvailability = () => {
      if (!reservasLoaded || !reservationsLoaded) return;
      
      const allReservations = [...reservasData, ...reservationsData].filter(res => 
        res.checkIn < endDate && res.checkOut > startDate
      );
      
      const processedData = processReservations(allReservations);
      setData(processedData);
      setLoading(false);
      
      logger.info('usePublicAvailability.updated', { 
        reservationsCount: allReservations.length,
        daysCount: processedData.availability.length
      });
    };

    const unsubscribeReservas = onSnapshot(
      query(reservasRef),
      (snapshot) => {
        reservasData = snapshot.docs
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
          .filter((res): res is Reservation => res !== null);
        
        reservasLoaded = true;
        updateAvailability();
      },
      (err) => {
        logger.exception('usePublicAvailability.reservas.error', err);
        setError('Error al cargar disponibilidad');
        setLoading(false);
      }
    );

    const unsubscribeReservations = onSnapshot(
      query(reservationsRef),
      (snapshot) => {
        reservationsData = snapshot.docs
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
          .filter((res): res is Reservation => res !== null);
        
        reservationsLoaded = true;
        updateAvailability();
      },
      (err) => {
        logger.exception('usePublicAvailability.reservations.error', err);
        setError('Error al cargar disponibilidad');
        setLoading(false);
      }
    );

    return () => {
      unsubscribeReservas();
      unsubscribeReservations();
      logger.info('usePublicAvailability.unsubscribe');
    };
  }, [startDate, endDate, processReservations]);

  // Helper to check cabin availability for a date range
  const isCabinAvailable = useCallback((cabinType: string, checkIn: string, checkOut: string): boolean => {
    if (!data) return false;
    
    const relevantDays = data.availability.filter(day => 
      day.date >= checkIn && day.date < checkOut
    );
    
    return relevantDays.every(day => day.cabinStatus[cabinType] === true);
  }, [data]);

  // Get available cabins for a date range
  const getAvailableCabinsForRange = useCallback((checkIn: string, checkOut: string): CabinInfo[] => {
    if (!data) return [];
    
    return data.cabins.filter(cabin => isCabinAvailable(cabin.name, checkIn, checkOut));
  }, [data, isCabinAvailable]);

  return { 
    data, 
    loading, 
    error, 
    cabins: data?.cabins || [],
    availability: data?.availability || [],
    isCabinAvailable,
    getAvailableCabinsForRange
  };
};
