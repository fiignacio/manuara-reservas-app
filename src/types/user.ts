export type UserRole = 'administrador' | 'sub_administrador' | 'usuario_recepcion';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface UserPermissions {
  canCreateReservations: boolean;
  canEditReservations: boolean;
  canDeleteReservations: boolean;
  canViewReservations: boolean;
  canAccessAnalytics: boolean;
  canAccessReports: boolean;
  canViewLogs: boolean;
  canManageUsers: boolean;
}

export interface UserActionLog {
  id: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: string;
  entityType: 'reservation' | 'user' | 'system';
  entityId?: string;
  details: Record<string, any>;
  reason?: string;
  timestamp: Date;
  ipAddress?: string;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  administrador: {
    canCreateReservations: true,
    canEditReservations: true,
    canDeleteReservations: true,
    canViewReservations: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canViewLogs: true,
    canManageUsers: true
  },
  sub_administrador: {
    canCreateReservations: true,
    canEditReservations: true,
    canDeleteReservations: false,
    canViewReservations: true,
    canAccessAnalytics: true,
    canAccessReports: true,
    canViewLogs: false,
    canManageUsers: false
  },
  usuario_recepcion: {
    canCreateReservations: false,
    canEditReservations: false,
    canDeleteReservations: false,
    canViewReservations: true,
    canAccessAnalytics: false,
    canAccessReports: false,
    canViewLogs: false,
    canManageUsers: false
  }
};

export const ROLE_LABELS: Record<UserRole, string> = {
  administrador: 'Administrador',
  sub_administrador: 'Sub Administrador',
  usuario_recepcion: 'Usuario Recepción'
};