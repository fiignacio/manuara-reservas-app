import { Reservation } from '@/types/reservation';
import { getTodayDate, getTomorrowDate, addDays } from './dateUtils';
import { logger } from './logger';

interface DashboardData {
  allReservations: Reservation[];
  todayArrivals: Reservation[];
  todayDepartures: Reservation[];
  upcomingArrivals: Reservation[];
  upcomingDepartures: Reservation[];
  tomorrowDepartures: Reservation[];
  tomorrowArrivals: Reservation[];
}

interface CacheEntry {
  data: DashboardData;
  timestamp: number;
  expires: number;
}

class DashboardCache {
  private cache: CacheEntry | null = null;
  private readonly TTL = 2 * 60 * 1000; // 2 minutes

  private isExpired(): boolean {
    if (!this.cache) return true;
    return Date.now() > this.cache.expires;
  }

  private calculateDashboardData(allReservations: Reservation[]): DashboardData {
    const today = getTodayDate();
    const tomorrow = getTomorrowDate();
    const fiveDaysFromNow = addDays(today, 5);

    logger.info('dashboard.cache.calculating', { 
      totalReservations: allReservations.length,
      today, 
      tomorrow 
    });

    const todayArrivals = allReservations.filter(r => r.checkIn === today);
    const todayDepartures = allReservations.filter(r => r.checkOut === today);
    const tomorrowDepartures = allReservations.filter(r => r.checkOut === tomorrow);
    const tomorrowArrivals = allReservations.filter(r => r.checkIn === tomorrow);
    
    const upcomingArrivals = allReservations.filter(r => 
      r.checkIn > today && r.checkIn <= fiveDaysFromNow
    ).slice(0, 5);
    
    const upcomingDepartures = allReservations.filter(r => 
      r.checkOut > today && r.checkOut <= fiveDaysFromNow
    ).slice(0, 5);

    return {
      allReservations,
      todayArrivals,
      todayDepartures,
      upcomingArrivals,
      upcomingDepartures,
      tomorrowDepartures,
      tomorrowArrivals
    };
  }

  public set(allReservations: Reservation[]): DashboardData {
    const data = this.calculateDashboardData(allReservations);
    const timestamp = Date.now();
    
    this.cache = {
      data,
      timestamp,
      expires: timestamp + this.TTL
    };

    logger.info('dashboard.cache.set', { 
      timestamp,
      expires: this.cache.expires,
      totalReservations: data.allReservations.length 
    });

    return data;
  }

  public get(): DashboardData | null {
    if (this.isExpired()) {
      logger.info('dashboard.cache.expired');
      this.cache = null;
      return null;
    }

    logger.info('dashboard.cache.hit');
    return this.cache?.data || null;
  }

  public clear(): void {
    logger.info('dashboard.cache.cleared');
    this.cache = null;
  }

  public invalidate(): void {
    this.clear();
  }
}

export const dashboardCache = new DashboardCache();