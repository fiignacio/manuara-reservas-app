

# Plan: Crear Documentacion Completa del Proyecto

## Objetivo

Crear un archivo de documentacion tecnica y funcional completo llamado `DOCUMENTATION.md` en la raiz del proyecto, que describa todos los aspectos de la aplicacion Manuara Reservas.

---

## Contenido del Archivo de Documentacion

### 1. Informacion General

| Campo | Valor |
|-------|-------|
| Nombre | Manuara Reservas |
| Proposito | Sistema de gestion de reservas de hospedaje para cabanas en Rapa Nui |
| Usuario principal | Administrador unico |
| Tipo de aplicacion | Progressive Web App (PWA) |

---

### 2. Stack Tecnologico

```text
Frontend
+------------------+
| React 18.3       |
| TypeScript       |
| Vite             |
| Tailwind CSS     |
| shadcn/ui        |
+------------------+

Backend/Datos
+------------------+
| Firebase         |
|  - Firestore     |
|  - Auth          |
+------------------+

Librerias Principales
+------------------+
| TanStack Query   | Fetching y cache de datos
| React Router     | Navegacion SPA
| Lucide React     | Iconos
| Recharts         | Graficos
| date-fns         | Manipulacion de fechas
| Zod              | Validacion de esquemas
| jsPDF            | Generacion de PDFs
| PapaParse        | Exportacion CSV
+------------------+
```

---

### 3. Arquitectura de la Aplicacion

```text
src/
+-- App.tsx                 # Punto de entrada, rutas
+-- main.tsx                # Bootstrap y Service Worker
+-- components/
|   +-- ui/                 # Componentes reutilizables (shadcn)
|   +-- analytics/          # Graficos y tablas de analiticas
|   +-- mobile/             # Componentes optimizados para movil
|   +-- public/             # Widget de disponibilidad publica
|   +-- Layout.tsx          # Navegacion principal
|   +-- ReservationModal.tsx# Modal de crear/editar reserva
|   +-- PaymentModal.tsx    # Registro de pagos
|   +-- CheckInOutModal.tsx # Control de check-in/out
+-- pages/
|   +-- Dashboard.tsx       # Resumen diario
|   +-- Calendar.tsx        # Vista calendario
|   +-- Reservations.tsx    # Lista de reservas
|   +-- Analytics.tsx       # Estadisticas
|   +-- Reports.tsx         # Reportes exportables
|   +-- Admin.tsx           # Configuracion del sistema
|   +-- Install.tsx         # Guia de instalacion PWA
+-- hooks/
|   +-- useReservations.ts  # React Query para reservas
|   +-- useOfflineReservations.ts # Datos con soporte offline
|   +-- useOfflineSync.ts   # Sincronizacion automatica
|   +-- usePWAInstall.ts    # Instalacion PWA
+-- lib/
|   +-- firebase.ts         # Configuracion Firebase
|   +-- reservations.ts     # CRUD de reservas
|   +-- pricing.ts          # Calculo de precios
|   +-- availability.ts     # Verificacion disponibilidad
|   +-- offlineCache.ts     # Cache localStorage
|   +-- offlineQueue.ts     # Cola de operaciones pendientes
|   +-- logger.ts           # Sistema de logging
|   +-- adminConfig.ts      # Configuracion dinamica
+-- types/
|   +-- reservation.ts      # Interfaces de reserva
|   +-- payment.ts          # Interfaces de pago
```

---

### 4. Modelo de Datos

#### Reserva (Reservation)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | string | ID unico de Firestore |
| passengerName | string | Nombre del huesped principal |
| phone | string | Telefono de contacto |
| email | string? | Correo electronico |
| checkIn | string | Fecha entrada (YYYY-MM-DD) |
| checkOut | string | Fecha salida (YYYY-MM-DD) |
| adults | number | Cantidad de adultos |
| children | number | Cantidad de ninos |
| babies | number | Cantidad de bebes |
| season | Alta/Baja | Temporada |
| cabinType | string | Tipo de cabana |
| arrivalFlight | LA841/LA843 | Vuelo de llegada |
| departureFlight | LA842/LA844 | Vuelo de salida |
| totalPrice | number | Precio total en CLP |
| payments | Payment[] | Historial de pagos |
| remainingBalance | number | Saldo pendiente |
| paymentStatus | enum | Estado del pago |
| reservationStatus | enum | Estado de la reserva |
| checkInStatus | enum | Estado check-in |
| checkOutStatus | enum | Estado check-out |

#### Pago (Payment)

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | string | ID unico |
| amount | number | Monto en CLP |
| paymentDate | string | Fecha del pago |
| method | enum | cash/transfer/credit_card/other |
| notes | string? | Notas adicionales |

---

### 5. Cabanas Disponibles

| Cabana | Capacidad Maxima | Color UI |
|--------|------------------|----------|
| Cabana Pequena | 3 personas | Azul |
| Cabana Mediana 1 | 4 personas | Morado |
| Cabana Mediana 2 | 4 personas | Ambar |
| Cabana Grande | 6 personas | Rosa |

---

### 6. Funcionalidades Principales

**Gestion de Reservas**
- Crear, editar y eliminar reservas
- Validacion automatica de disponibilidad
- Calculo automatico de precios por temporada
- Deteccion de conflictos de recambio (salida + llegada mismo dia)

**Sistema de Pagos**
- Registro de multiples pagos parciales
- Calculo automatico de saldo pendiente
- Estados: pendiente, deposito realizado, pagado

**Check-in/Check-out**
- Registro de hora real de entrada/salida
- Notas adicionales por operacion
- Estados automaticos de la reserva

**Dashboard**
- Llegadas y salidas del dia
- Alertas de conflictos
- Proximas 5 salidas
- Metricas de ocupacion

**Calendario**
- Vista mensual con todas las reservas
- Linea de tiempo por cabana
- Navegacion rapida entre meses

**Analiticas**
- Ingresos totales
- Tasa de ocupacion
- Estadisticas por cabana
- Comparacion por temporada

**Reportes**
- Exportacion a CSV y PDF
- Filtros por rango de fechas
- Agrupacion por cabanas

---

### 7. Sistema Offline (PWA)

```text
+------------------------+
| Usuario realiza accion |
+------------------------+
         |
         v
+------------------------+
| Esta online?           |
+---+----------------+---+
    |                |
   SI               NO
    |                |
    v                v
+--------+    +----------------+
| Enviar |    | Guardar en     |
| a      |    | localStorage   |
| Firebase|   | + agregar a    |
+--------+    | cola pendiente |
              +----------------+
                     |
         (cuando vuelve online)
                     |
                     v
              +----------------+
              | Sincronizar    |
              | operaciones    |
              | pendientes     |
              +----------------+
```

**Componentes del Sistema Offline:**
- `offlineCache.ts`: Cache de reservas en localStorage
- `offlineQueue.ts`: Cola de operaciones pendientes
- `useOfflineSync.ts`: Hook de sincronizacion automatica
- `sw.js`: Service Worker con estrategias de cache

---

### 8. Service Worker

**Estrategias de Cache:**
- **Static Assets**: Cache First (JS, CSS, fuentes)
- **Images**: Cache First con limite de 30 items
- **Navigation**: Network First con fallback a cache
- **API calls**: Sin cache (Firebase maneja su propia cache)

**Versionado:** CACHE_VERSION = 'v2'

---

### 9. Sistema de Logging

**Caracteristicas:**
- Niveles: debug, info, warn, error
- Sanitizacion de datos sensibles (email, telefono, RUT)
- Buffer en memoria de 2000 entradas
- Descarga como archivo JSON
- Acceso global via `window.__APP_LOGS__`

**Datos Protegidos:**
- Emails enmascarados: `u***@domain.com`
- Telefonos enmascarados: `+569****5678`
- RUT enmascarado: `12****-9`

---

### 10. Configuracion Dinamica (Panel Admin)

El panel de administracion permite modificar:
- Nombres y capacidades de cabanas
- Colores de la UI por cabana
- Precios por temporada (adultos alta/baja, ninos, bebes)
- Periodos de temporada alta

La configuracion se guarda en localStorage con versionado para migraciones futuras.

---

### 11. Estructura de Rutas

| Ruta | Pagina | Layout |
|------|--------|--------|
| / | Dashboard | Si |
| /calendar | Calendario | Si |
| /reservations | Lista Reservas | Si |
| /analytics | Analiticas | Si |
| /reports | Reportes | Si |
| /admin | Configuracion | Si |
| /install | Guia PWA | No |
| /widget-demo | Demo Widget | No |

---

### 12. Integracion con Sitio Externo

**Widget de Disponibilidad Publica:**
- Ubicado en `public/widget-vanilla/`
- Consulta disponibilidad en tiempo real
- No requiere autenticacion
- Puede integrarse en cualquier sitio web

**Coleccion de Solicitudes:**
- Firestore: `solicitudes_reserva`
- Permite recibir solicitudes desde sitio externo

---

### 13. Base de Datos (Firebase Firestore)

**Proyecto:** gestion-reservas-manuara

**Colecciones:**
- `reservas`: Almacena todas las reservas

**Reglas de Seguridad:** Acceso publico (desarrollo/interno)

**Optimizaciones:**
- experimentalAutoDetectLongPolling habilitado
- Indices compuestos para queries de calendario

---

### 14. Requisitos del Sistema

**Para Desarrollo:**
- Node.js 18+
- npm o bun
- Navegador moderno

**Para Usuarios:**
- Navegador Chrome, Safari, Firefox o Edge
- Conexion a internet (funciona offline con datos cacheados)

---

### 15. Scripts Disponibles

```text
npm run dev      # Servidor de desarrollo
npm run build    # Compilar para produccion
npm run preview  # Vista previa de build
npm run lint     # Verificar codigo
```

---

### 16. Variables de Entorno

El proyecto usa configuracion de Firebase embebida en codigo (proyecto interno sin datos sensibles expuestos).

---

## Archivo a Crear

| Archivo | Descripcion |
|---------|-------------|
| `DOCUMENTATION.md` | Documentacion completa del proyecto |

El archivo incluira todas las secciones detalladas arriba en formato Markdown legible, con diagramas ASCII, tablas y ejemplos de codigo cuando sea necesario.

