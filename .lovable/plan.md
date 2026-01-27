

# Plan: Corregir Inconsistencia de Colecciones Firebase

## Problema Identificado

Hay una inconsistencia en el codigo despues de la migracion parcial:

| Archivo | Lee de `reservas` | Lee de `reservations` |
|---------|------------------|----------------------|
| `src/lib/reservations.ts` | Si | **No** (eliminado) |
| `src/hooks/usePublicAvailability.ts` | Si | Si |
| `src/lib/publicAvailability.ts` | Si | Si |
| `public/widget-vanilla/...` | Si | Si |

**Resultado**: El Dashboard y pagina de Reservaciones solo ven datos de `reservas`, pero el widget y otras partes ven datos de ambas colecciones.

---

## Opcion A: Ejecutar Migracion Completa (Recomendada)

Antes de hacer cambios de codigo, debes ejecutar la herramienta de migracion:

1. Ir al Dashboard en el Channel Manager
2. Abrir "Herramientas de Administracion" (al final de la pagina)
3. Revisar el preview de migracion (cuantas reservas hay en cada coleccion)
4. Ejecutar migracion con la opcion de eliminar originales
5. Verificar que todas las reservas esten en `reservas`

**Despues de migrar**, actualizar el codigo para que todos los archivos lean solo de `reservas`.

---

## Opcion B: Mantener Lectura Dual (Alternativa Segura)

Si prefieres no ejecutar la migracion aun, restaurar la lectura dual en `reservations.ts`:

### Cambio 1: Restaurar lectura dual en `src/lib/reservations.ts`

Modificar `getAllReservations()` para leer de ambas colecciones:

```typescript
export const getAllReservations = async (): Promise<Reservation[]> => {
  logger.time('reservations.getAllReservations');
  
  const reservations: Reservation[] = [];
  const seenIds = new Set<string>();
  
  try {
    // Leer de coleccion principal
    const qReservas = query(collection(db, 'reservas'), orderBy('checkIn', 'asc'));
    const reservasSnapshot = await getDocs(qReservas);
    
    reservasSnapshot.docs.forEach(doc => {
      const data = doc.data();
      seenIds.add(doc.id);
      reservations.push(normalizeReservation({ ...data, id: doc.id }));
    });
    
    // Leer de coleccion legacy
    const qReservations = query(collection(db, 'reservations'), orderBy('checkIn', 'asc'));
    const reservationsSnapshot = await getDocs(qReservations);
    
    reservationsSnapshot.docs.forEach(doc => {
      if (!seenIds.has(doc.id)) {
        const data = doc.data();
        reservations.push(normalizeReservation({ ...data, id: doc.id }));
      }
    });
    
    // Ordenar por checkIn
    reservations.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    
    logger.debug('reservations.getAllReservations.loaded', { count: reservations.length });
  } catch (error) {
    logger.warn('reservations.getAllReservations.error', { error: String(error) });
  }
  
  logger.timeEnd('reservations.getAllReservations');
  return reservations;
};
```

---

## Plan de Implementacion Recomendado

### Paso 1: Verificar estado actual de Firebase
- Revisar la herramienta de migracion en Dashboard para ver cuantas reservas hay en cada coleccion

### Paso 2: Restaurar lectura dual temporalmente
- Editar `src/lib/reservations.ts` para leer de ambas colecciones
- Esto garantiza que veas todas las reservas inmediatamente

### Paso 3: Ejecutar migracion cuando estes listo
- Usar la herramienta de migracion para consolidar datos
- Marcar opcion para eliminar datos de coleccion legacy

### Paso 4: Limpiar codigo (despues de migrar)
- Eliminar lectura de `reservations` de todos los archivos:
  - `src/hooks/usePublicAvailability.ts`
  - `src/lib/publicAvailability.ts`
  - `public/widget-vanilla/index-manuara-integrado.html`

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/lib/reservations.ts` | Restaurar lectura dual en `getAllReservations()` |

---

## Riesgo de Eliminacion Masiva

**No hay riesgo de eliminacion masiva.** El codigo actual:
- Solo **lee** de la coleccion `reservas`
- Las funciones de eliminacion (`deleteReservation`) solo afectan documentos individuales por ID
- Los datos en `reservations` (legacy) estan intactos, simplemente no se estan leyendo

Para confirmar, puedes verificar en la consola de Firebase cuantos documentos hay en cada coleccion.

