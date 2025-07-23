
import { useState, useEffect } from 'react';
import { Plus, LogIn, LogOut, CalendarDays, Users, Clock, AlertTriangle, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReservationModal from '@/components/ReservationModal';
import { Reservation } from '@/types/reservation';
import { 
  getTodayArrivals, 
  getTodayDepartures, 
  getAllReservations, 
  getUpcomingArrivals, 
  getUpcomingDepartures,
  getTomorrowDepartures, 
  getArrivalsForDate 
} from '@/lib/reservationService';
import { formatDateForDisplay, getTomorrowDate } from '@/lib/dateUtils';

const Dashboard = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<Reservation[]>([]);
  const [todayDepartures, setTodayDepartures] = useState<Reservation[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<Reservation[]>([]);
  const [upcomingDepartures, setUpcomingDepartures] = useState<Reservation[]>([]);
  const [tomorrowDepartures, setTomorrowDepartures] = useState<Reservation[]>([]);
  const [tomorrowArrivals, setTomorrowArrivals] = useState<Reservation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastDataUpdate, setLastDataUpdate] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data...');
      
      const tomorrow = getTomorrowDate();
      console.log('Tomorrow date for dashboard:', tomorrow);
      
      const [allReservations, arrivals, departures, upcomingArr, upcomingDep, tomorrowDeps, tomorrowArrs] = await Promise.all([
        getAllReservations(),
        getTodayArrivals(),
        getTodayDepartures(),
        getUpcomingArrivals(5),
        getUpcomingDepartures(5),
        getTomorrowDepartures(),
        getArrivalsForDate(tomorrow)
      ]);
      
      console.log('Dashboard data loaded:', {
        totalReservations: allReservations.length,
        todayArrivals: arrivals.length,
        todayDepartures: departures.length,
        upcomingArrivals: upcomingArr.length,
        upcomingDepartures: upcomingDep.length,
        tomorrowDepartures: tomorrowDeps.length,
        tomorrowArrivals: tomorrowArrs.length
      });
      
      setReservations(allReservations);
      setTodayArrivals(arrivals);
      setTodayDepartures(departures);
      setUpcomingArrivals(upcomingArr);
      setUpcomingDepartures(upcomingDep);
      setTomorrowDepartures(tomorrowDeps);
      setTomorrowArrivals(tomorrowArrs);
      setLastDataUpdate(new Date().toLocaleTimeString('es-CL'));
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const hasSameDayConflict = (departure: Reservation): boolean => {
    const hasConflict = tomorrowArrivals.some(arrival => arrival.cabinType === departure.cabinType);
    if (hasConflict) {
      console.log(`Conflict detected for ${departure.cabinType}: departure ${departure.id} vs arrival ${tomorrowArrivals.find(a => a.cabinType === departure.cabinType)?.id}`);
    }
    return hasConflict;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground capitalize">{today}</p>
          {lastDataUpdate && (
            <p className="text-xs text-muted-foreground">
              Última actualización: {lastDataUpdate}
            </p>
          )}
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="btn-cabin w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservas</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reservations.length}</div>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Llegadas Hoy</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayArrivals.length}</div>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Salidas Mañana</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{tomorrowDepartures.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {getTomorrowDate()}
            </p>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Huéspedes Actuales</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {reservations.filter(r => {
                const today = new Date().toISOString().split('T')[0];
                return r.checkIn <= today && r.checkOut > today;
              }).reduce((acc, r) => acc + r.adults + r.children, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arrivals Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Arrivals */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-green-600" />
              Llegadas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : todayArrivals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay llegadas programadas para hoy
              </div>
            ) : (
              <div className="space-y-4">
                {todayArrivals.map((reservation) => (
                  <div key={reservation.id} className="alert-today">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{reservation.passengerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.cabinType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vuelo: {reservation.arrivalFlight}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {reservation.adults + reservation.children}p
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Arrivals */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Llegadas de Mañana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : tomorrowArrivals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay llegadas programadas para mañana
              </div>
            ) : (
              <div className="space-y-4">
                {tomorrowArrivals.map((reservation) => (
                  <div key={reservation.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{reservation.passengerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.cabinType}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          {formatDateForDisplay(reservation.checkIn)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vuelo: {reservation.arrivalFlight}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {reservation.adults + reservation.children}p
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next 5 Days Arrivals */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Próximas Llegadas (5 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : upcomingArrivals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay llegadas programadas para los próximos 5 días
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {upcomingArrivals.map((reservation) => (
                  <div key={reservation.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{reservation.passengerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.cabinType}
                        </p>
                        <p className="text-sm text-purple-600 font-medium">
                          {formatDateForDisplay(reservation.checkIn)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vuelo: {reservation.arrivalFlight}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {reservation.adults + reservation.children}p
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Dashboard;
