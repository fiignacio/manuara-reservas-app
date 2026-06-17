import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  Timestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from './firebase';
import { Referrer, ReferrerPaymentStatus } from '@/types/referrer';

const COLLECTION = 'referentes';

const normalize = (raw: any): Referrer => ({
  id: raw.id,
  name: raw.name || '',
  phone: raw.phone || '',
  email: raw.email || '',
  notes: raw.notes || '',
  createdAt: raw.createdAt?.toDate ? raw.createdAt.toDate() : raw.createdAt,
  updatedAt: raw.updatedAt?.toDate ? raw.updatedAt.toDate() : raw.updatedAt,
});

export const getAllReferrers = async (): Promise<Referrer[]> => {
  try {
    const q = query(collection(db, COLLECTION), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalize({ ...d.data(), id: d.id }));
  } catch {
    const snap = await getDocs(collection(db, COLLECTION));
    return snap.docs.map((d) => normalize({ ...d.data(), id: d.id }));
  }
};

export const createReferrer = async (data: Omit<Referrer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTION), {
    name: data.name.trim(),
    phone: data.phone || '',
    email: data.email || '',
    notes: data.notes || '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateReferrer = async (id: string, data: Partial<Referrer>): Promise<void> => {
  const { id: _id, createdAt, updatedAt, ...rest } = data;
  await updateDoc(doc(db, COLLECTION, id), {
    ...rest,
    updatedAt: Timestamp.now(),
  });
};

export const deleteReferrer = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTION, id));
};

// Update payment status of a reservation referred by someone
export const setReservationReferrerPayment = async (
  reservationId: string,
  status: ReferrerPaymentStatus
): Promise<void> => {
  await updateDoc(doc(db, 'reservas', reservationId), {
    referrerPaymentStatus: status,
    referrerPaidAt: status === 'paid' ? Timestamp.now() : null,
    updatedAt: Timestamp.now(),
  });
};
