
import { Reservation } from '@/types/reservation';
import { addDays, formatDateForDisplay } from './dateUtils';

export interface OccupancyStats {
  totalReservations: number;
  totalGuests: number;
  totalRevenue: number;
  averageStayLength: number;
  occupancyRate: number;
  averageRevenuePerNight: number;
}

export interface CabinStats {
  cabinType: string;
  totalReservations: number;
  totalRevenue: number;
  occupancyRate: number;
  averageGuests: number;
}

export interface MonthlyStats {
  month: string;
  reservations: number;
  revenue: number;
  guests: number;
  occupancyRate: number;
}

export interface SeasonStats {
  season: 'Alta' | 'Baja';
  reservations: number;
  revenue: number;
  averagePrice: number;
  occupancyRate: number;
}

export const calculateOccupancyStats = (
  reservations: Reservation[],
  startDate: string,
  endDate: string
): OccupancyStats => {
  const filteredReservations = reservations.filter(r => 
    r.checkIn >= startDate && r.checkOut <= endDate
  );

  const totalReservations = filteredReservations.length;
  const totalGuests = filteredReservations.reduce((sum, r) => sum + r.adults + r.children, 0);
  const totalRevenue = filteredReservations.reduce((sum, r) => sum + r.totalPrice, 0);
  
  const totalNights = filteredReservations.reduce((sum, r) => {
    const checkIn = new Date(r.checkIn);
    const checkOut = new Date(r.checkOut);
    return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);

  const averageStayLength = totalReservations > 0 ? totalNights / totalReservations : 0;
  
  // Calcular días totales en el período
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDaysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Asumir 4 cabañas disponibles
  const totalCabinDays = totalDaysInPeriod * 4;
  const occupancyRate = totalCabinDays > 0 ? (totalNights / totalCabinDays) * 100 : 0;
  
  const averageRevenuePerNight = totalNights > 0 ? totalRevenue / totalNights : 0;

  return {
    totalReservations,
    totalGuests,
    totalRevenue,
    averageStayLength,
    occupancyRate,
    averageRevenuePerNight
  };
};

export const calculateCabinStats = (reservations: Reservation[]): CabinStats[] => {
  const cabinTypes = [
    'Cabaña Pequeña (Max 3p)',
    'Cabaña Mediana 1 (Max 4p)',
    'Cabaña Mediana 2 (Max 4p)',
    'Cabaña Grande (Max 6p)'
  ];

  return cabinTypes.map(cabinType => {
    const cabinReservations = reservations.filter(r => r.cabinType === cabinType);
    const totalReservations = cabinReservations.length;
    const totalRevenue = cabinReservations.reduce((sum, r) => sum + r.totalPrice, 0);
    const totalGuests = cabinReservations.reduce((sum, r) => sum + r.adults + r.children, 0);
    const averageGuests = totalReservations > 0 ? totalGuests / totalReservations : 0;

    const totalNights = cabinReservations.reduce((sum, r) => {
      const checkIn = new Date(r.checkIn);
      const checkOut = new Date(r.checkOut);
      return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);

    // Calcular ocupación aproximada (últimos 30 días)
    const occupancyRate = totalNights > 0 ? (totalNights / 30) * 100 : 0;

    return {
      cabinType,
      totalReservations,
      totalRevenue,
      occupancyRate: Math.min(occupancyRate, 100),
      averageGuests
    };
  });
};

export const calculateMonthlyStats = (reservations: Reservation[]): MonthlyStats[] => {
  const monthlyData: { [key: string]: { reservations: number; revenue: number; guests: number; nights: number } } = {};

  reservations.forEach(reservation => {
    const checkInDate = new Date(reservation.checkIn);
    const monthKey = `${checkInDate.getFullYear()}-${String(checkInDate.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { reservations: 0, revenue: 0, guests: 0, nights: 0 };
    }

    monthlyData[monthKey].reservations++;
    monthlyData[monthKey].revenue += reservation.totalPrice;
    monthlyData[monthKey].guests += reservation.adults + reservation.children;
    
    const checkOut = new Date(reservation.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    monthlyData[monthKey].nights += nights;
  });

  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    reservations: data.reservations,
    revenue: data.revenue,
    guests: data.guests,
    occupancyRate: Math.min((data.nights / (30 * 4)) * 100, 100) // Aprox 30 días * 4 cabañas
  })).sort((a, b) => a.month.localeCompare(b.month));
};

export const calculateSeasonStats = (reservations: Reservation[]): SeasonStats[] => {
  const seasonData: { [key: string]: { reservations: number; revenue: number; nights: number } } = {
    'Alta': { reservations: 0, revenue: 0, nights: 0 },
    'Baja': { reservations: 0, revenue: 0, nights: 0 }
  };

  reservations.forEach(reservation => {
    const season = reservation.season;
    seasonData[season].reservations++;
    seasonData[season].revenue += reservation.totalPrice;
    
    const checkIn = new Date(reservation.checkIn);
    const checkOut = new Date(reservation.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    seasonData[season].nights += nights;
  });

  return Object.entries(seasonData).map(([season, data]) => ({
    season: season as 'Alta' | 'Baja',
    reservations: data.reservations,
    revenue: data.revenue,
    averagePrice: data.reservations > 0 ? data.revenue / data.reservations : 0,
    occupancyRate: Math.min((data.nights / (365 * 4 * 0.5)) * 100, 100) // Aprox 6 meses por temporada * 4 cabañas
  }));
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP'
  }).format(amount);
};

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
