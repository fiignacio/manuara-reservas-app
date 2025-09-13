import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserActionLog, UserRole } from '@/types/user';
import { logger } from './logger';

class UserLoggerService {
  private currentUser: { uid: string; email: string; role: UserRole } | null = null;

  setCurrentUser(user: { uid: string; email: string; role: UserRole } | null) {
    this.currentUser = user;
  }

  async logAction(
    action: string,
    entityType: 'reservation' | 'user' | 'system',
    details: Record<string, any>,
    entityId?: string,
    reason?: string
  ): Promise<void> {
    if (!this.currentUser) {
      logger.warn('userLogger.logAction.noUser', { action, entityType });
      return;
    }

    try {
      const logEntry: Omit<UserActionLog, 'id'> = {
        userId: this.currentUser.uid,
        userEmail: this.currentUser.email,
        userRole: this.currentUser.role,
        action,
        entityType,
        entityId,
        details,
        reason,
        timestamp: new Date(),
        ipAddress: await this.getClientIP()
      };

      await addDoc(collection(db, 'user_actions'), {
        ...logEntry,
        timestamp: serverTimestamp()
      });

      logger.info('userLogger.actionLogged', {
        action,
        entityType,
        userId: this.currentUser.uid,
        role: this.currentUser.role
      });
    } catch (error) {
      logger.exception('userLogger.logAction.error', error);
    }
  }

  async logReservationAction(
    action: 'create' | 'update' | 'delete' | 'view',
    reservationId: string,
    details: Record<string, any>,
    reason?: string
  ): Promise<void> {
    await this.logAction(
      `reservation.${action}`,
      'reservation',
      details,
      reservationId,
      reason
    );
  }

  async logSystemAction(
    action: string,
    details: Record<string, any>,
    reason?: string
  ): Promise<void> {
    await this.logAction(
      `system.${action}`,
      'system',
      details,
      undefined,
      reason
    );
  }

  async logUserAction(
    action: 'create' | 'update' | 'delete' | 'login' | 'logout',
    targetUserId: string,
    details: Record<string, any>,
    reason?: string
  ): Promise<void> {
    await this.logAction(
      `user.${action}`,
      'user',
      details,
      targetUserId,
      reason
    );
  }

  private async getClientIP(): Promise<string | undefined> {
    try {
      // This is a simple way to get client IP, in production you might want to use a more robust solution
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return undefined;
    }
  }
}

export const userLogger = new UserLoggerService();