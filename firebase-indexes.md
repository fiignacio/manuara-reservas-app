# Índices Requeridos para Firebase Firestore

Para optimizar las consultas de Firebase, es necesario crear los siguientes índices compuestos en Firebase Console:

## Índices Compuestos Necesarios

### 1. Para processDepartedReservations()
- **Colección**: `reservas`
- **Campos**:
  - `checkOutStatus` (Ascendente)
  - `checkOut` (Ascendente) 
  - `reservationStatus` (Ascendente)

### 2. Para getNextAvailableDate()
- **Colección**: `reservas`
- **Campos**:
  - `cabinType` (Ascendente)
  - `checkOut` (Ascendente)

## Cómo crear los índices

1. Ve a Firebase Console > Firestore Database > Índices
2. Haz clic en "Crear índice"
3. Selecciona la colección: `reservas`
4. Agrega los campos en el orden especificado
5. Haz clic en "Crear"

## URL automática de Firebase Console
Cuando ocurra el error, Firebase mostrará un enlace directo para crear el índice automáticamente.

## Estado Actual
- ✅ Todas las consultas han sido optimizadas para minimizar la necesidad de índices compuestos
- ✅ Las consultas complejas se procesan en memoria del cliente
- ✅ Solo se requieren los índices arriba mencionados para máximo rendimiento