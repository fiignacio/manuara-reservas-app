# Configuración Necesaria para Firebase

## 1. Reglas de Firestore (CRÍTICAS)

### Archivo: `firestore.rules`
Las reglas actuales permiten:
- ✅ Lectura pública de reservas (necesario para API externa)
- ✅ Escritura solo para usuarios autenticados
- ✅ Protección de otros documentos

### Aplicar las reglas:
1. Ve a Firebase Console → Firestore Database → Rules
2. Copia y pega el contenido de `firestore.rules`
3. Haz clic en "Publish"

## 2. Permisos de Service Account (REQUERIDOS)

### El Service Account necesita estos roles:
- `Firebase Admin SDK`
- `Cloud Datastore User` (para leer Firestore)
- `Service Account Token Creator` (para generar tokens JWT)

### Verificar permisos:
1. Ve a Google Cloud Console → IAM & Admin → IAM
2. Busca tu service account: `firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com`
3. Verifica que tenga los roles mencionados

## 3. APIs Habilitadas (OBLIGATORIAS)

Debe tener habilitadas estas APIs en Google Cloud:
- ✅ Firestore API
- ✅ Firebase Admin API
- ✅ Google OAuth2 API

### Habilitar APIs:
1. Ve a Google Cloud Console → APIs & Services → Library
2. Busca y habilita cada API mencionada

## 4. Estructura de Datos en Firestore

### Colección: `reservations`
Cada documento debe tener esta estructura:
```javascript
{
  cabinType: "pequeña", // string: "pequeña", "mediana1", "mediana2", "grande"
  checkIn: "2025-08-20", // string: formato YYYY-MM-DD
  checkOut: "2025-08-25", // string: formato YYYY-MM-DD
  status: "confirmed", // string: "confirmed", "cancelled", "pending"
  // otros campos opcionales...
}
```

## 5. Seguridad del API Key

### En Supabase Edge Functions:
- ✅ `EXTERNAL_API_KEY` está configurado como secreto
- ✅ Se valida en cada request

### Uso del API Key:
```javascript
headers: {
  'x-api-key': 'tu-api-key-aquí'
}
```

## 6. Validaciones Implementadas

### En el Edge Function:
- ✅ Validación de API key
- ✅ Validación de parámetros requeridos
- ✅ Validación de tipos de cabaña válidos
- ✅ Validación de formato de fechas
- ✅ Validación de lógica de fechas (check-out > check-in)
- ✅ Manejo de errores de Firebase
- ✅ Logging detallado para debugging

## 7. Debugging

### Para revisar logs:
1. Supabase Edge Function logs: Ve al dashboard de Supabase
2. Firebase logs: Ve a Firebase Console → Functions → Logs

### Errores comunes:
- `Unauthorized`: Verificar API key
- `Firebase service account not configured`: Verificar secret FIREBASE_SERVICE_ACCOUNT
- `Permission denied`: Verificar reglas de Firestore
- `Invalid parameter`: Verificar formato de datos enviados