import { useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useReservationsQuery, reservationKeys } from './useReservations';
import { useOnlineStatus } from '@/components/OfflineIndicator';
import { 
  getCachedReservations, 
  cacheReservations, 
  checkCabinAvailabilityOffline,
  getNextAvailableDateOffline,
  getCacheStatus,
  addPendingOperation,
  getPendingOperations,
  removePendingOperation
} from '@/lib/offlineCache';
import { checkCabinAvailability, getNextAvailableDate } from '@/lib/availability';
import { Reservation } from '@/types/reservation';
import { logger } from '@/lib/logger';

/**
 * Hook that provides reservations with offline support.
 * When online, fetches from Firebase and caches locally.
 * When offline, returns cached data.
 */
export function useOfflineReservations() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const query = useReservationsQuery();
  
  // Cache reservations when online and data is fresh
  useEffect(() => {
    if (isOnline && query.data && query.data.length > 0) {
      cacheReservations(query.data);
    }
  }, [isOnline, query.data]);
  
  // Get data based on online status
  const reservations = useMemo<Reservation[]>(() => {
    if (isOnline && query.data) {
      return query.data;
    }
    
    // Offline or loading - use cached data
    const cached = getCachedReservations();
    if (cached.length > 0) {
      logger.info('useOfflineReservations.usingCache', { count: cached.length });
      return cached;
    }
    
    // Return query data if available (even if stale)
    return query.data || [];
  }, [isOnline, query.data]);
  
  // Enhanced loading state
  const isLoading = isOnline ? query.isLoading : false;
  const isFetching = isOnline ? query.isFetching : false;
  
  // Check if using cached data
  const isUsingCache = !isOnline || (!query.data && getCachedReservations().length > 0);
  
  // Cache status info
  const cacheStatus = useMemo(() => getCacheStatus(), [reservations]);
  
  return {
    reservations,
    isLoading,
    isFetching,
    isOnline,
    isUsingCache,
    cacheStatus,
    error: isOnline ? query.error : null,
    refetch: query.refetch,
  };
}

/**
 * Hook for checking cabin availability with offline support
 */
export function useOfflineAvailability() {
  const isOnline = useOnlineStatus();
  
  const checkAvailability = useCallback(async (
    cabinType: string,
    checkIn: string,
    checkOut: string,
    excludeReservationId?: string
  ): Promise<boolean> => {
    if (isOnline) {
      try {
        return await checkCabinAvailability(cabinType, checkIn, checkOut, excludeReservationId);
      } catch (error) {
        logger.warn('useOfflineAvailability.onlineCheckFailed', { error: String(error) });
        // Fallback to offline check if online fails
        return checkCabinAvailabilityOffline(cabinType, checkIn, checkOut, excludeReservationId);
      }
    }
    
    // Offline mode - use cached data
    return checkCabinAvailabilityOffline(cabinType, checkIn, checkOut, excludeReservationId);
  }, [isOnline]);
  
  const getNextAvailable = useCallback(async (
    cabinType: string,
    preferredCheckIn: string
  ): Promise<string | null> => {
    if (isOnline) {
      try {
        return await getNextAvailableDate(cabinType, preferredCheckIn);
      } catch (error) {
        logger.warn('useOfflineAvailability.getNextAvailableFailed', { error: String(error) });
        return getNextAvailableDateOffline(cabinType, preferredCheckIn);
      }
    }
    
    return getNextAvailableDateOffline(cabinType, preferredCheckIn);
  }, [isOnline]);
  
  return {
    checkAvailability,
    getNextAvailable,
    isOnline,
  };
}

/**
 * Hook for syncing pending operations when coming back online
 */
export function useSyncPendingOperations() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  
  const syncPending = useCallback(async () => {
    const pending = getPendingOperations();
    if (pending.length === 0) return;
    
    logger.info('useSyncPendingOperations.syncing', { count: pending.length });
    
    for (const operation of pending) {
      try {
        // Here you would process each pending operation
        // For now, just remove it after "processing"
        // In a real implementation, you'd call the appropriate API
        removePendingOperation(operation.id);
        logger.info('useSyncPendingOperations.synced', { id: operation.id, type: operation.type });
      } catch (error) {
        logger.error('useSyncPendingOperations.error', { 
          id: operation.id, 
          type: operation.type,
          error: String(error) 
        });
        // Keep the operation for retry
      }
    }
    
    // Refresh data after sync
    queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  }, [queryClient]);
  
  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncPending();
    }
  }, [isOnline, syncPending]);
  
  return { syncPending, hasPending: getPendingOperations().length > 0 };
}
