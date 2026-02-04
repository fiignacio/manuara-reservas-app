import { Reservation, ReservationFormData, PaymentStatus, ReservationStatusType } from '@/types/reservation';
import { logger } from './logger';
import { createReservation, updateReservation, deleteReservation } from './reservations';
import { updateReservationStatuses } from './reservations';

const STORAGE_KEY = 'manuara_offline_queue';

export type OfflineOperationType = 'create' | 'update' | 'delete' | 'status_update';

export type StatusUpdates = Partial<Pick<Reservation, 
  'paymentStatus' | 
  'reservationStatus' | 
  'checkInStatus' | 
  'checkOutStatus' |
  'actualCheckIn' |
  'actualCheckOut' |
  'checkInNotes' |
  'checkOutNotes'
>>;

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  entityType: 'reservation';
  entityId?: string;
  data?: ReservationFormData | Partial<Reservation>;
  statusUpdates?: StatusUpdates;
  timestamp: number;
  retryCount: number;
  error?: string;
}

interface QueueState {
  operations: OfflineOperation[];
  version: string;
}

const QUEUE_VERSION = '1.0';

// ============ Queue Management ============

export function getOfflineQueue(): OfflineOperation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const state: QueueState = JSON.parse(stored);
    if (state.version !== QUEUE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    
    return state.operations;
  } catch (error) {
    logger.warn('offlineQueue.get.error', { error: String(error) });
    return [];
  }
}

function saveQueue(operations: OfflineOperation[]): void {
  try {
    const state: QueueState = {
      operations,
      version: QUEUE_VERSION,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('offlineQueue.save.error', { error: String(error) });
  }
}

export function addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): string {
  const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const newOperation: OfflineOperation = {
    ...operation,
    id,
    timestamp: Date.now(),
    retryCount: 0,
  };
  
  const queue = getOfflineQueue();
  queue.push(newOperation);
  saveQueue(queue);
  
  logger.info('offlineQueue.added', { id, type: operation.type });
  return id;
}

export function removeFromQueue(operationId: string): void {
  const queue = getOfflineQueue();
  const filtered = queue.filter(op => op.id !== operationId);
  saveQueue(filtered);
  logger.info('offlineQueue.removed', { id: operationId });
}

export function updateOperationError(operationId: string, error: string): void {
  const queue = getOfflineQueue();
  const index = queue.findIndex(op => op.id === operationId);
  
  if (index !== -1) {
    queue[index].error = error;
    queue[index].retryCount += 1;
    saveQueue(queue);
  }
}

export function clearQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
  logger.info('offlineQueue.cleared');
}

export function getQueueLength(): number {
  return getOfflineQueue().length;
}

export function hasQueuedOperations(): boolean {
  return getQueueLength() > 0;
}

// ============ Queue Processing ============

async function processOperation(operation: OfflineOperation): Promise<boolean> {
  try {
    switch (operation.type) {
      case 'create':
        if (operation.data) {
          await createReservation(operation.data as ReservationFormData);
        }
        break;
        
      case 'update':
        if (operation.entityId && operation.data) {
          await updateReservation(operation.entityId, operation.data as ReservationFormData);
        }
        break;
        
      case 'delete':
        if (operation.entityId) {
          await deleteReservation(operation.entityId);
        }
        break;
        
      case 'status_update':
        if (operation.entityId && operation.statusUpdates) {
          await updateReservationStatuses(operation.entityId, operation.statusUpdates);
        }
        break;
        
      default:
        logger.warn('offlineQueue.unknownType', { type: operation.type });
        return false;
    }
    
    return true;
  } catch (error) {
    logger.error('offlineQueue.processError', { 
      id: operation.id, 
      type: operation.type,
      error: String(error) 
    });
    return false;
  }
}

export interface SyncResult {
  processed: number;
  succeeded: number;
  failed: number;
  failedOperations: OfflineOperation[];
}

export async function syncQueue(): Promise<SyncResult> {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return { processed: 0, succeeded: 0, failed: 0, failedOperations: [] };
  }
  
  logger.info('offlineQueue.syncStart', { count: queue.length });
  
  const result: SyncResult = {
    processed: queue.length,
    succeeded: 0,
    failed: 0,
    failedOperations: [],
  };
  
  const remainingOperations: OfflineOperation[] = [];
  
  for (const operation of queue) {
    const success = await processOperation(operation);
    
    if (success) {
      result.succeeded++;
    } else {
      result.failed++;
      
      // Keep operation for retry if retryCount < 3
      if (operation.retryCount < 3) {
        operation.retryCount++;
        remainingOperations.push(operation);
      }
      
      result.failedOperations.push(operation);
    }
  }
  
  saveQueue(remainingOperations);
  
  logger.info('offlineQueue.syncComplete', {
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
  });
  
  return result;
}

// ============ Queue Convenience Methods ============

export function queueCreateReservation(data: ReservationFormData): string {
  return addToQueue({
    type: 'create',
    entityType: 'reservation',
    data,
  });
}

export function queueUpdateReservation(id: string, data: ReservationFormData): string {
  return addToQueue({
    type: 'update',
    entityType: 'reservation',
    entityId: id,
    data,
  });
}

export function queueDeleteReservation(id: string): string {
  return addToQueue({
    type: 'delete',
    entityType: 'reservation',
    entityId: id,
  });
}

export function queueStatusUpdate(id: string, statusUpdates: StatusUpdates): string {
  return addToQueue({
    type: 'status_update',
    entityType: 'reservation',
    entityId: id,
    statusUpdates,
  });
}
