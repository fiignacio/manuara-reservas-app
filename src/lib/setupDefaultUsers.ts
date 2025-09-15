import { AuthService } from './auth';
import { UserRole } from '@/types/user';

interface DefaultUser {
  email: string;
  password: string;
  role: UserRole;
  displayName: string;
}

const DEFAULT_USERS: DefaultUser[] = [
  {
    email: 'admin@manuara.com',
    password: 'admin123',
    role: 'administrador',
    displayName: 'Administrador Principal'
  },
  {
    email: 'subadmin@manuara.com',
    password: 'subadmin123',
    role: 'sub_administrador',
    displayName: 'Sub Administrador'
  },
  {
    email: 'recepcion@manuara.com',
    password: 'recepcion123',
    role: 'usuario_recepcion',
    displayName: 'Usuario Recepción'
  }
];

export async function setupDefaultUsers(): Promise<void> {
  console.log('🔧 Configurando usuarios por defecto...');
  
  for (const defaultUser of DEFAULT_USERS) {
    try {
      // Check if user already exists by trying to get their profile first
      // We need to check by email, but getUserProfile uses UID, so we'll try to create and handle the error
      let userExists = false;
      try {
        // Try to create user - if email exists, this will throw an error
        const testResult = await AuthService.createUser(
          defaultUser.email,
          'temp123', // temporary password
          defaultUser.role,
          defaultUser.displayName
        );
        
        if (testResult.error && testResult.error.includes('ya está en uso')) {
          userExists = true;
        }
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
          userExists = true;
        }
      }
      
      if (!userExists) {
        const result = await AuthService.createUser(
          defaultUser.email,
          defaultUser.password,
          defaultUser.role,
          defaultUser.displayName
        );
        
        if (result.user) {
          console.log(`✅ Usuario creado: ${defaultUser.email} (${defaultUser.role})`);
        } else {
          console.log(`❌ Error creando usuario ${defaultUser.email}: ${result.error}`);
        }
      } else {
        console.log(`ℹ️ Usuario ya existe: ${defaultUser.email}`);
      }
    } catch (error) {
      console.log(`❌ Error procesando usuario ${defaultUser.email}:`, error);
    }
  }
  
  console.log('🎉 Configuración de usuarios completada');
}

// Auto-execute if this file is imported
if (import.meta.env.DEV) {
  setTimeout(() => {
    setupDefaultUsers().catch(console.error);
  }, 2000); // Wait for Firebase to initialize
}