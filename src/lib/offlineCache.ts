import { Reservation } from '@/types/reservation';
import { logger } from './logger';

const STORAGE_KEYS = {
  RESERVATIONS: 'manuara_reservations_cache',
  LAST_SYNC: 'manuara_last_sync',
  PENDING_OPERATIONS: 'manuara_pending_operations',
};

interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  data?: Partial<Reservation>;
  timestamp: number;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0';

// ============ Generic Cache Utilities ============

function getFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed: CachedData<T> = JSON.parse(stored);
    
    // Version check for cache invalidation
    if (parsed.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    logger.warn('offlineCache.getFromStorage.error', { key, error: String(error) });
    return null;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch (error) {
    logger.warn('offlineCache.saveToStorage.error', { key, error: String(error) });
  }
}

function getLastSyncTime(key: string): number | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const parsed: CachedData<unknown> = JSON.parse(stored);
    return parsed.timestamp;
  } catch {
    return null;
  }
}

// ============ Reservations Cache ============

export function getCachedReservations(): Reservation[] {
  const cached = getFromStorage<Reservation[]>(STORAGE_KEYS.RESERVATIONS);
  return cached || [];
}

export function cacheReservations(reservations: Reservation[]): void {
  saveToStorage(STORAGE_KEYS.RESERVATIONS, reservations);
  logger.info('offlineCache.reservations.cached', { count: reservations.length });
}

export function getReservationsCacheTime(): number | null {
  return getLastSyncTime(STORAGE_KEYS.RESERVATIONS);
}

export function updateCachedReservation(id: string, updates: Partial<Reservation>): void {
  const cached = getCachedReservations();
  const index = cached.findIndex(r => r.id === id);
  
  if (index !== -1) {
    cached[index] = { ...cached[index], ...updates };
    saveToStorage(STORAGE_KEYS.RESERVATIONS, cached);
  }
}

export function addCachedReservation(reservation: Reservation): void {
  const cached = getCachedReservations();
  cached.unshift(reservation);
  saveToStorage(STORAGE_KEYS.RESERVATIONS, cached);
}

export function removeCachedReservation(id: string): void {
  const cached = getCachedReservations();
  const filtered = cached.filter(r => r.id !== id);
  saveToStorage(STORAGE_KEYS.RESERVATIONS, filtered);
}

// ============ Pending Operations (for offline mutations) ============

export function getPendingOperations(): PendingOperation[] {
  const cached = getFromStorage<PendingOperation[]>(STORAGE_KEYS.PENDING_OPERATIONS);
  return cached || [];
}

export function addPendingOperation(operation: Omit<PendingOperation, 'timestamp'>): void {
  const pending = getPendingOperations();
  pending.push({ ...operation, timestamp: Date.now() });
  saveToStorage(STORAGE_KEYS.PENDING_OPERATIONS, pending);
  logger.info('offlineCache.pendingOperation.added', { type: operation.type, id: operation.id });
}

export function removePendingOperation(id: string): void {
  const pending = getPendingOperations();
  const filtered = pending.filter(op => op.id !== id);
  saveToStorage(STORAGE_KEYS.PENDING_OPERATIONS, filtered);
}

export function clearPendingOperations(): void {
  localStorage.removeItem(STORAGE_KEYS.PENDING_OPERATIONS);
}

export function hasPendingOperations(): boolean {
  return getPendingOperations().length > 0;
}

// ============ Offline Availability Check ============

export function checkCabinAvailabilityOffline(
  cabinType: string,
  checkIn: string,
  checkOut: string,
  excludeReservationId?: string
): boolean {
  const reservations = getCachedReservations();
  
  const conflictingReservations = reservations.filter(reservation => {
    // Exclude current reservation if editing
    if (excludeReservationId && reservation.id === excludeReservationId) {
      return false;
    }
    
    // Only check same cabin type
    if (reservation.cabinType !== cabinType) {
      return false;
    }
    
    // Check for date overlap: checkIn < resCheckOut && checkOut > resCheckIn
    return checkIn < reservation.checkOut && checkOut > reservation.checkIn;
  });
  
  return conflictingReservations.length === 0;
}

export function getNextAvailableDateOffline(
  cabinType: string,
  preferredCheckIn: string
): string | null {
  const reservations = getCachedReservations()
    .filter(r => r.cabinType === cabinType && r.checkOut > preferredCheckIn)
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));
  
  if (reservations.length === 0) {
    return preferredCheckIn;
  }
  
  let currentDate = preferredCheckIn;
  
  for (const reservation of reservations) {
    if (currentDate < reservation.checkIn) {
      return currentDate; // Gap found before this reservation
    }
    currentDate = reservation.checkOut;
  }
  
  return currentDate;
}

// ============ Cache Status ============

export function getCacheStatus(): {
  hasReservations: boolean;
  reservationsCount: number;
  lastSync: Date | null;
  pendingOperationsCount: number;
} {
  const reservations = getCachedReservations();
  const lastSyncTime = getReservationsCacheTime();
  const pendingOps = getPendingOperations();
  
  return {
    hasReservations: reservations.length > 0,
    reservationsCount: reservations.length,
    lastSync: lastSyncTime ? new Date(lastSyncTime) : null,
    pendingOperationsCount: pendingOps.length,
  };
}

export function clearAllCache(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  logger.info('offlineCache.cleared');
}
