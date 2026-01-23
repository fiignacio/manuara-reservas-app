/**
 * Widget de Disponibilidad para Cabañas Manuara
 * Versión Vanilla JavaScript para integrar en cualquier sitio web
 * 
 * Requiere: Firebase SDK (ya incluido en WebCabanasManuara)
 */

import { CABIN_TYPES } from './cabinData.js';

// Nombres de días y meses en español
const DAYS_SHORT = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export class AvailabilityWidget {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container #${containerId} not found`);
      return;
    }

    // Opciones
    this.onDateSelect = options.onDateSelect || (() => {});
    this.onCabinSelect = options.onCabinSelect || (() => {});
    this.maxMonthsAhead = options.maxMonthsAhead || 6;
    this.showLegend = options.showLegend !== false;

    // Estado
    this.currentMonth = new Date();
    this.selectedCheckIn = null;
    this.selectedCheckOut = null;
    this.hoverDate = null;
    this.reservations = [];
    this.availability = [];
    this.loading = true;
    this.unsubscribe = null;

    // Firebase references (se inicializan en init())
    this.db = null;
  }

  /**
   * Inicializar el widget con la instancia de Firebase
   * @param {Firestore} db - Instancia de Firestore
   */
  init(db) {
    this.db = db;
    this.render();
    this.subscribeToAvailability();
  }

  /**
   * Suscribirse a cambios en tiempo real
   */
  subscribeToAvailability() {
    if (!this.db) {
      console.error('Firebase db not initialized');
      return;
    }

    const { collection, onSnapshot, query } = window.firebaseFirestore;
    
    // Escuchar colección 'reservas'
    const reservasRef = collection(this.db, 'reservas');
    
    this.unsubscribe = onSnapshot(query(reservasRef), (snapshot) => {
      this.reservations = snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (data.checkIn && data.checkOut && data.cabinType) {
            return {
              id: doc.id,
              cabinType: data.cabinType,
              checkIn: data.checkIn,
              checkOut: data.checkOut
            };
          }
          return null;
        })
        .filter(r => r !== null);

      this.loading = false;
      this.calculateAvailability();
      this.render();
    }, (error) => {
      console.error('Error fetching availability:', error);
      this.loading = false;
      this.render();
    });
  }

  /**
   * Calcular disponibilidad para el mes actual
   */
  calculateAvailability() {
    const startDate = this.getMonthStart();
    const endDate = this.getMonthEnd();
    const dates = this.getDateRange(startDate, endDate);

    this.availability = dates.map(date => {
      const cabinStatus = {};
      let availableCabins = 0;

      CABIN_TYPES.forEach(cabin => {
        const isOccupied = this.reservations.some(res =>
          res.cabinType === cabin.name &&
          res.checkIn <= date &&
          res.checkOut > date
        );

        cabinStatus[cabin.name] = !isOccupied;
        if (!isOccupied) availableCabins++;
      });

      return {
        date,
        availableCabins,
        totalCabins: CABIN_TYPES.length,
        cabinStatus
      };
    });
  }

  /**
   * Obtener estado de disponibilidad para una fecha
   */
  getDateStatus(dateStr) {
    const dayData = this.availability.find(d => d.date === dateStr);
    if (!dayData) return 'unknown';

    const today = this.formatDate(new Date());
    if (dateStr < today) return 'past';

    if (dayData.availableCabins === 0) return 'none';
    if (dayData.availableCabins === dayData.totalCabins) return 'full';
    return 'partial';
  }

  /**
   * Verificar si una fecha está en el rango seleccionado
   */
  isInRange(dateStr) {
    if (!this.selectedCheckIn) return false;
    
    const endDate = this.selectedCheckOut || this.hoverDate;
    if (!endDate) return dateStr === this.selectedCheckIn;

    return dateStr >= this.selectedCheckIn && dateStr <= endDate;
  }

  /**
   * Manejar click en una fecha
   */
  handleDateClick(dateStr) {
    const today = this.formatDate(new Date());
    if (dateStr < today) return;

    if (!this.selectedCheckIn || this.selectedCheckOut) {
      // Primera selección o reiniciar
      this.selectedCheckIn = dateStr;
      this.selectedCheckOut = null;
    } else if (dateStr > this.selectedCheckIn) {
      // Segunda selección (check-out)
      this.selectedCheckOut = dateStr;
      this.onDateSelect(this.selectedCheckIn, this.selectedCheckOut);
    } else if (dateStr < this.selectedCheckIn) {
      // Click antes del check-in, reiniciar
      this.selectedCheckIn = dateStr;
      this.selectedCheckOut = null;
    }

    this.render();
  }

  /**
   * Manejar hover en una fecha
   */
  handleDateHover(dateStr) {
    if (this.selectedCheckIn && !this.selectedCheckOut) {
      this.hoverDate = dateStr;
      this.render();
    }
  }

  /**
   * Limpiar selección
   */
  clearSelection() {
    this.selectedCheckIn = null;
    this.selectedCheckOut = null;
    this.hoverDate = null;
    this.render();
  }

  /**
   * Navegar al mes anterior
   */
  goToPreviousMonth() {
    const today = new Date();
    const currentStart = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
    const todayStart = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (currentStart > todayStart) {
      this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
      this.calculateAvailability();
      this.render();
    }
  }

  /**
   * Navegar al mes siguiente
   */
  goToNextMonth() {
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + this.maxMonthsAhead);
    
    const nextMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    if (nextMonth <= maxDate) {
      this.currentMonth = nextMonth;
      this.calculateAvailability();
      this.render();
    }
  }

  /**
   * Obtener cabañas disponibles para el rango seleccionado
   */
  getAvailableCabins() {
    if (!this.selectedCheckIn || !this.selectedCheckOut) return [];

    return CABIN_TYPES.map(cabin => {
      const isAvailable = this.availability
        .filter(day => day.date >= this.selectedCheckIn && day.date < this.selectedCheckOut)
        .every(day => day.cabinStatus[cabin.name] === true);

      return {
        ...cabin,
        isAvailable
      };
    });
  }

  /**
   * Seleccionar una cabaña
   */
  selectCabin(cabin) {
    if (cabin.isAvailable) {
      this.onCabinSelect(cabin, this.selectedCheckIn, this.selectedCheckOut);
    }
  }

  // === Utilidades de fecha ===

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  getMonthStart() {
    return this.formatDate(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1));
  }

  getMonthEnd() {
    return this.formatDate(new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0));
  }

  getDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate + 'T12:00:00');
    const end = new Date(endDate + 'T12:00:00');

    while (current <= end) {
      dates.push(this.formatDate(current));
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  formatDisplayDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // === Renderizado ===

  render() {
    if (!this.container) return;

    const html = `
      <div class="bg-white rounded-xl shadow-lg overflow-hidden">
        ${this.renderHeader()}
        ${this.loading ? this.renderLoading() : this.renderCalendar()}
        ${this.showLegend ? this.renderLegend() : ''}
        ${this.selectedCheckOut ? this.renderCabinSelector() : ''}
      </div>
    `;

    this.container.innerHTML = html;
    this.attachEventListeners();
  }

  renderHeader() {
    const monthName = MONTHS[this.currentMonth.getMonth()];
    const year = this.currentMonth.getFullYear();

    let selectionText = '';
    if (this.selectedCheckIn && this.selectedCheckOut) {
      selectionText = `<span class="text-sm text-emerald-600 font-medium">
        ${this.formatDisplayDate(this.selectedCheckIn)} → ${this.formatDisplayDate(this.selectedCheckOut)}
      </span>`;
    } else if (this.selectedCheckIn) {
      selectionText = `<span class="text-sm text-blue-600">Selecciona fecha de salida</span>`;
    }

    return `
      <div class="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-4">
        <div class="flex items-center justify-between">
          <button id="prev-month" class="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Mes anterior">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="text-center">
            <h3 class="text-xl font-bold">${monthName} ${year}</h3>
            ${selectionText}
          </div>
          <button id="next-month" class="p-2 hover:bg-white/20 rounded-full transition-colors" aria-label="Mes siguiente">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="p-8 text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
        <p class="mt-2 text-gray-500">Cargando disponibilidad...</p>
      </div>
    `;
  }

  renderCalendar() {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Ajustar para que la semana empiece en lunes
    let startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;

    // Cabecera de días
    let daysHeader = DAYS_SHORT.map(day => 
      `<div class="text-center text-xs font-medium text-gray-500 py-2">${day}</div>`
    ).join('');

    // Celdas vacías antes del primer día
    let cells = '';
    for (let i = 0; i < startDay; i++) {
      cells += '<div class="p-1"></div>';
    }

    // Días del mes
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const status = this.getDateStatus(dateStr);
      const inRange = this.isInRange(dateStr);
      const isCheckIn = dateStr === this.selectedCheckIn;
      const isCheckOut = dateStr === this.selectedCheckOut;

      let cellClasses = 'w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all cursor-pointer ';
      
      if (status === 'past') {
        cellClasses += 'bg-gray-100 text-gray-400 cursor-not-allowed';
      } else if (isCheckIn || isCheckOut) {
        cellClasses += 'bg-emerald-600 text-white shadow-lg';
      } else if (inRange) {
        cellClasses += 'bg-emerald-100 text-emerald-800';
      } else {
        switch (status) {
          case 'full':
            cellClasses += 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
            break;
          case 'partial':
            cellClasses += 'bg-amber-50 text-amber-700 hover:bg-amber-100';
            break;
          case 'none':
            cellClasses += 'bg-red-50 text-red-700';
            break;
          default:
            cellClasses += 'bg-gray-50 text-gray-600 hover:bg-gray-100';
        }
      }

      cells += `
        <div class="p-1">
          <button 
            class="date-cell ${cellClasses}" 
            data-date="${dateStr}"
            ${status === 'past' ? 'disabled' : ''}
          >
            ${day}
          </button>
        </div>
      `;
    }

    return `
      <div class="p-4">
        <div class="grid grid-cols-7 gap-0">
          ${daysHeader}
          ${cells}
        </div>
      </div>
    `;
  }

  renderLegend() {
    return `
      <div class="px-4 pb-4">
        <div class="flex flex-wrap justify-center gap-4 text-xs">
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-emerald-100"></span>
            <span class="text-gray-600">Disponible</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-amber-100"></span>
            <span class="text-gray-600">Parcial</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-3 h-3 rounded bg-red-100"></span>
            <span class="text-gray-600">Ocupado</span>
          </div>
        </div>
      </div>
    `;
  }

  renderCabinSelector() {
    const cabins = this.getAvailableCabins();
    const availableCount = cabins.filter(c => c.isAvailable).length;

    // Calcular noches
    const checkIn = new Date(this.selectedCheckIn + 'T12:00:00');
    const checkOut = new Date(this.selectedCheckOut + 'T12:00:00');
    const nights = Math.round((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    return `
      <div class="border-t bg-gray-50 p-4">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h4 class="font-semibold text-gray-900">Cabañas disponibles</h4>
            <p class="text-sm text-gray-500">${nights} noche${nights > 1 ? 's' : ''} · ${availableCount} disponible${availableCount !== 1 ? 's' : ''}</p>
          </div>
          <button id="clear-selection" class="text-sm text-gray-500 hover:text-gray-700">
            Limpiar
          </button>
        </div>
        
        <div class="space-y-2">
          ${cabins.map(cabin => `
            <div class="flex items-center justify-between p-3 rounded-lg ${cabin.isAvailable ? 'bg-white border border-gray-200' : 'bg-gray-100 opacity-60'}">
              <div class="flex items-center gap-3">
                <span class="w-3 h-3 rounded-full" style="background-color: ${cabin.color}"></span>
                <div>
                  <p class="font-medium text-gray-900">${cabin.displayName}</p>
                  <p class="text-xs text-gray-500">Máx ${cabin.maxCapacity} personas</p>
                </div>
              </div>
              ${cabin.isAvailable 
                ? `<button class="cabin-select px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors" data-cabin="${cabin.name}">
                    Seleccionar
                   </button>`
                : `<span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Ocupada</span>`
              }
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Navegación de meses
    const prevBtn = this.container.querySelector('#prev-month');
    const nextBtn = this.container.querySelector('#next-month');
    
    if (prevBtn) prevBtn.addEventListener('click', () => this.goToPreviousMonth());
    if (nextBtn) nextBtn.addEventListener('click', () => this.goToNextMonth());

    // Click en fechas
    const dateCells = this.container.querySelectorAll('.date-cell');
    dateCells.forEach(cell => {
      cell.addEventListener('click', () => {
        const date = cell.dataset.date;
        if (date) this.handleDateClick(date);
      });
      cell.addEventListener('mouseenter', () => {
        const date = cell.dataset.date;
        if (date) this.handleDateHover(date);
      });
    });

    // Limpiar selección
    const clearBtn = this.container.querySelector('#clear-selection');
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

    // Seleccionar cabaña
    const cabinBtns = this.container.querySelectorAll('.cabin-select');
    cabinBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cabinName = btn.dataset.cabin;
        const cabin = this.getAvailableCabins().find(c => c.name === cabinName);
        if (cabin) this.selectCabin(cabin);
      });
    });
  }

  /**
   * Destruir widget y limpiar suscripciones
   */
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
