# Widget de Disponibilidad - Cabañas Manuara

Widget en JavaScript Vanilla para mostrar disponibilidad de cabañas en tiempo real usando Firebase.

## Instalación en WebCabanasManuara

### 1. Copiar archivos

Copia estos archivos a tu carpeta `js/`:

```
js/
├── availabilityWidget.js
└── cabinData.js
```

### 2. Agregar HTML en index.html

Agrega esta sección donde quieras mostrar el widget (ej: en la sección de cotización):

```html
<!-- Sección de Disponibilidad -->
<section id="disponibilidad" class="py-20 bg-gray-50">
  <div class="container mx-auto px-4">
    <div class="text-center mb-12">
      <h2 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
        Consulta Disponibilidad
      </h2>
      <p class="text-gray-600 max-w-2xl mx-auto">
        Selecciona tus fechas para ver las cabañas disponibles en tiempo real
      </p>
    </div>
    
    <!-- Contenedor del widget -->
    <div id="availability-widget" class="max-w-lg mx-auto"></div>
    
    <!-- Formulario de solicitud (se muestra después de seleccionar) -->
    <div id="booking-request-form" class="hidden max-w-lg mx-auto mt-8">
      <!-- Tu formulario de contacto aquí -->
    </div>
  </div>
</section>
```

### 3. Inicializar el widget

Agrega esto en tu bloque `<script type="module">` después de inicializar Firebase:

```javascript
import { AvailabilityWidget } from './js/availabilityWidget.js';

// Exponer las funciones de Firestore globalmente para el widget
window.firebaseFirestore = {
  collection: collection,
  onSnapshot: onSnapshot,
  query: query
};

// Inicializar el widget
const widget = new AvailabilityWidget('availability-widget', {
  maxMonthsAhead: 6,
  showLegend: true,
  
  // Callback cuando se seleccionan fechas
  onDateSelect: (checkIn, checkOut) => {
    console.log('Fechas seleccionadas:', checkIn, checkOut);
    // Mostrar formulario de solicitud
    document.getElementById('booking-request-form').classList.remove('hidden');
  },
  
  // Callback cuando se selecciona una cabaña
  onCabinSelect: (cabin, checkIn, checkOut) => {
    console.log('Cabaña seleccionada:', cabin.displayName);
    console.log('Fechas:', checkIn, 'a', checkOut);
    
    // Prellenar formulario
    const form = document.getElementById('booking-request-form');
    form.classList.remove('hidden');
    
    // Si tienes inputs en tu formulario:
    // document.getElementById('fecha-llegada').value = checkIn;
    // document.getElementById('fecha-salida').value = checkOut;
    // document.getElementById('cabana').value = cabin.displayName;
    
    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth' });
  }
});

// Inicializar con la instancia de Firestore
widget.init(db);
```

## API

### Constructor

```javascript
new AvailabilityWidget(containerId, options)
```

**Opciones:**

| Opción | Tipo | Default | Descripción |
|--------|------|---------|-------------|
| `onDateSelect` | Function | `() => {}` | Callback al seleccionar rango de fechas |
| `onCabinSelect` | Function | `() => {}` | Callback al seleccionar una cabaña |
| `maxMonthsAhead` | Number | `6` | Meses hacia adelante permitidos |
| `showLegend` | Boolean | `true` | Mostrar leyenda de colores |

### Métodos

- `init(db)` - Inicializar con instancia de Firestore
- `destroy()` - Limpiar suscripciones y widget
- `clearSelection()` - Limpiar selección de fechas

### Callbacks

**onDateSelect(checkIn, checkOut)**
```javascript
onDateSelect: (checkIn, checkOut) => {
  // checkIn: "2026-01-15"
  // checkOut: "2026-01-18"
}
```

**onCabinSelect(cabin, checkIn, checkOut)**
```javascript
onCabinSelect: (cabin, checkIn, checkOut) => {
  // cabin: { 
  //   id: 'cabana-pequena',
  //   name: 'Cabaña Pequeña (Max 3p)',
  //   displayName: 'Cabaña Pequeña',
  //   maxCapacity: 3,
  //   isAvailable: true
  // }
}
```

## Estilos

El widget usa clases de Tailwind CSS. Asegúrate de tener Tailwind configurado en tu proyecto (ya lo tienes via CDN en WebCabanasManuara).

## Colores de disponibilidad

| Estado | Color | Significado |
|--------|-------|-------------|
| Verde (emerald) | `bg-emerald-50` | Todas las cabañas disponibles |
| Amarillo (amber) | `bg-amber-50` | Algunas cabañas disponibles |
| Rojo | `bg-red-50` | Sin disponibilidad |
| Gris | `bg-gray-100` | Fecha pasada |
