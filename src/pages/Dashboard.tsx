
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
import { formatDateForDisplay, getTomorrowDate, getTodayDate } from '@/lib/dateUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

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
    logger.info('dashboard.loadData.start');
    logger.time('dashboard.loadData');
    
    try {
      setLoading(true);
      
      const tomorrow = getTomorrowDate();
      
      const [allReservations, arrivals, departures, upcomingArr, upcomingDep, tomorrowDeps, tomorrowArrs] = await Promise.all([
        getAllReservations(),
        getTodayArrivals(),
        getTodayDepartures(),
        getUpcomingArrivals(5),
        getUpcomingDepartures(5),
        getTomorrowDepartures(),
        getArrivalsForDate(tomorrow)
      ]);
      
      setReservations(allReservations);
      setTodayArrivals(arrivals);
      setTodayDepartures(departures);
      setUpcomingArrivals(upcomingArr);
      setUpcomingDepartures(upcomingDep);
      setTomorrowDepartures(tomorrowDeps);
      setTomorrowArrivals(tomorrowArrs);
      setLastDataUpdate(new Date().toLocaleTimeString('es-CL'));

      logger.info('dashboard.loadData.success', {
        totalReservations: allReservations.length,
        todayArrivals: arrivals.length,
        todayDepartures: departures.length,
        upcomingArrivals: upcomingArr.length,
        upcomingDepartures: upcomingDep.length,
        tomorrowDepartures: tomorrowDeps.length,
        tomorrowArrivals: tomorrowArrs.length
      });
      
    } catch (error) {
      logger.error('dashboard.loadData.error', { error: String(error) });
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del dashboard: " + (error instanceof Error ? error.message : 'Error desconocido'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      logger.timeEnd('dashboard.loadData');
    }
  };

  useEffect(() => {
    logger.info('dashboard.mount');
    loadData();
    return () => logger.info('dashboard.unmount');
  }, []);

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const [conflicts, setConflicts] = useState<Reservation[]>([]);

  const hasSameDayConflict = (departure: Reservation): boolean => {
    return tomorrowArrivals.some(arrival => arrival.cabinType === departure.cabinType);
  };

  useEffect(() => {
    const conflictingDepartures = tomorrowDepartures.filter(hasSameDayConflict);
    setConflicts(conflictingDepartures);
  }, [tomorrowDepartures, tomorrowArrivals]);

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

      {/* Conflict Alert */}
      {conflicts.length > 0 && (
        <Alert variant="destructive" className="alert-cabin">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <AlertDescription>
              <strong>¡Conflicto de recambio!</strong> Se ha detectado {conflicts.length} conflicto(s) de recambio para mañana.
              Una cabaña tiene una salida y una llegada el mismo día. Por favor, revise las reservas para evitar problemas.
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Reservas</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{reservations.length}</div>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Llegadas Hoy</CardTitle>
            <LogIn className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{todayArrivals.length}</div>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Salidas Hoy</CardTitle>
            <LogOut className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{todayDepartures.length}</div>
          </CardContent>
        </Card>

        <Card className="card-cabin">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Huéspedes Actuales</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {reservations.filter(r => {
                const today = getTodayDate();
                return r.checkIn <= today && r.checkOut > today;
              }).reduce((acc, r) => acc + r.adults + r.children, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Arrivals and Departures Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                  <div key={reservation.id} className="alert-today-success">
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

        {/* Today's Departures */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="w-5 h-5 text-red-600" />
              Salidas de Hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : todayDepartures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay salidas programadas para hoy
              </div>
            ) : (
              <div className="space-y-4">
                {todayDepartures.map((reservation) => (
                  <div key={reservation.id} className="alert-today-error">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{reservation.passengerName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {reservation.cabinType}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vuelo: {reservation.departureFlight}
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

        {/* Tomorrow's Departures */}
        <Card className="card-cabin">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Salidas de Mañana
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
                {tomorrowDepartures.map((reservation) => {
                  const conflict = hasSameDayConflict(reservation);
                  const conflictingArrival = conflict ? tomorrowArrivals.find(arrival => arrival.cabinType === reservation.cabinType) : null;

                  return (
                    <div
                      key={reservation.id}
                      className={`border rounded-lg p-4 space-y-2 ${conflict ? 'border-red-500 bg-red-50' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{reservation.passengerName}</h4>
                          <p className="text-sm text-muted-foreground">
                            {reservation.cabinType}
                          </p>
                          <p className="text-sm text-orange-600 font-medium">
                            {formatDateForDisplay(reservation.checkOut)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Vuelo: {reservation.departureFlight}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {conflict && conflictingArrival && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Llegada en conflicto:</p>
                                <p className="font-medium">{conflictingArrival.passengerName}</p>
                                <p>Vuelo: {conflictingArrival.arrivalFlight}</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Badge variant="secondary">
                            {reservation.adults + reservation.children}p
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Next 5 Days Departures - Full Width */}
      <Card className="card-cabin">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-yellow-600" />
            Próximas Salidas (5 días)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : upcomingDepartures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay salidas programadas para los próximos 5 días
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
              {upcomingDepartures.map((reservation) => (
                <div key={reservation.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{reservation.passengerName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {reservation.cabinType}
                      </p>
                      <p className="text-sm text-yellow-600 font-medium">
                        {formatDateForDisplay(reservation.checkOut)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Vuelo: {reservation.departureFlight}
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
