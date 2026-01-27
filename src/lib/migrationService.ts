import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

// Cabin type mapping for legacy data
const CABIN_TYPE_MAPPING: Record<string, string> = {
  'Cabaña Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande': 'Cabaña Grande (Max 6p)',
  'Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Grande': 'Cabaña Grande (Max 6p)'
};

const normalizeCabinType = (cabinType: string): string => {
  if (!cabinType) return '';
  return CABIN_TYPE_MAPPING[cabinType] || cabinType;
};

export interface MigrationResult {
  success: boolean;
  migrated: number;
  skipped: number;
  deleted: number;
  errors: string[];
}

/**
 * Migrate all reservations from 'reservations' collection to 'reservas' collection.
 * - Normalizes cabin types
 * - Skips duplicates (same ID already exists in 'reservas')
 * - Optionally deletes from source collection after successful migration
 */
export const migrateReservationsToReservas = async (
  deleteAfterMigration: boolean = false
): Promise<MigrationResult> => {
  logger.info('migration.start', { deleteAfterMigration });
  
  const result: MigrationResult = {
    success: false,
    migrated: 0,
    skipped: 0,
    deleted: 0,
    errors: []
  };

  try {
    // 1. Get all existing IDs in 'reservas' to avoid duplicates
    const reservasSnapshot = await getDocs(collection(db, 'reservas'));
    const existingIds = new Set<string>();
    reservasSnapshot.forEach(doc => existingIds.add(doc.id));
    
    logger.info('migration.existingReservas', { count: existingIds.size });

    // 2. Get all documents from 'reservations' (legacy)
    const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
    const totalLegacy = reservationsSnapshot.size;
    
    logger.info('migration.legacyReservations', { count: totalLegacy });

    if (totalLegacy === 0) {
      result.success = true;
      logger.info('migration.noDataToMigrate');
      return result;
    }

    // 3. Migrate each document
    for (const docSnapshot of reservationsSnapshot.docs) {
      const docId = docSnapshot.id;
      const data = docSnapshot.data();

      try {
        // Skip if already exists in 'reservas'
        if (existingIds.has(docId)) {
          result.skipped++;
          logger.debug('migration.skipped', { id: docId, reason: 'already_exists' });
          continue;
        }

        // Normalize the data
        const normalizedData = {
          ...data,
          cabinType: normalizeCabinType(data.cabinType || ''),
          // Ensure required fields have defaults
          payments: data.payments || [],
          paymentStatus: data.paymentStatus || 'pending_deposit',
          reservationStatus: data.reservationStatus || 'pending_checkin',
          checkInStatus: data.checkInStatus || 'pending',
          checkOutStatus: data.checkOutStatus || 'pending',
          confirmationSent: data.confirmationSent || false,
          updatedAt: Timestamp.now()
        };

        // Write to 'reservas' with the same document ID
        await setDoc(doc(db, 'reservas', docId), normalizedData);
        result.migrated++;
        
        logger.debug('migration.migrated', { id: docId });

        // Delete from 'reservations' if requested
        if (deleteAfterMigration) {
          await deleteDoc(doc(db, 'reservations', docId));
          result.deleted++;
        }

      } catch (error) {
        const errorMsg = `Error migrating ${docId}: ${String(error)}`;
        result.errors.push(errorMsg);
        logger.error('migration.documentError', { id: docId, error: String(error) });
      }
    }

    result.success = result.errors.length === 0;
    
    logger.info('migration.complete', {
      migrated: result.migrated,
      skipped: result.skipped,
      deleted: result.deleted,
      errors: result.errors.length
    });

    return result;

  } catch (error) {
    result.errors.push(`Migration failed: ${String(error)}`);
    logger.error('migration.failed', { error: String(error) });
    return result;
  }
};

/**
 * Get counts of documents in both collections for preview
 */
export const getMigrationPreview = async (): Promise<{
  reservasCount: number;
  reservationsCount: number;
  duplicateCount: number;
  toMigrateCount: number;
  error?: string;
}> => {
  let reservasCount = 0;
  let reservationsCount = 0;
  let duplicateCount = 0;
  const reservasIds = new Set<string>();
  
  try {
    logger.info('migration.preview.start');
    
    // Try to get reservas collection
    try {
      const reservasSnapshot = await getDocs(collection(db, 'reservas'));
      reservasCount = reservasSnapshot.size;
      reservasSnapshot.forEach(doc => reservasIds.add(doc.id));
      logger.debug('migration.preview.reservas', { count: reservasCount });
    } catch (reservasError) {
      logger.warn('migration.preview.reservas.error', { error: String(reservasError) });
    }
    
    // Try to get reservations collection
    try {
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      reservationsCount = reservationsSnapshot.size;
      reservationsSnapshot.forEach(doc => {
        if (reservasIds.has(doc.id)) {
          duplicateCount++;
        }
      });
      logger.debug('migration.preview.reservations', { count: reservationsCount });
    } catch (reservationsError) {
      logger.warn('migration.preview.reservations.error', { error: String(reservationsError) });
      // If reservations collection fails, it might not exist or have no permissions - that's OK
    }
    
    const result = {
      reservasCount,
      reservationsCount,
      duplicateCount,
      toMigrateCount: reservationsCount - duplicateCount
    };
    
    logger.info('migration.preview.complete', result);
    return result;
  } catch (error) {
    logger.error('migration.preview.error', { error: String(error) });
    return {
      reservasCount: 0,
      reservationsCount: 0,
      duplicateCount: 0,
      toMigrateCount: 0,
      error: String(error)
    };
  }
};
