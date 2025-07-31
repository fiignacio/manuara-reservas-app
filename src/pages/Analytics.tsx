
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Users, TrendingUp, Home, Percent } from 'lucide-react';
import { getAllReservations } from '@/lib/reservationService';
import { 
  calculateOccupancyStats, 
  calculateCabinStats, 
  calculateMonthlyStats, 
  calculateSeasonStats,
  formatCurrency,
  formatPercentage,
  OccupancyStats 
} from '@/lib/analyticsService';
import { Reservation } from '@/types/reservation';
import StatsCard from '@/components/analytics/StatsCard';
import OccupancyChart from '@/components/analytics/OccupancyChart';
import RevenueChart from '@/components/analytics/RevenueChart';
import CabinPerformanceTable from '@/components/analytics/CabinPerformanceTable';
import SeasonComparisonChart from '@/components/analytics/SeasonComparisonChart';

const Analytics = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'30days' | '90days' | '1year'>('30days');

  useEffect(() => {
    loadReservations();
  }, []);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getAllReservations();
      setReservations(data);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    switch (dateRange) {
      case '30days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  const { startDate, endDate } = getDateRange();
  const occupancyStats = calculateOccupancyStats(reservations, startDate, endDate);
  const cabinStats = calculateCabinStats(reservations);
  const monthlyStats = calculateMonthlyStats(reservations);
  const seasonStats = calculateSeasonStats(reservations);

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case '30days': return 'Últimos 30 días';
      case '90days': return 'Últimos 90 días';
      case '1year': return 'Último año';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics y Reportes</h1>
          <p className="text-muted-foreground">
            Análisis detallado del rendimiento y estadísticas
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={dateRange === '30days' ? 'default' : 'outline'}
            onClick={() => setDateRange('30days')}
            size="sm"
          >
            30 días
          </Button>
          <Button
            variant={dateRange === '90days' ? 'default' : 'outline'}
            onClick={() => setDateRange('90days')}
            size="sm"
          >
            90 días
          </Button>
          <Button
            variant={dateRange === '1year' ? 'default' : 'outline'}
            onClick={() => setDateRange('1year')}
            size="sm"
          >
            1 año
          </Button>
        </div>
      </div>

      {/* Period Label */}
      <Card className="card-cabin">
        <CardContent className="py-3">
          <p className="text-sm text-muted-foreground text-center">
            Mostrando datos para: <span className="font-medium">{getDateRangeLabel()}</span>
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Total Reservas"
          value={occupancyStats.totalReservations.toString()}
          icon={Calendar}
          description={getDateRangeLabel()}
        />
        <StatsCard
          title="Ingresos Totales"
          value={formatCurrency(occupancyStats.totalRevenue)}
          icon={DollarSign}
          description={getDateRangeLabel()}
        />
        <StatsCard
          title="Huéspedes Totales"
          value={occupancyStats.totalGuests.toString()}
          icon={Users}
          description={getDateRangeLabel()}
        />
        <StatsCard
          title="Tasa de Ocupación"
          value={formatPercentage(occupancyStats.occupancyRate)}
          icon={Percent}
          description={getDateRangeLabel()}
        />
        <StatsCard
          title="Estadía Promedio"
          value={`${occupancyStats.averageStayLength.toFixed(1)} días`}
          icon={TrendingUp}
          description={getDateRangeLabel()}
        />
        <StatsCard
          title="Ingreso por Noche"
          value={formatCurrency(occupancyStats.averageRevenuePerNight)}
          icon={Home}
          description={getDateRangeLabel()}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OccupancyChart data={monthlyStats} />
        <RevenueChart data={monthlyStats} />
      </div>

      {/* Season Comparison */}
      <SeasonComparisonChart data={seasonStats} />

      {/* Cabin Performance */}
      <CabinPerformanceTable data={cabinStats} />
    </div>
  );
};

export default Analytics;
