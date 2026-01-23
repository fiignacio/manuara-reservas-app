import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { SolicitudReserva, SolicitudFormData } from '@/types/solicitud';
import { createReservation } from './reservations';
import { logger } from './logger';

const COLLECTION_NAME = 'solicitudes_reserva';

// Normalize solicitud data from Firestore
const normalizeSolicitud = (doc: any): SolicitudReserva => {
  const data = doc.data();
  return {
    id: doc.id,
    cabinType: data.cabinType || '',
    checkIn: data.checkIn || '',
    checkOut: data.checkOut || '',
    guestName: data.guestName || '',
    guestEmail: data.guestEmail || '',
    guestPhone: data.guestPhone || '',
    adults: data.adults || 1,
    children: data.children || 0,
    message: data.message || '',
    status: data.status || 'pendiente',
    rejectionReason: data.rejectionReason,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined
  };
};

// Create a new booking request (used from external website)
export const createSolicitud = async (data: SolicitudFormData): Promise<string> => {
  try {
    logger.info('solicitudes.create.start', { cabinType: data.cabinType, checkIn: data.checkIn });
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      status: 'pendiente',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    logger.info('solicitudes.create.success', { id: docRef.id });
    return docRef.id;
  } catch (error) {
    logger.exception('solicitudes.create.error', error);
    throw error;
  }
};

// Get all solicitudes
export const getAllSolicitudes = async (): Promise<SolicitudReserva[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalizeSolicitud);
  } catch (error) {
    logger.exception('solicitudes.getAll.error', error);
    return [];
  }
};

// Get pending solicitudes
export const getSolicitudesPendientes = async (): Promise<SolicitudReserva[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pendiente'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(normalizeSolicitud);
  } catch (error) {
    logger.exception('solicitudes.getPendientes.error', error);
    return [];
  }
};

// Get pending count for badge
export const getPendingCount = async (): Promise<number> => {
  try {
    const solicitudes = await getSolicitudesPendientes();
    return solicitudes.length;
  } catch (error) {
    logger.exception('solicitudes.getPendingCount.error', error);
    return 0;
  }
};

// Approve solicitud and create reservation
export const aprobarSolicitud = async (solicitud: SolicitudReserva): Promise<void> => {
  try {
    logger.info('solicitudes.aprobar.start', { id: solicitud.id });
    
    // Determine season based on check-in date
    const checkInMonth = new Date(solicitud.checkIn).getMonth() + 1;
    const season = (checkInMonth >= 11 || checkInMonth <= 3) ? 'Alta' : 'Baja';
    
    // Create the reservation from solicitud data
    await createReservation({
      passengerName: solicitud.guestName,
      email: solicitud.guestEmail,
      phone: solicitud.guestPhone,
      cabinType: solicitud.cabinType as any,
      checkIn: solicitud.checkIn,
      checkOut: solicitud.checkOut,
      adults: solicitud.adults,
      children: solicitud.children,
      babies: 0,
      comments: solicitud.message ? `Solicitud web: ${solicitud.message}` : 'Reserva desde solicitud web',
      paymentStatus: 'pendiente',
      reservationStatus: 'confirmada',
      season: season,
      arrivalFlight: '',
      departureFlight: '',
      useCustomPrice: false,
      reservationSource: 'web'
    });
    
    // Update solicitud status
    const docRef = doc(db, COLLECTION_NAME, solicitud.id);
    await updateDoc(docRef, {
      status: 'aprobada',
      updatedAt: serverTimestamp()
    });
    
    logger.info('solicitudes.aprobar.success', { id: solicitud.id });
  } catch (error) {
    logger.exception('solicitudes.aprobar.error', error);
    throw error;
  }
};

// Reject solicitud
export const rechazarSolicitud = async (id: string, reason?: string): Promise<void> => {
  try {
    logger.info('solicitudes.rechazar.start', { id });
    
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      status: 'rechazada',
      rejectionReason: reason || '',
      updatedAt: serverTimestamp()
    });
    
    logger.info('solicitudes.rechazar.success', { id });
  } catch (error) {
    logger.exception('solicitudes.rechazar.error', error);
    throw error;
  }
};

// Delete solicitud
export const deleteSolicitud = async (id: string): Promise<void> => {
  try {
    logger.info('solicitudes.delete.start', { id });
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    logger.info('solicitudes.delete.success', { id });
  } catch (error) {
    logger.exception('solicitudes.delete.error', error);
    throw error;
  }
};
