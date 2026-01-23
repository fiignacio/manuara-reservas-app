/**
 * Datos de cabañas para el widget de disponibilidad
 * Estos datos deben coincidir con los del Channel Manager
 */

export const CABIN_TYPES = [
  {
    id: 'cabana-pequena',
    name: 'Cabaña Pequeña (Max 3p)',
    displayName: 'Cabaña Pequeña',
    maxCapacity: 3,
    color: '#3B82F6', // blue-500
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-800'
  },
  {
    id: 'cabana-mediana-1',
    name: 'Cabaña Mediana 1 (Max 4p)',
    displayName: 'Cabaña Mediana 1',
    maxCapacity: 4,
    color: '#8B5CF6', // purple-500
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-800'
  },
  {
    id: 'cabana-mediana-2',
    name: 'Cabaña Mediana 2 (Max 4p)',
    displayName: 'Cabaña Mediana 2',
    maxCapacity: 4,
    color: '#F59E0B', // amber-500
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-800'
  },
  {
    id: 'cabana-grande',
    name: 'Cabaña Grande (Max 6p)',
    displayName: 'Cabaña Grande',
    maxCapacity: 6,
    color: '#EC4899', // pink-500
    bgClass: 'bg-pink-100',
    textClass: 'text-pink-800'
  }
];

/**
 * Obtener capacidad máxima de una cabaña por su nombre
 */
export function getMaxCapacity(cabinName) {
  const cabin = CABIN_TYPES.find(c => c.name === cabinName);
  return cabin ? cabin.maxCapacity : 3;
}

/**
 * Obtener nombre para mostrar de una cabaña
 */
export function getCabinDisplayName(cabinName) {
  const cabin = CABIN_TYPES.find(c => c.name === cabinName);
  return cabin ? cabin.displayName : cabinName.split(' (')[0];
}
