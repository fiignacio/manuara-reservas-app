import { logger } from './logger';

const STORAGE_KEY = 'manuara_admin_config';
const CONFIG_VERSION = '1.0';

// ============ Types ============

export interface CabinConfig {
  id: string;
  name: string;
  displayName: string;
  maxCapacity: number;
  color: string;
  isActive: boolean;
  order: number;
}

export interface PricingConfig {
  adultHighSeason: number;
  adultLowSeason: number;
  childRate: number;
  babyRate: number; // Usually 0
}

export interface SeasonConfig {
  name: string;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
}

export interface AdminConfig {
  version: string;
  cabins: CabinConfig[];
  pricing: PricingConfig;
  seasons: {
    high: SeasonConfig[];
    defaultSeason: 'Alta' | 'Baja';
  };
  businessName: string;
  lastUpdated: number;
}

// ============ Default Configuration ============

const DEFAULT_CABINS: CabinConfig[] = [
  {
    id: 'cabin-1',
    name: 'Cabaña Pequeña (Max 3p)',
    displayName: 'Cabaña Pequeña',
    maxCapacity: 3,
    color: 'bg-blue-500',
    isActive: true,
    order: 1,
  },
  {
    id: 'cabin-2',
    name: 'Cabaña Mediana 1 (Max 4p)',
    displayName: 'Cabaña Mediana 1',
    maxCapacity: 4,
    color: 'bg-purple-500',
    isActive: true,
    order: 2,
  },
  {
    id: 'cabin-3',
    name: 'Cabaña Mediana 2 (Max 4p)',
    displayName: 'Cabaña Mediana 2',
    maxCapacity: 4,
    color: 'bg-amber-500',
    isActive: true,
    order: 3,
  },
  {
    id: 'cabin-4',
    name: 'Cabaña Grande (Max 6p)',
    displayName: 'Cabaña Grande',
    maxCapacity: 6,
    color: 'bg-pink-500',
    isActive: true,
    order: 4,
  },
];

const DEFAULT_PRICING: PricingConfig = {
  adultHighSeason: 30000,
  adultLowSeason: 25000,
  childRate: 15000,
  babyRate: 0,
};

const DEFAULT_SEASONS: AdminConfig['seasons'] = {
  high: [
    { name: 'Verano', startMonth: 12, startDay: 15, endMonth: 3, endDay: 15 },
    { name: 'Semana Santa', startMonth: 4, startDay: 1, endMonth: 4, endDay: 15 },
    { name: 'Fiestas Patrias', startMonth: 9, startDay: 10, endMonth: 9, endDay: 25 },
  ],
  defaultSeason: 'Baja',
};

export function getDefaultConfig(): AdminConfig {
  return {
    version: CONFIG_VERSION,
    cabins: DEFAULT_CABINS,
    pricing: DEFAULT_PRICING,
    seasons: DEFAULT_SEASONS,
    businessName: 'Manuara Cabañas',
    lastUpdated: Date.now(),
  };
}

// ============ Storage Functions ============

export function getAdminConfig(): AdminConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const defaultConfig = getDefaultConfig();
      saveAdminConfig(defaultConfig);
      return defaultConfig;
    }
    
    const config: AdminConfig = JSON.parse(stored);
    
    // Version check - migrate if needed
    if (config.version !== CONFIG_VERSION) {
      const newConfig = migrateConfig(config);
      saveAdminConfig(newConfig);
      return newConfig;
    }
    
    return config;
  } catch (error) {
    logger.error('adminConfig.get.error', { error: String(error) });
    return getDefaultConfig();
  }
}

export function saveAdminConfig(config: AdminConfig): void {
  try {
    config.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    logger.info('adminConfig.saved');
  } catch (error) {
    logger.error('adminConfig.save.error', { error: String(error) });
  }
}

function migrateConfig(oldConfig: AdminConfig): AdminConfig {
  // Future migrations can be handled here
  return {
    ...getDefaultConfig(),
    ...oldConfig,
    version: CONFIG_VERSION,
  };
}

// ============ Cabin Management ============

export function getActiveCabins(): CabinConfig[] {
  const config = getAdminConfig();
  return config.cabins
    .filter(c => c.isActive)
    .sort((a, b) => a.order - b.order);
}

export function getCabinTypes(): string[] {
  return getActiveCabins().map(c => c.name);
}

export function addCabin(cabin: Omit<CabinConfig, 'id' | 'order'>): CabinConfig {
  const config = getAdminConfig();
  const newCabin: CabinConfig = {
    ...cabin,
    id: `cabin-${Date.now()}`,
    order: config.cabins.length + 1,
  };
  
  config.cabins.push(newCabin);
  saveAdminConfig(config);
  
  logger.info('adminConfig.cabinAdded', { id: newCabin.id, name: newCabin.name });
  return newCabin;
}

export function updateCabin(id: string, updates: Partial<CabinConfig>): CabinConfig | null {
  const config = getAdminConfig();
  const index = config.cabins.findIndex(c => c.id === id);
  
  if (index === -1) return null;
  
  config.cabins[index] = { ...config.cabins[index], ...updates };
  saveAdminConfig(config);
  
  logger.info('adminConfig.cabinUpdated', { id });
  return config.cabins[index];
}

export function deleteCabin(id: string): boolean {
  const config = getAdminConfig();
  const index = config.cabins.findIndex(c => c.id === id);
  
  if (index === -1) return false;
  
  // Soft delete - mark as inactive
  config.cabins[index].isActive = false;
  saveAdminConfig(config);
  
  logger.info('adminConfig.cabinDeleted', { id });
  return true;
}

export function reorderCabins(cabinIds: string[]): void {
  const config = getAdminConfig();
  
  cabinIds.forEach((id, index) => {
    const cabin = config.cabins.find(c => c.id === id);
    if (cabin) {
      cabin.order = index + 1;
    }
  });
  
  saveAdminConfig(config);
  logger.info('adminConfig.cabinsReordered');
}

// ============ Pricing Management ============

export function getPricing(): PricingConfig {
  return getAdminConfig().pricing;
}

export function updatePricing(pricing: Partial<PricingConfig>): PricingConfig {
  const config = getAdminConfig();
  config.pricing = { ...config.pricing, ...pricing };
  saveAdminConfig(config);
  
  logger.info('adminConfig.pricingUpdated', pricing);
  return config.pricing;
}

// ============ Dynamic Price Calculation ============

export function calculateDynamicPrice(
  checkIn: string,
  checkOut: string,
  adults: number,
  children: number,
  babies: number = 0
): number {
  const pricing = getPricing();
  const season = determineSeason(checkIn);
  
  const nights = Math.ceil(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (nights <= 0) return 0;
  
  const adultRate = season === 'Alta' ? pricing.adultHighSeason : pricing.adultLowSeason;
  const costPerNight = (adults * adultRate) + (children * pricing.childRate) + (babies * pricing.babyRate);
  
  return costPerNight * nights;
}

export function determineSeason(dateStr: string): 'Alta' | 'Baja' {
  const config = getAdminConfig();
  const date = new Date(dateStr);
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate();
  
  for (const season of config.seasons.high) {
    const isWithinSeason = isDateInSeasonRange(month, day, season);
    if (isWithinSeason) return 'Alta';
  }
  
  return config.seasons.defaultSeason;
}

function isDateInSeasonRange(month: number, day: number, season: SeasonConfig): boolean {
  const { startMonth, startDay, endMonth, endDay } = season;
  
  // Handle cross-year ranges (e.g., Dec 15 - Mar 15)
  if (startMonth > endMonth) {
    // Either in the start year portion or end year portion
    if (month > startMonth || (month === startMonth && day >= startDay)) {
      return true;
    }
    if (month < endMonth || (month === endMonth && day <= endDay)) {
      return true;
    }
    return false;
  }
  
  // Same year range
  if (month > startMonth && month < endMonth) return true;
  if (month === startMonth && day >= startDay) return true;
  if (month === endMonth && day <= endDay) return true;
  
  return false;
}

// ============ Cabin Helpers ============

export function getCabinMaxCapacity(cabinName: string): number {
  const cabins = getActiveCabins();
  const cabin = cabins.find(c => c.name === cabinName);
  return cabin?.maxCapacity ?? 3;
}

export function getCabinColor(cabinName: string): string {
  const cabins = getActiveCabins();
  const cabin = cabins.find(c => c.name === cabinName);
  return cabin?.color ?? 'bg-emerald-500';
}

export function getCabinDisplayName(cabinName: string): string {
  const cabins = getActiveCabins();
  const cabin = cabins.find(c => c.name === cabinName);
  return cabin?.displayName ?? cabinName.split(' (')[0];
}

// ============ Reset to Defaults ============

export function resetToDefaults(): AdminConfig {
  const defaultConfig = getDefaultConfig();
  saveAdminConfig(defaultConfig);
  logger.info('adminConfig.resetToDefaults');
  return defaultConfig;
}
