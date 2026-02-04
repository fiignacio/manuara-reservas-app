import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from '@/components/OfflineIndicator';
import { 
  getOfflineQueue, 
  syncQueue, 
  getQueueLength,
  hasQueuedOperations,
  SyncResult,
  OfflineOperation 
} from '@/lib/offlineQueue';
import { getAdminConfig, AdminConfig } from '@/lib/adminConfig';
import { useQueryClient } from '@tanstack/react-query';
import { reservationKeys } from './useReservations';
import { useToast } from './use-toast';
import { logger } from '@/lib/logger';

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [pendingCount, setPendingCount] = useState(getQueueLength());
  const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
  
  // Update pending count periodically
  useEffect(() => {
    const updatePending = () => {
      setPendingCount(getQueueLength());
      setPendingOperations(getOfflineQueue());
    };
    
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const performSync = useCallback(async () => {
    if (isSyncing || !isOnline) return null;
    
    const queueLength = getQueueLength();
    if (queueLength === 0) return null;
    
    setIsSyncing(true);
    logger.info('useOfflineSync.syncStart', { pendingCount: queueLength });
    
    try {
      const result = await syncQueue();
      setLastSyncResult(result);
      setPendingCount(getQueueLength());
      setPendingOperations(getOfflineQueue());
      
      // Refresh data after sync
      queryClient.invalidateQueries({ queryKey: reservationKeys.all });
      
      // Show toast notification
      if (result.succeeded > 0) {
        toast({
          title: '✅ Sincronización completada',
          description: `${result.succeeded} operación(es) sincronizada(s) correctamente.${result.failed > 0 ? ` ${result.failed} fallaron.` : ''}`,
        });
      } else if (result.failed > 0) {
        toast({
          title: '⚠️ Error de sincronización',
          description: `${result.failed} operación(es) no pudieron sincronizarse.`,
          variant: 'destructive',
        });
      }
      
      logger.info('useOfflineSync.syncComplete', result);
      return result;
    } catch (error) {
      logger.error('useOfflineSync.syncError', { error: String(error) });
      toast({
        title: '❌ Error de sincronización',
        description: 'Hubo un problema al sincronizar los cambios.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, queryClient, toast]);
  
  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && hasQueuedOperations()) {
      // Delay sync slightly to ensure network is stable
      const timer = setTimeout(performSync, 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, performSync]);
  
  return {
    isOnline,
    isSyncing,
    pendingCount,
    pendingOperations,
    hasPendingOperations: pendingCount > 0,
    lastSyncResult,
    syncNow: performSync,
  };
}

export function useAdminConfig() {
  const [config, setConfig] = useState<AdminConfig>(() => getAdminConfig());
  
  const refreshConfig = useCallback(() => {
    setConfig(getAdminConfig());
  }, []);
  
  return { config, refreshConfig };
}
