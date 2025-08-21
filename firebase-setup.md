# Configuración de Firebase

Para completar la configuración de Firebase, sigue estos pasos:

## 1. Crear proyecto en Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita Firestore Database

## 2. Obtener configuración

1. En la configuración del proyecto, ve a "Configuración del proyecto"
2. En la pestaña "General", busca "Tus aplicaciones"
3. Haz clic en "Aplicación web" (ícono `</>`)
4. Registra tu aplicación
5. Copia la configuración de Firebase

## 3. Actualizar configuración

Reemplaza la configuración en `src/lib/firebase.ts` con tus credenciales reales:

```typescript
const firebaseConfig = {
  apiKey: "tu-api-key",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-project-id",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefghijk"
};
```

## 4. Configurar reglas de Firestore

⚠️ **IMPORTANTE**: Configura las reglas de seguridad de producción. En Firebase Console, ve a Firestore Database > Reglas y configura las reglas de `firebase-rules.txt` que incluyen:

- ✅ Autenticación obligatoria para todas las operaciones
- ✅ Validación estricta de esquema y tipos de datos
- ✅ Validación de fechas con formato YYYY-MM-DD
- ✅ Validación de lógica de negocio (checkout > checkin, capacidades)
- ✅ Protección contra inyección y datos maliciosos

```javascript
// NUNCA uses estas reglas inseguras en producción:
// allow read, write: if true; // ❌ PELIGROSO

// Usa las reglas de firebase-rules.txt que requieren autenticación
```

## 4.1. Implementar autenticación

La aplicación requiere autenticación de Firebase para funcionar. Configura Authentication en Firebase Console:

1. Ve a Authentication > Sign-in method
2. Habilita Email/Password u otros proveedores
3. Implementa el sistema de login en la aplicación

## 5. Crear índices (si es necesario)

Firebase creará automáticamente los índices necesarios cuando uses las consultas por primera vez.

Una vez completados estos pasos, la aplicación estará completamente configurada para usar Firebase como base de datos principal.