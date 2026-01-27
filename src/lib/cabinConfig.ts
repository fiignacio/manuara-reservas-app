/**
 * Centralized cabin configuration
 * All cabin-related constants and helpers in one place
 */

// Cabin types with capacity info
export const CABIN_TYPES = [
  'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande (Max 6p)'
] as const;

export type CabinType = typeof CABIN_TYPES[number];

// Mapping for legacy/short cabin names to normalized names
export const CABIN_TYPE_MAPPING: Record<string, CabinType> = {
  'Cabaña Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande': 'Cabaña Grande (Max 6p)',
  'Pequeña': 'Cabaña Pequeña (Max 3p)',
  'Mediana 1': 'Cabaña Mediana 1 (Max 4p)',
  'Mediana 2': 'Cabaña Mediana 2 (Max 4p)',
  'Grande': 'Cabaña Grande (Max 6p)'
};

// Normalize any cabin type string to the standard format
export const normalizeCabinType = (cabinType: string): string => {
  if (!cabinType) return '';
  return CABIN_TYPE_MAPPING[cabinType] || cabinType;
};

// Get maximum capacity for a cabin type
export const getMaxCapacity = (cabinType: string): number => {
  if (cabinType.includes('Pequeña')) return 3;
  if (cabinType.includes('Mediana')) return 4;
  if (cabinType.includes('Grande')) return 6;
  return 3;
};

// Get display name without capacity info
export const getCabinDisplayName = (cabinType: string): string => {
  return cabinType.split(' (')[0];
};

// Get color class for cabin type (for UI)
export const getCabinColor = (cabinType: string): string => {
  switch (cabinType) {
    case 'Cabaña Pequeña (Max 3p)':
      return 'bg-blue-500';
    case 'Cabaña Mediana 1 (Max 4p)':
      return 'bg-purple-500';
    case 'Cabaña Mediana 2 (Max 4p)':
      return 'bg-amber-500';
    case 'Cabaña Grande (Max 6p)':
      return 'bg-pink-500';
    default:
      return 'bg-emerald-500';
  }
};

// Cabin info interface for public display
export interface CabinInfo {
  id: string;
  name: string;
  displayName: string;
  maxCapacity: number;
  color: string;
}

// Get full cabin info array
export const getCabinInfo = (): CabinInfo[] => {
  return CABIN_TYPES.map((cabinType, index) => ({
    id: `cabin-${index + 1}`,
    name: cabinType,
    displayName: getCabinDisplayName(cabinType),
    maxCapacity: getMaxCapacity(cabinType),
    color: getCabinColor(cabinType)
  }));
};
