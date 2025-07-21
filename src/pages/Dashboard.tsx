
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
  getTomorrowDepartures, 
  getArrivalsForDate 
} from '@/lib/reservationService';
import { formatDateForDisplay, getTomorrowDate } from '@/lib/dateUtils';

const Dashboard = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<Reservation[]>([]);
  const [todayDepartures, setTodayDepartures] = useState<Reservation[]>([]);
  const [upcomingArrivals, setUpcomingArrivals] = useState<Reservation[]>([]);
  const [tomorrowDepartures, setTomorrowDepartures] = useState<Reservation[]>([]);
  const [tomorrowArrivals, setTomorrowArrivals] = useState<Reservation[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const tomorrow = getTomorrowDate();
      const [allReservations, arrivals, departures, upcoming, tomorrowDeps, tomorrowArrs] = await Promise.all([
        getAllReservations(),
        getTodayArrivals(),
        getTodayDepartures(),
        getUpcomingArrivals(5),
        getTomorrowDepartures(),
        getArrivalsForDate(tomorrow)
      ]);
      
      setReservations(allReservations);
      setTodayArrivals(arrivals);
      setTodayDepartures(departures);
      setUpcomingArrivals(upcoming);
      setTomorrowDepartures(tomorrowDeps);
      setTomorrowArrivals(tomorrowArrs);
    } catch (error) {
      console.error('Error loading data:', error);
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
    return tomorrowArrivals.some(arrival => arrival.cabinType === departure.cabinType);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground capitalize">{today}</p>
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

      {/* Today's Activities and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Arrivals Today */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogIn className="w-5 h-5 text-green-600" />
              Llegadas para Hoy
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
                        {reservation.adults + reservation.children} personas
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tomorrow's Departures */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Salidas para Mañana
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : tomorrowDepartures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay salidas programadas para mañana
              </div>
            ) : (
              <div className="space-y-4">
                {tomorrowDepartures.map((reservation) => (
                  <div key={reservation.id} className="alert-today">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{reservation.passengerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.cabinType}
                        </p>
                        <p className="text-sm font-medium text-orange-600">
                          Vuelo: {reservation.departureFlight}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">
                          {reservation.adults + reservation.children} personas
                        </Badge>
                        {hasSameDayConflict(reservation) && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Llegada mismo día
                          </Badge>
                        )}
                      </div>
                    </div>
                    {hasSameDayConflict(reservation) && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          ⚠️ Hay una nueva llegada programada para la misma cabaña mañana. 
                          El huésped debe dejar la cabaña más temprano.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Arrivals */}
      <Card className="card-cabin">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingArrivals.map((reservation) => (
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

      <ReservationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
};

export default Dashboard;
