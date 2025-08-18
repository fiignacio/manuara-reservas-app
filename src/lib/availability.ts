import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'reservations';

export const checkCabinAvailability = async (
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<boolean> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('cabinType', '==', cabinType)
  );
  
  const querySnapshot = await getDocs(q);
  
  const conflictingReservations = querySnapshot.docs
    .filter(doc => {
      // Excluir la reserva actual si estamos editando
      if (excludeReservationId && doc.id === excludeReservationId) {
        return false;
      }

      const reservation = doc.data();
      const resCheckIn = reservation.checkIn;
      const resCheckOut = reservation.checkOut;

      return checkIn < resCheckOut && checkOut > resCheckIn;
    });

  return conflictingReservations.length === 0;
};

export const getNextAvailableDate = async (cabinType: string, preferredCheckIn: string): Promise<string | null> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('cabinType', '==', cabinType),
    where('checkOut', '>', preferredCheckIn),
    orderBy('checkOut', 'asc')
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return preferredCheckIn; // Cabaña disponible desde la fecha preferida
  }

  // Buscar el primer gap disponible
  const reservations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  for (const reservation of reservations) {
    const reservationData = reservation as any;
    if (preferredCheckIn < reservationData.checkIn) {
      return preferredCheckIn; // Hay un gap antes de esta reserva
    }
    // La cabaña estará disponible desde el día de check-out de esta reserva
    preferredCheckIn = reservationData.checkOut;
  }

  return preferredCheckIn;
};