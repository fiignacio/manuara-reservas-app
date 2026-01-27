
# Plan: Corregir Configuracion de Firebase

## Problema Identificado

La apiKey en el codigo actual es diferente a la configuracion correcta de Firebase mostrada en la captura de pantalla. Esto causa que la aplicacion no pueda leer los datos de la coleccion `reservas`.

### Comparacion de Configuracion

| Campo | Codigo Actual | Configuracion Correcta |
|-------|---------------|------------------------|
| apiKey | AIzaSyA49rKxFV1Sr-zFsR6GASKLc0Hd5GBXYc0 | AIzaSyA49rKxFV1Sr-zFsR6GASKLc0Hd5GBXYc0 |

Nota: Comparando caracter por caracter, la apiKey parece identica. El problema puede estar en las reglas de seguridad de Firestore o en como se esta inicializando la conexion.

---

## Solucion Propuesta

### Paso 1: Actualizar configuracion de Firebase

Modificar `src/lib/firebase.ts` para usar exactamente la configuracion mostrada en Firebase Console:

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyA49rKxFV1Sr-zFsR6GASKLc0Hd5GBXYc0",
  authDomain: "gestion-reservas-manuara.firebaseapp.com",
  projectId: "gestion-reservas-manuara",
  storageBucket: "gestion-reservas-manuara.firebasestorage.app",
  messagingSenderId: "977714534745",
  appId: "1:977714534745:web:f64d41df6f79f8ee405448"
};
```

### Paso 2: Verificar reglas de Firestore

Si la configuracion es correcta, el problema puede estar en las reglas de seguridad de Firestore. Verificar en Firebase Console > Firestore > Reglas que permitan lectura:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /reservas/{document=**} {
      allow read, write: if true;
    }
  }
}
```

### Paso 3: Simplificar la lectura de reservas

Una vez confirmada la conexion, actualizar `src/lib/reservations.ts` para leer solo de la coleccion `reservas` (eliminar lectura dual de `reservations`).

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/firebase.ts` | Verificar/actualizar configuracion de Firebase |
| `src/lib/reservations.ts` | Simplificar lectura solo de `reservas` |

---

## Verificacion

Despues de aplicar los cambios:
1. Recargar la aplicacion
2. Verificar en consola del navegador que no haya errores de Firebase
3. Confirmar que las reservas aparecen en el Dashboard y en Reservaciones

---

## Seccion Tecnica

### Posibles causas del problema

1. **Reglas de Firestore restrictivas**: Las reglas pueden estar bloqueando lecturas sin autenticacion
2. **Cache del navegador**: Datos antiguos en cache de Firebase pueden causar conflictos
3. **Configuracion de CORS**: Aunque es poco probable con Firebase SDK

### Comando para verificar conexion

Se puede agregar un log temporal para confirmar la conexion:

```typescript
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

// Test connection
getDocs(collection(db, 'reservas'))
  .then(snap => console.log('Reservas count:', snap.size))
  .catch(err => console.error('Firebase error:', err));
```
