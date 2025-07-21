import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  where,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { addDays, getTomorrowDate } from './dateUtils';
import { notificationService } from './notificationService';

const COLLECTION_NAME = 'reservas';

export const calculatePrice = (data: ReservationFormData): number => {
  const checkInDate = new Date(data.checkIn);
  const checkOutDate = new Date(data.checkOut);
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (nights <= 0) return 0;
  
  const costPerNightAdults = data.season === 'Alta' ? 30000 : 25000;
  const costPerNightChildren = 15000;
  
  const costPerNight = (data.adults * costPerNightAdults) + (data.children * costPerNightChildren);
  
  return costPerNight * nights;
};

// Validar disponibilidad de cabaña con fechas inclusivas
export const checkCabinAvailability = async (
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): Promise<boolean> => {
  let q = query(
    collection(db, COLLECTION_NAME),
    where('cabinType', '==', cabinType)
  );

  const querySnapshot = await getDocs(q);
  
  const conflictingReservations = querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Reservation))
    .filter(reservation => {
      // Excluir la reserva actual si estamos editando
      if (excludeReservationId && reservation.id === excludeReservationId) {
        return false;
      }

      // Verificar solapamiento de fechas (inclusivo)
      // Las fechas son inclusivas: check-in y check-out ambos cuentan como días ocupados
      const resCheckIn = reservation.checkIn;
      const resCheckOut = reservation.checkOut;

      // Hay conflicto si las fechas se solapan de forma inclusiva:
      // - La nueva reserva empieza antes o igual a cuando termina la existente Y
      // - La nueva reserva termina después o igual a cuando empieza la existente
      return checkIn <= resCheckOut && checkOut >= resCheckIn;
    });

  return conflictingReservations.length === 0;
};

export const createReservation = async (data: ReservationFormData): Promise<string> => {
  console.log('Creating reservation for:', data.passengerName);
  
  // Validar disponibilidad antes de crear
  const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut);
  
  if (!isAvailable) {
    throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Ya existe una reserva que se solapa con este período.`);
  }

  const totalPrice = calculatePrice(data);
  const reservation: Omit<Reservation, 'id'> = {
    ...data,
    totalPrice,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const docRef = await addDoc(collection(db, COLLECTION_NAME), reservation);
  
  // Generar notificaciones automáticas para la nueva reserva
  try {
    const fullReservation: Reservation = {
      ...reservation,
      id: docRef.id
    };
    
    console.log('Generating notifications for new reservation:', docRef.id);
    await notificationService.generateReservationNotifications(fullReservation);
  } catch (error) {
    console.error('Error generating notifications for reservation:', error);
    // No fallar la creación de la reserva si hay error en notificaciones
  }
  
  return docRef.id;
};

export const updateReservation = async (id: string, data: ReservationFormData): Promise<void> => {
  console.log('Updating reservation:', id);
  
  // Validar disponibilidad antes de actualizar (excluyendo la reserva actual)
  const isAvailable = await checkCabinAvailability(data.cabinType, data.checkIn, data.checkOut, id);
  
  if (!isAvailable) {
    throw new Error(`La ${data.cabinType} no está disponible para las fechas seleccionadas (${new Date(data.checkIn).toLocaleDateString('es-ES')} - ${new Date(data.checkOut).toLocaleDateString('es-ES')}). Ya existe una reserva que se solapa con este período.`);
  }

  const totalPrice = calculatePrice(data);
  const reservation: Partial<Reservation> = {
    ...data,
    totalPrice,
    updatedAt: new Date()
  };
  
  await updateDoc(doc(db, COLLECTION_NAME, id), reservation);
  
  // Regenerar notificaciones para la reserva actualizada
  try {
    const fullReservation: Reservation = {
      ...reservation,
      id,
      createdAt: new Date(), // Este valor se sobreescribirá con el real
      updatedAt: new Date()
    } as Reservation;
    
    console.log('Regenerating notifications for updated reservation:', id);
    await notificationService.generateReservationNotifications(fullReservation);
  } catch (error) {
    console.error('Error regenerating notifications for reservation:', error);
    // No fallar la actualización de la reserva si hay error en notificaciones
  }
};

export const deleteReservation = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION_NAME, id));
};

export const getAllReservations = async (): Promise<Reservation[]> => {
  const q = query(collection(db, COLLECTION_NAME), orderBy('checkIn', 'asc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getReservationsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '<=', date),
    where('checkOut', '>', date)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getTodayArrivals = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', today)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getTodayDepartures = async (): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', today)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getUpcomingArrivals = async (days: number = 5): Promise<Reservation[]> => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = addDays(today, days);
  
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '>', today),
    where('checkIn', '<=', futureDate),
    orderBy('checkIn', 'asc')
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getTomorrowDepartures = async (): Promise<Reservation[]> => {
  const tomorrow = getTomorrowDate();
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkOut', '==', tomorrow)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};

export const getArrivalsForDate = async (date: string): Promise<Reservation[]> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('checkIn', '==', date)
  );
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Reservation));
};
