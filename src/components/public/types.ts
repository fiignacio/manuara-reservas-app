// Types for the embeddable availability widget
// These can be exported and used in external React applications

export interface CabinInfo {
  id: string;
  name: string;
  displayName: string;
  maxCapacity: number;
  color: string;
}

export interface DayAvailability {
  date: string;
  availableCabins: number;
  totalCabins: number;
  cabinStatus: Record<string, boolean>;
}

export interface PublicAvailabilityData {
  cabins: CabinInfo[];
  availability: DayAvailability[];
  lastUpdated: string;
}

export interface AvailabilityWidgetProps {
  onDateRangeSelect?: (checkIn: string, checkOut: string) => void;
  onCabinSelect?: (cabin: CabinInfo, checkIn: string, checkOut: string) => void;
  theme?: 'light' | 'dark';
  showLegend?: boolean;
  showCabinSelector?: boolean;
  minDate?: string;
  maxMonthsAhead?: number;
  className?: string;
}

export interface CabinSelectorProps {
  checkIn: string;
  checkOut: string;
  availability: DayAvailability[];
  cabins: CabinInfo[];
  onCabinSelect?: (cabin: CabinInfo) => void;
  onClear?: () => void;
}

export interface AvailabilityLegendProps {
  className?: string;
}

export type AvailabilityStatus = 'full' | 'partial' | 'none' | 'past';
