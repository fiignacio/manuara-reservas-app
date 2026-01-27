import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getAllSolicitudes, 
  getSolicitudesPendientes,
  getPendingCount,
  aprobarSolicitud, 
  rechazarSolicitud, 
  deleteSolicitud,
  createSolicitud
} from '@/lib/solicitudesService';
import { SolicitudReserva, SolicitudFormData } from '@/types/solicitud';
import { logger } from '@/lib/logger';
import { reservationKeys } from './useReservations';

// Query keys
export const solicitudKeys = {
  all: ['solicitudes'] as const,
  lists: () => [...solicitudKeys.all, 'list'] as const,
  pending: () => [...solicitudKeys.all, 'pending'] as const,
  count: () => [...solicitudKeys.all, 'count'] as const,
};

const STALE_TIME = 2 * 60 * 1000; // 2 minutes
const CACHE_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * Hook to fetch all solicitudes
 */
export function useSolicitudesQuery() {
  return useQuery({
    queryKey: solicitudKeys.lists(),
    queryFn: async () => {
      logger.info('useSolicitudes.query.start');
      const data = await getAllSolicitudes();
      logger.info('useSolicitudes.query.success', { count: data.length });
      return data;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch pending solicitudes count (for badge)
 */
export function usePendingCountQuery() {
  return useQuery({
    queryKey: solicitudKeys.count(),
    queryFn: getPendingCount,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to create a new solicitud
 */
export function useCreateSolicitud() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: SolicitudFormData) => {
      logger.info('useSolicitudes.create.start');
      const id = await createSolicitud(data);
      logger.info('useSolicitudes.create.success', { id });
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitudKeys.all });
    },
  });
}

/**
 * Hook to approve a solicitud (creates reservation)
 */
export function useAprobarSolicitud() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (solicitud: SolicitudReserva) => {
      logger.info('useSolicitudes.aprobar.start', { id: solicitud.id });
      await aprobarSolicitud(solicitud);
      logger.info('useSolicitudes.aprobar.success', { id: solicitud.id });
    },
    onSuccess: () => {
      // Invalidate both solicitudes and reservations
      queryClient.invalidateQueries({ queryKey: solicitudKeys.all });
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
    },
  });
}

/**
 * Hook to reject a solicitud
 */
export function useRechazarSolicitud() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      logger.info('useSolicitudes.rechazar.start', { id });
      await rechazarSolicitud(id, reason);
      logger.info('useSolicitudes.rechazar.success', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitudKeys.all });
    },
  });
}

/**
 * Hook to delete a solicitud
 */
export function useDeleteSolicitud() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('useSolicitudes.delete.start', { id });
      await deleteSolicitud(id);
      logger.info('useSolicitudes.delete.success', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: solicitudKeys.all });
    },
  });
}
