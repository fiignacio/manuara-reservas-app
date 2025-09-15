import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
import { User, UserRole } from '@/types/user';
import { logger } from './logger';

export class AuthService {
  static async signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
    try {
      logger.userAction('auth.signin.attempt', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2') });
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const user = await this.getUserProfile(firebaseUser.uid);
      if (!user) {
        throw new Error('Perfil de usuario no encontrado');
      }

      // Update last login
      await this.updateLastLogin(user.uid);
      
      logger.userAction('auth.signin.success', { 
        userId: user.uid, 
        email: user.email, 
        role: user.role 
      });
      
      return { user, error: null };
    } catch (error: any) {
      logger.exception('auth.signin.error', error);
      let errorMessage = 'Error de autenticación';
      
      if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'El método de autenticación no está habilitado. Contacte al administrador.';
      } else if (error.code === 'auth/user-not-found') {
        errorMessage = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Usuario deshabilitado';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos. Intente más tarde.';
      }
      
      return { user: null, error: errorMessage };
    }
  }

  static async signOut(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        logger.userAction('auth.signout', { userId: currentUser.uid });
      }
      await firebaseSignOut(auth);
    } catch (error) {
      logger.exception('auth.signout.error', error);
      throw error;
    }
  }

  static async createUser(
    email: string, 
    password: string, 
    role: UserRole, 
    displayName?: string
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      logger.userAction('auth.createUser.attempt', { email: email.replace(/(.{2}).*(@.*)/, '$1***$2'), role });
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userData: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName,
        role,
        createdAt: new Date(),
        lastLogin: new Date(),
        isActive: true
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      }, { merge: true });

      logger.userAction('auth.createUser.success', { 
        userId: userData.uid, 
        email: userData.email, 
        role: userData.role 
      });

      return { user: userData, error: null };
    } catch (error: any) {
      logger.exception('auth.createUser.error', error);
      let errorMessage = 'Error al crear usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'El email ya está en uso';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email inválido';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'El registro de usuarios no está habilitado. Contacte al administrador.';
      }
      
      return { user: null, error: errorMessage };
    }
  }

  static async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        return null;
      }

      const data = userDoc.data();
      return {
        uid: userDoc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        createdAt: data.createdAt?.toDate() || new Date(),
        lastLogin: data.lastLogin?.toDate() || new Date(),
        isActive: data.isActive ?? true
      };
    } catch (error) {
      logger.exception('auth.getUserProfile.error', error);
      return null;
    }
  }

  static async updateLastLogin(uid: string): Promise<void> {
    try {
      await setDoc(doc(db, 'users', uid), {
        lastLogin: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      logger.exception('auth.updateLastLogin.error', error);
    }
  }

  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const user = await this.getUserProfile(firebaseUser.uid);
        callback(user);
      } else {
        callback(null);
      }
    });
  }
}