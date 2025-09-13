import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserPermissions, ROLE_PERMISSIONS } from '@/types/user';
import { AuthService } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { userLogger } from '@/lib/userLogger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  permissions: UserPermissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    logger.debug('auth.provider.initializing');
    
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
      
      if (user) {
        logger.debug('auth.stateChanged.userFound', { 
          userId: user.uid, 
          role: user.role 
        });
        // Update user logger context
        userLogger.setCurrentUser({
          uid: user.uid,
          email: user.email,
          role: user.role
        });
      } else {
        logger.debug('auth.stateChanged.noUser');
        userLogger.setCurrentUser(null);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const result = await AuthService.signIn(email, password);
      if (result.user) {
        setUser(result.user);
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Error de autenticación' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      logger.exception('auth.signOut.error', error);
    }
  };

  const permissions = user ? ROLE_PERMISSIONS[user.role] : ROLE_PERMISSIONS.usuario_recepcion;

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    return permissions[permission];
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    hasPermission,
    permissions
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};