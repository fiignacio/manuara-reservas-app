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
      return { user: null, error: error.message };
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
      return { user: null, error: error.message };
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