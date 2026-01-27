import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllReservations, 
  createReservation, 
  updateReservation, 
  deleteReservation,
  updateReservationStatuses
} from '@/lib/reservations';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { logger } from '@/lib/logger';

// Query keys for cache management
export const reservationKeys = {
  all: ['reservations'] as const,
  lists: () => [...reservationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...reservationKeys.lists(), filters] as const,
  details: () => [...reservationKeys.all, 'detail'] as const,
  detail: (id: string) => [...reservationKeys.details(), id] as const,
};

// Cache configuration
const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch all reservations with caching
 */
export function useReservationsQuery() {
  return useQuery({
    queryKey: reservationKeys.lists(),
    queryFn: async () => {
      logger.info('useReservations.query.start');
      const data = await getAllReservations();
      logger.info('useReservations.query.success', { count: data.length });
      return data;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to create a new reservation
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: ReservationFormData) => {
      logger.info('useReservations.create.start');
      const id = await createReservation(data);
      logger.info('useReservations.create.success', { id });
      return id;
    },
    onSuccess: () => {
      // Invalidate and refetch reservations list
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
    onError: (error) => {
      logger.error('useReservations.create.error', { error: String(error) });
    },
  });
}

/**
 * Hook to update an existing reservation
 */
export function useUpdateReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      data, 
      shouldUpdateDates = true 
    }: { 
      id: string; 
      data: ReservationFormData; 
      shouldUpdateDates?: boolean;
    }) => {
      logger.info('useReservations.update.start', { id });
      await updateReservation(id, data, shouldUpdateDates);
      logger.info('useReservations.update.success', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
    onError: (error) => {
      logger.error('useReservations.update.error', { error: String(error) });
    },
  });
}

/**
 * Hook to delete a reservation
 */
export function useDeleteReservation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('useReservations.delete.start', { id });
      await deleteReservation(id);
      logger.info('useReservations.delete.success', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
    onError: (error) => {
      logger.error('useReservations.delete.error', { error: String(error) });
    },
  });
}

/**
 * Hook to update reservation statuses
 */
export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      statusUpdates, 
      previousReservation 
    }: { 
      id: string; 
      statusUpdates: Parameters<typeof updateReservationStatuses>[1];
      previousReservation?: Reservation;
    }) => {
      logger.info('useReservations.updateStatus.start', { id, statusUpdates });
      await updateReservationStatuses(id, statusUpdates, { previousReservation });
      logger.info('useReservations.updateStatus.success', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reservationKeys.lists() });
    },
    onError: (error) => {
      logger.error('useReservations.updateStatus.error', { error: String(error) });
    },
  });
}

/**
 * Hook to manually invalidate reservations cache
 */
export function useInvalidateReservations() {
  const queryClient = useQueryClient();
  
  return () => {
    logger.info('useReservations.invalidate');
    queryClient.invalidateQueries({ queryKey: reservationKeys.all });
  };
}

/**
 * Hook to prefetch reservations (useful for navigation)
 */
export function usePrefetchReservations() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.prefetchQuery({
      queryKey: reservationKeys.lists(),
      queryFn: getAllReservations,
      staleTime: STALE_TIME,
    });
  };
}
