# Manuara Reservas - Documentación Técnica Completa

## Índice

1. [Información General](#1-información-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura de la Aplicación](#3-arquitectura-de-la-aplicación)
4. [Modelo de Datos](#4-modelo-de-datos)
5. [Cabañas Disponibles](#5-cabañas-disponibles)
6. [Funcionalidades Principales](#6-funcionalidades-principales)
7. [Sistema Offline (PWA)](#7-sistema-offline-pwa)
8. [Service Worker](#8-service-worker)
9. [Sistema de Logging](#9-sistema-de-logging)
10. [Configuración Dinámica](#10-configuración-dinámica-panel-admin)
11. [Estructura de Rutas](#11-estructura-de-rutas)
12. [Integración con Sitio Externo](#12-integración-con-sitio-externo)
13. [Base de Datos](#13-base-de-datos-firebase-firestore)
14. [Requisitos del Sistema](#14-requisitos-del-sistema)
15. [Scripts Disponibles](#15-scripts-disponibles)
16. [Variables de Entorno](#16-variables-de-entorno)

---

## 1. Información General

| Campo | Valor |
|-------|-------|
| **Nombre** | Manuara Reservas |
| **Propósito** | Sistema de gestión de reservas de hospedaje para cabañas en Rapa Nui (Isla de Pascua) |
| **Usuario principal** | Administrador único |
| **Tipo de aplicación** | Progressive Web App (PWA) |
| **Idioma** | Español (Chile) |
| **Moneda** | Peso Chileno (CLP) |

### Descripción

Manuara Reservas es una aplicación web progresiva diseñada para gestionar las reservas de un conjunto de cabañas turísticas en Rapa Nui. Permite al administrador:

- Gestionar reservas completas con información de huéspedes
- Controlar pagos parciales y totales
- Realizar check-in y check-out
- Visualizar disponibilidad en calendario
- Generar reportes y estadísticas
- Trabajar sin conexión a internet

---

## 2. Stack Tecnológico

### Frontend

```
┌──────────────────────────────────────┐
│           FRONTEND STACK             │
├──────────────────────────────────────┤
│  React 18.3      │ Librería UI       │
│  TypeScript      │ Tipado estático   │
│  Vite            │ Build tool        │
│  Tailwind CSS    │ Estilos utility   │
│  shadcn/ui       │ Componentes UI    │
└──────────────────────────────────────┘
```

### Backend / Datos

```
┌──────────────────────────────────────┐
│          BACKEND / DATOS             │
├──────────────────────────────────────┤
│  Firebase                            │
│  ├── Firestore   │ Base de datos    │
│  └── Auth        │ Autenticación    │
└──────────────────────────────────────┘
```

### Librerías Principales

| Librería | Versión | Propósito |
|----------|---------|-----------|
| `@tanstack/react-query` | ^5.56.2 | Fetching y cache de datos |
| `react-router-dom` | ^6.26.2 | Navegación SPA |
| `lucide-react` | ^0.462.0 | Iconos vectoriales |
| `recharts` | ^2.12.7 | Gráficos y visualizaciones |
| `date-fns` | ^3.6.0 | Manipulación de fechas |
| `zod` | ^3.23.8 | Validación de esquemas |
| `jspdf` | ^3.0.1 | Generación de PDFs |
| `papaparse` | ^5.5.3 | Exportación CSV |
| `firebase` | ^12.1.0 | SDK de Firebase |
| `react-hook-form` | ^7.53.0 | Manejo de formularios |
| `sonner` | ^1.5.0 | Notificaciones toast |

---

## 3. Arquitectura de la Aplicación

### Estructura de Directorios

```
src/
├── App.tsx                      # Punto de entrada, configuración de rutas
├── main.tsx                     # Bootstrap, registro de Service Worker
├── index.css                    # Estilos globales y variables CSS
│
├── components/
│   ├── ui/                      # Componentes reutilizables (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   └── ... (40+ componentes)
│   │
│   ├── analytics/               # Componentes de analíticas
│   │   ├── CabinPerformanceTable.tsx
│   │   ├── OccupancyChart.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── SeasonComparisonChart.tsx
│   │   └── StatsCard.tsx
│   │
│   ├── mobile/                  # Componentes optimizados para móvil
│   │   └── ReservationCard.tsx
│   │
│   ├── public/                  # Widget de disponibilidad pública
│   │   ├── AvailabilityWidget.tsx
│   │   ├── AvailabilityLegend.tsx
│   │   ├── CabinSelector.tsx
│   │   ├── types.ts
│   │   └── index.ts
│   │
│   ├── Layout.tsx               # Navegación principal y estructura
│   ├── ReservationModal.tsx     # Modal para crear/editar reservas
│   ├── PaymentModal.tsx         # Modal para registrar pagos
│   ├── CheckInOutModal.tsx      # Modal para check-in/check-out
│   ├── GuestInfoModal.tsx       # Modal de información de huéspedes
│   ├── ConfirmationModal.tsx    # Modal de confirmación de reserva
│   ├── StatusManager.tsx        # Gestión de estados de reserva
│   ├── TimelineCalendar.tsx     # Calendario tipo línea de tiempo
│   ├── CabinAvailabilityMatrix.tsx  # Matriz de disponibilidad
│   ├── AvailabilityCard.tsx     # Tarjeta de disponibilidad
│   ├── OfflineIndicator.tsx     # Indicador de conexión
│   └── InstallPrompt.tsx        # Prompt de instalación PWA
│
├── pages/
│   ├── Dashboard.tsx            # Resumen diario y alertas
│   ├── Calendar.tsx             # Vista de calendario mensual
│   ├── Reservations.tsx         # Lista completa de reservas
│   ├── Analytics.tsx            # Estadísticas y métricas
│   ├── Reports.tsx              # Generación de reportes
│   ├── Admin.tsx                # Panel de configuración
│   ├── Install.tsx              # Guía de instalación PWA
│   ├── WidgetDemo.tsx           # Demo del widget público
│   └── NotFound.tsx             # Página 404
│
├── hooks/
│   ├── useReservations.ts       # React Query para reservas
│   ├── useOfflineReservations.ts # Datos con soporte offline
│   ├── useOfflineSync.ts        # Sincronización automática
│   ├── usePWAInstall.ts         # Lógica de instalación PWA
│   ├── usePublicAvailability.ts # Disponibilidad en tiempo real
│   ├── useDateSelection.ts      # Selección de fechas
│   └── use-mobile.tsx           # Detección de dispositivo móvil
│
├── lib/
│   ├── firebase.ts              # Configuración de Firebase
│   ├── reservations.ts          # CRUD de reservas
│   ├── reservationService.ts    # Barrel export de servicios
│   ├── pricing.ts               # Cálculo de precios
│   ├── availability.ts          # Verificación de disponibilidad
│   ├── availabilityHelpers.ts   # Helpers de disponibilidad
│   ├── publicAvailability.ts    # Disponibilidad pública
│   ├── validation.ts            # Validación de datos
│   ├── payments.ts              # Gestión de pagos
│   ├── checkInOut.ts            # Lógica de check-in/out
│   ├── dateUtils.ts             # Utilidades de fechas
│   ├── cabinConfig.ts           # Configuración de cabañas
│   ├── adminConfig.ts           # Configuración dinámica
│   ├── offlineCache.ts          # Cache en localStorage
│   ├── offlineQueue.ts          # Cola de operaciones pendientes
│   ├── logger.ts                # Sistema de logging
│   ├── analyticsService.ts      # Servicios de analíticas
│   ├── reportsService.ts        # Servicios de reportes
│   └── utils.ts                 # Utilidades generales (cn, etc.)
│
├── types/
│   ├── reservation.ts           # Interfaces de reserva
│   └── payment.ts               # Interfaces de pago
│
└── integrations/
    └── supabase/                # (Legacy, no utilizado activamente)
        ├── client.ts
        └── types.ts
```

### Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPONENTES UI                              │
│  (ReservationModal, PaymentModal, Calendar, Dashboard, etc.)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HOOKS (useReservations)                       │
│          React Query + Offline Support + Cache                   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────┐         ┌──────────────────────┐
│   SERVICIOS (lib/)   │         │   OFFLINE QUEUE      │
│  - reservations.ts   │         │  - offlineQueue.ts   │
│  - pricing.ts        │         │  - offlineCache.ts   │
│  - availability.ts   │         └──────────────────────┘
└──────────────────────┘                    │
              │                             │
              ▼                             │
┌──────────────────────┐                    │
│   FIREBASE           │◄───────────────────┘
│   - Firestore        │    (sincronización)
│   - Auth             │
└──────────────────────┘
```

---

## 4. Modelo de Datos

### Reserva (Reservation)

```typescript
interface Reservation {
  // Identificación
  id?: string;                    // ID único de Firestore

  // Información del huésped
  passengerName: string;          // Nombre del huésped principal
  phone: string;                  // Teléfono de contacto
  email?: string;                 // Correo electrónico (opcional)

  // Fechas
  checkIn: string;                // Fecha de entrada (YYYY-MM-DD)
  checkOut: string;               // Fecha de salida (YYYY-MM-DD)

  // Ocupación
  adults: number;                 // Cantidad de adultos
  children: number;               // Cantidad de niños
  babies: number;                 // Cantidad de bebés

  // Alojamiento
  season: 'Alta' | 'Baja';        // Temporada
  cabinType: CabinType;           // Tipo de cabaña

  // Vuelos (opcionales, conexiones desde/hacia Santiago)
  arrivalFlight: 'LA841' | 'LA843' | '';
  departureFlight: 'LA842' | 'LA844' | '';

  // Precios y pagos
  totalPrice: number;             // Precio total en CLP
  useCustomPrice: boolean;        // Usar precio personalizado
  customPrice?: number;           // Precio personalizado
  payments: Payment[];            // Historial de pagos
  remainingBalance: number;       // Saldo pendiente

  // Estados
  paymentStatus: PaymentStatus;
  reservationStatus: ReservationStatusType;
  checkInStatus: 'pending' | 'checked_in' | 'no_show';
  checkOutStatus: 'pending' | 'checked_out' | 'late_checkout';

  // Check-in/out real
  actualCheckIn?: string;         // Fecha/hora real de check-in
  actualCheckOut?: string;        // Fecha/hora real de check-out
  checkInNotes?: string;          // Notas de check-in
  checkOutNotes?: string;         // Notas de check-out

  // Confirmación
  confirmationSent: boolean;
  confirmationSentDate?: string;
  confirmationMethod?: 'email' | 'whatsapp' | 'manual';

  // Información adicional de huéspedes
  guestRuts?: string[];           // RUTs de todos los huéspedes
  guestNames?: string[];          // Nombres de todos los huéspedes
  customerEmail?: string;
  customerPhone?: string;
  transferInfo?: string;          // Información de transfer
  sernateurCode?: string;         // Código SERNATUR

  // Metadatos
  createdAt?: Date;
  updatedAt?: Date;

  // Origen
  reservationSource?: 'manual' | 'web' | 'booking' | 'airbnb';
  agency?: string;
  depositAmount?: number;
  pendingBalance?: number;
  comments?: string;
}
```

### Estados de Pago (PaymentStatus)

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Sin pagos registrados |
| `pending_deposit` | Esperando depósito inicial |
| `pending_payment` | Depósito recibido, falta pago final |
| `deposit_made` | Depósito realizado |
| `fully_paid` | Totalmente pagado |
| `overdue` | Pago atrasado |

### Estados de Reserva (ReservationStatusType)

| Estado | Descripción |
|--------|-------------|
| `confirmada` | Reserva confirmada |
| `pending_checkin` | Esperando check-in |
| `in_stay` | Huésped alojado |
| `checked_out` | Check-out realizado |
| `departed` | Huésped partió |
| `cancelled` | Reserva cancelada |

### Pago (Payment)

```typescript
interface Payment {
  id: string;                     // ID único
  amount: number;                 // Monto en CLP
  paymentDate: string;            // Fecha del pago (ISO)
  method: 'cash' | 'transfer' | 'credit_card' | 'other';
  notes?: string;                 // Notas adicionales
  createdBy: string;              // Quién registró el pago
  createdAt: Date;
}
```

---

## 5. Cabañas Disponibles

### Configuración por Defecto

| Cabaña | ID | Capacidad Máxima | Color UI |
|--------|-----|------------------|----------|
| Cabaña Pequeña | small | 3 personas | Azul (#3B82F6) |
| Cabaña Mediana 1 | medium1 | 4 personas | Morado (#8B5CF6) |
| Cabaña Mediana 2 | medium2 | 4 personas | Ámbar (#F59E0B) |
| Cabaña Grande | large | 6 personas | Rosa (#EC4899) |

### Tipos de Cabaña (CabinType)

```typescript
type CabinType = 
  | 'Cabaña Pequeña (Max 3p)' 
  | 'Cabaña Mediana 1 (Max 4p)' 
  | 'Cabaña Mediana 2 (Max 4p)' 
  | 'Cabaña Grande (Max 6p)';
```

### Configuración Dinámica

La configuración de cabañas puede modificarse desde el Panel de Administración (`/admin`), incluyendo:

- Nombre de visualización
- Capacidad máxima
- Color en la interfaz
- Orden de visualización

---

## 6. Funcionalidades Principales

### 6.1 Gestión de Reservas

**Crear Reserva:**
1. Seleccionar fechas de check-in y check-out
2. Elegir cabaña disponible
3. Ingresar datos del huésped
4. Especificar cantidad de adultos, niños y bebés
5. El sistema calcula automáticamente el precio
6. Opcionalmente usar precio personalizado

**Validaciones automáticas:**
- Disponibilidad de la cabaña
- Capacidad máxima de la cabaña
- Fechas válidas (check-out > check-in)
- Detección de conflictos de recambio

**Editar Reserva:**
- Modificar cualquier campo
- Recálculo automático de precio
- Verificación de disponibilidad

**Eliminar Reserva:**
- Confirmación requerida
- Eliminación de todos los pagos asociados

### 6.2 Sistema de Pagos

```
┌────────────────────────────────────────────┐
│             FLUJO DE PAGOS                 │
├────────────────────────────────────────────┤
│                                            │
│   ┌─────────────┐                          │
│   │ Sin pagos   │ ──► pending_deposit      │
│   └─────────────┘                          │
│         │                                  │
│         ▼                                  │
│   ┌─────────────┐                          │
│   │ Depósito    │ ──► deposit_made         │
│   │ recibido    │                          │
│   └─────────────┘                          │
│         │                                  │
│         ▼                                  │
│   ┌─────────────┐                          │
│   │ Pago total  │ ──► fully_paid           │
│   │ completo    │                          │
│   └─────────────┘                          │
│                                            │
└────────────────────────────────────────────┘
```

**Características:**
- Múltiples pagos parciales por reserva
- Métodos: Efectivo, Transferencia, Tarjeta de crédito, Otro
- Cálculo automático de saldo pendiente
- Historial completo de pagos

### 6.3 Check-in / Check-out

**Check-in:**
- Registro de hora real de llegada
- Notas adicionales (ej: "Llegó con mascotas")
- Cambio automático de estado a `in_stay`

**Check-out:**
- Registro de hora real de salida
- Notas adicionales (ej: "Todo en orden")
- Cambio automático de estado a `checked_out`

### 6.4 Dashboard

El dashboard muestra información crítica del día actual:

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ LLEGADAS HOY │  │ SALIDAS HOY  │  │  ALERTAS     │   │
│  │      2       │  │      1       │  │      3       │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              PRÓXIMAS 5 SALIDAS                  │    │
│  │  • Juan Pérez     │ 15/02 │ Cabaña Grande       │    │
│  │  • María López    │ 16/02 │ Cabaña Mediana 1    │    │
│  │  • ...                                           │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              CONFLICTOS DE RECAMBIO              │    │
│  │  ⚠ Cabaña Pequeña: Salida 14:00 / Llegada 15:00 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Calendario

**Vista Mensual:**
- Todas las reservas en formato calendario
- Colores por cabaña
- Navegación entre meses
- Click para ver detalles

**Línea de Tiempo:**
- Vista horizontal por cabaña
- Visualización de ocupación
- Identificación rápida de disponibilidad

### 6.6 Analíticas

| Métrica | Descripción |
|---------|-------------|
| Ingresos Totales | Suma de todos los pagos recibidos |
| Tasa de Ocupación | Porcentaje de noches ocupadas |
| Estadísticas por Cabaña | Ingresos y ocupación por cabaña |
| Comparación por Temporada | Alta vs Baja temporada |
| Promedio de Estadía | Días promedio por reserva |
| Huéspedes Totales | Adultos, niños y bebés |

### 6.7 Reportes

**Formatos de Exportación:**
- CSV (compatible con Excel)
- PDF (generado con jsPDF)

**Filtros Disponibles:**
- Rango de fechas
- Cabaña específica
- Estado de reserva
- Estado de pago

**Tipos de Agrupación:**
- Por cabaña individual
- Por grupo de cabañas (ej: todas las medianas)
- Reporte general

---

## 7. Sistema Offline (PWA)

### Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│                    ACCIÓN DEL USUARIO                        │
│              (Crear/Editar/Eliminar Reserva)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  ¿Está online?  │
                    └─────────────────┘
                      │           │
                     SÍ          NO
                      │           │
                      ▼           ▼
            ┌──────────────┐  ┌──────────────────────────┐
            │   Enviar a   │  │  1. Guardar en           │
            │   Firebase   │  │     localStorage         │
            │              │  │  2. Agregar a cola       │
            └──────────────┘  │     de operaciones       │
                   │          │     pendientes           │
                   ▼          └──────────────────────────┘
            ┌──────────────┐              │
            │  Actualizar  │              │
            │    cache     │              │
            └──────────────┘              │
                                          │
                          (Cuando vuelve la conexión)
                                          │
                                          ▼
                              ┌──────────────────────────┐
                              │    SINCRONIZACIÓN        │
                              │  - Procesar cola         │
                              │  - Reintentar fallidos   │
                              │  - Actualizar cache      │
                              └──────────────────────────┘
```

### Componentes del Sistema

#### offlineCache.ts

```typescript
// Funciones principales
saveReservationsToCache(reservations: Reservation[]): void
getReservationsFromCache(): Reservation[] | null
clearReservationsCache(): void
getCacheTimestamp(): number | null
```

**Almacenamiento:**
- Key: `manuara_reservations_cache`
- Formato: JSON con timestamp

#### offlineQueue.ts

```typescript
interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retryCount: number;
}

// Funciones principales
addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp' | 'retryCount'>): void
getPendingOperations(): PendingOperation[]
removePendingOperation(id: string): void
clearPendingOperations(): void
```

#### useOfflineSync.ts

```typescript
function useOfflineSync() {
  // Detecta cambios de conectividad
  // Sincroniza operaciones pendientes automáticamente
  // Invalida cache de React Query tras sincronización
}
```

---

## 8. Service Worker

### Ubicación

`public/sw.js`

### Estrategias de Cache

| Tipo de Recurso | Estrategia | Descripción |
|-----------------|------------|-------------|
| Static Assets (JS, CSS) | Cache First | Sirve desde cache, actualiza en background |
| Fuentes | Cache First | Google Fonts cacheadas localmente |
| Imágenes | Cache First | Límite de 30 items, LRU eviction |
| Navegación (HTML) | Network First | Intenta red primero, fallback a cache |
| API calls | No cache | Firebase maneja su propia cache |

### Versionado

```javascript
const CACHE_VERSION = 'v2';
const CACHE_NAME = `manuara-cache-${CACHE_VERSION}`;
```

### Actualización Automática

- El Service Worker verifica actualizaciones cada hora
- Cuando detecta una nueva versión, notifica al usuario
- El usuario puede recargar para aplicar la actualización

### Registro

```javascript
// En main.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## 9. Sistema de Logging

### Ubicación

`src/lib/logger.ts`

### Niveles de Log

| Nivel | Uso |
|-------|-----|
| `debug` | Información detallada para desarrollo |
| `info` | Eventos normales de la aplicación |
| `warn` | Situaciones potencialmente problemáticas |
| `error` | Errores que afectan la funcionalidad |

### Características

**Sanitización de Datos Sensibles:**
```javascript
// Antes de loguear, se enmascaran:
email: "usuario@email.com" → "u***@email.com"
phone: "+56912345678"      → "+569****5678"
rut:   "12.345.678-9"      → "12****-9"
```

**Buffer en Memoria:**
- Capacidad: 2000 entradas
- FIFO: Los más antiguos se eliminan primero

**Acceso Global:**
```javascript
// En la consola del navegador:
window.__APP_LOGS__              // Ver todos los logs
window.__downloadLogs__()        // Descargar como JSON
```

### Uso

```typescript
import { logger } from './lib/logger';

// Ejemplos
logger.info('reservations.create.success', { id: '123' });
logger.error('reservations.create.error', { error: 'message' });
logger.time('operation');
// ... operación ...
logger.timeEnd('operation');
```

---

## 10. Configuración Dinámica (Panel Admin)

### Ubicación

- Página: `src/pages/Admin.tsx`
- Lógica: `src/lib/adminConfig.ts`

### Elementos Configurables

#### Cabañas

| Campo | Descripción |
|-------|-------------|
| Nombre interno | Identificador único |
| Nombre de visualización | Nombre mostrado en UI |
| Capacidad máxima | Límite de huéspedes |
| Color | Color en calendario y reportes |
| Orden | Posición en listas |

#### Precios por Temporada

| Configuración | Descripción |
|---------------|-------------|
| Precio adulto (Alta) | Precio por noche en temporada alta |
| Precio adulto (Baja) | Precio por noche en temporada baja |
| Precio niño | Precio por noche (niños) |
| Precio bebé | Generalmente $0 |

#### Períodos de Temporada

- Definición de fechas de temporada alta
- El resto del año es temporada baja

### Persistencia

- Almacenamiento: `localStorage`
- Key: `manuara_admin_config`
- Versionado para migraciones futuras

---

## 11. Estructura de Rutas

| Ruta | Componente | Layout | Descripción |
|------|------------|--------|-------------|
| `/` | Dashboard | ✅ | Resumen diario |
| `/calendar` | Calendar | ✅ | Vista de calendario |
| `/reservations` | Reservations | ✅ | Lista de reservas |
| `/analytics` | Analytics | ✅ | Estadísticas |
| `/reports` | Reports | ✅ | Generación de reportes |
| `/admin` | Admin | ✅ | Configuración del sistema |
| `/install` | Install | ❌ | Guía de instalación PWA |
| `/widget-demo` | WidgetDemo | ❌ | Demo del widget público |
| `*` | NotFound | ❌ | Página 404 |

### Navegación Principal

```
┌─────────────────────────────────────────────────────────┐
│  [Logo] Manuara Reservas                    [Usuario]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📊 Dashboard  │  📅 Calendario  │  📋 Reservas         │
│                                                          │
│  📈 Analíticas │  📄 Reportes    │  ⚙️ Admin            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Navegación Móvil

En dispositivos móviles, la navegación se muestra como una barra inferior fija con 5 iconos principales.

---

## 12. Integración con Sitio Externo

### Widget de Disponibilidad Pública

**Ubicación:** `public/widget-vanilla/`

**Archivos:**
- `availabilityWidget.js` - Clase principal
- `cabinData.js` - Datos de cabañas
- `index-manuara-integrado.html` - Versión integrada
- `integration-example.html` - Ejemplo de integración

**Características:**
- Consulta disponibilidad en tiempo real
- No requiere autenticación
- Compatible con cualquier sitio web
- Versión React y Vanilla JS

### Integración Básica

```html
<!-- En cualquier sitio web -->
<div id="availability-widget"></div>
<script src="https://[tu-dominio]/widget-vanilla/availabilityWidget.js"></script>
<script>
  new AvailabilityWidget({
    container: '#availability-widget',
    firebaseConfig: { /* ... */ }
  });
</script>
```

### Solicitudes de Reserva

Las solicitudes externas se almacenan en:
- Colección: `solicitudes_reserva`
- Permiten recibir requests desde el sitio público

---

## 13. Base de Datos (Firebase Firestore)

### Proyecto

| Campo | Valor |
|-------|-------|
| Nombre | gestion-reservas-manuara |
| Región | us-central1 |

### Colecciones

| Colección | Descripción |
|-----------|-------------|
| `reservas` | Almacena todas las reservas |
| `solicitudes_reserva` | Solicitudes desde sitio externo |

### Estructura de Documento (reservas)

```javascript
{
  // Identificación automática por Firestore
  passengerName: "Juan Pérez",
  phone: "+56912345678",
  email: "juan@email.com",
  checkIn: "2024-03-15",
  checkOut: "2024-03-20",
  adults: 2,
  children: 1,
  babies: 0,
  season: "Alta",
  cabinType: "Cabaña Grande (Max 6p)",
  arrivalFlight: "LA841",
  departureFlight: "LA842",
  totalPrice: 450000,
  payments: [
    {
      id: "pay_1",
      amount: 100000,
      paymentDate: "2024-03-01",
      method: "transfer",
      createdBy: "admin"
    }
  ],
  remainingBalance: 350000,
  paymentStatus: "deposit_made",
  reservationStatus: "pending_checkin",
  checkInStatus: "pending",
  checkOutStatus: "pending",
  confirmationSent: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Reglas de Seguridad

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

> ⚠️ **Nota:** Estas reglas permiten acceso público. Adecuado para uso interno/desarrollo. Debe endurecerse antes de producción pública.

### Índices Requeridos

Ver `firebase-indexes.md` para la lista completa de índices compuestos necesarios.

### Optimizaciones

```typescript
// En firebase.ts
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});
```

---

## 14. Requisitos del Sistema

### Para Desarrollo

| Requisito | Versión Mínima |
|-----------|----------------|
| Node.js | 18.0+ |
| npm | 9.0+ |
| bun | 1.0+ (alternativa) |
| Git | 2.0+ |

### Para Usuarios

| Requisito | Detalle |
|-----------|---------|
| Navegador | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ |
| Conexión | Requerida para sincronización (funciona offline) |
| Dispositivos | Desktop, Tablet, Móvil (responsive) |

### PWA (Instalación)

| Plataforma | Soporte |
|------------|---------|
| Android | ✅ Instalación desde Chrome |
| iOS | ✅ Agregar a pantalla de inicio desde Safari |
| Windows | ✅ Instalación desde Edge/Chrome |
| macOS | ✅ Instalación desde Chrome |

---

## 15. Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Inicia servidor de desarrollo en http://localhost:5173

# Producción
npm run build        # Compila para producción en /dist
npm run preview      # Vista previa del build de producción

# Calidad de código
npm run lint         # Ejecuta ESLint para verificar código
```

### Estructura del Build

```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [chunks]-[hash].js
├── sw.js
├── manifest.json
├── icons/
│   ├── icon-192x192.png
│   └── icon-512x512.png
└── widget-vanilla/
    └── [archivos del widget]
```

---

## 16. Variables de Entorno

### Configuración de Firebase

La configuración de Firebase está embebida directamente en el código (`src/lib/firebase.ts`) dado que:

1. Es un proyecto interno sin datos sensibles públicos
2. Las reglas de Firestore controlan el acceso
3. Simplifica el despliegue

```typescript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "gestion-reservas-manuara.firebaseapp.com",
  projectId: "gestion-reservas-manuara",
  storageBucket: "gestion-reservas-manuara.firebasestorage.app",
  messagingSenderId: "977714534745",
  appId: "1:977714534745:web:..."
};
```

### Archivo .env

El proyecto incluye un archivo `.env` para posibles expansiones futuras, pero actualmente no se utiliza para la configuración de Firebase.

---

## Apéndice A: Resolución de Problemas Comunes

### Error: "Cannot read properties of null (reading 'useState')"

**Causa:** Múltiples instancias de React cargadas simultáneamente.

**Solución:** El archivo `vite.config.ts` incluye configuración de deduplicación:

```typescript
resolve: {
  dedupe: ['react', 'react-dom', 'react/jsx-runtime'],
  alias: {
    'react': path.resolve(__dirname, 'node_modules/react'),
    'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
  }
}
```

### Error: Datos no se sincronizan

1. Verificar conexión a internet
2. Revisar consola para errores de Firebase
3. Verificar reglas de Firestore
4. Revisar cola de operaciones pendientes en localStorage

### PWA no se actualiza

1. Cerrar todas las pestañas de la aplicación
2. Limpiar cache del navegador
3. Recargar la página
4. Verificar versión del Service Worker

---

## Apéndice B: Flujo de Desarrollo

### Agregar Nueva Funcionalidad

1. Crear tipos en `src/types/`
2. Crear servicio en `src/lib/`
3. Crear hook en `src/hooks/`
4. Crear componentes en `src/components/`
5. Integrar en página existente o crear nueva en `src/pages/`
6. Agregar ruta en `src/App.tsx` si es necesario

### Modificar Modelo de Datos

1. Actualizar interfaces en `src/types/`
2. Actualizar servicios afectados en `src/lib/`
3. Actualizar componentes que usan los datos
4. Considerar migración de datos existentes

---

## Apéndice C: Contacto y Soporte

Para consultas técnicas sobre este proyecto, revisar:

- Código fuente en el repositorio
- Documentación de Firebase: https://firebase.google.com/docs
- Documentación de React: https://react.dev
- Documentación de shadcn/ui: https://ui.shadcn.com

---

*Documentación generada para Manuara Reservas v1.0*
*Última actualización: Febrero 2025*
