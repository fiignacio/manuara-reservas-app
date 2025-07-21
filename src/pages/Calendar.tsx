
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Edit, Trash2, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import ReservationModal from '@/components/ReservationModal';
import { Reservation } from '@/types/reservation';
import { getAllReservations, deleteReservation } from '@/lib/reservationService';
import { formatDateForDisplay } from '@/lib/dateUtils';

const Calendar = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCabin, setFilterCabin] = useState('all');
  const [sortBy, setSortBy] = useState('checkIn');

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getAllReservations();
      setReservations(data);
      setFilteredReservations(data);
      
      if (data.length > 0) {
        toast({
          title: "📊 Calendario actualizado",
          description: `Se han cargado ${data.length} reserva${data.length === 1 ? '' : 's'} exitosamente.`
        });
      }
    } catch (error) {
      console.error('Error loading reservations:', error);
      toast({
        title: "⚠️ Error al cargar reservas",
        description: "No se pudieron cargar las reservas desde la base de datos. Por favor, verifica la conexión.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    let filtered = [...reservations];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por tipo de cabaña
    if (filterCabin !== 'all') {
      filtered = filtered.filter(r => r.cabinType === filterCabin);
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'checkIn':
          return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
        case 'checkOut':
          return new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime();
        case 'passengerName':
          return a.passengerName.localeCompare(b.passengerName);
        case 'totalPrice':
          return b.totalPrice - a.totalPrice;
        default:
          return 0;
      }
    });

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, filterCabin, sortBy]);

  const getCabinColor = (cabinType: string) => {
    switch (cabinType) {
      case 'Cabaña Pequeña (Max 3p)':
        return '#3B82F6'; // Blue
      case 'Cabaña Mediana 1 (Max 4p)':
        return '#8B5CF6'; // Purple
      case 'Cabaña Mediana 2 (Max 4p)':
        return '#F59E0B'; // Orange
      case 'Cabaña Grande (Max 6p)':
        return '#EC4899'; // Pink
      default:
        return '#10B981'; // Green
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const processReservationsForCalendar = () => {
    const days = getDaysInMonth(currentDate);
    const processedReservations: Array<{
      reservation: Reservation;
      startIndex: number;
      endIndex: number;
      row: number;
      segments: Array<{ startIndex: number; endIndex: number; weekRow: number }>;
    }> = [];

    // Filtrar reservas que están en el mes actual
    const monthReservations = reservations.filter(reservation => {
      const checkIn = new Date(reservation.checkIn + 'T12:00:00');
      const checkOut = new Date(reservation.checkOut + 'T12:00:00');
      const monthStart = days[0];
      const monthEnd = days[days.length - 1];
      
      return checkIn <= monthEnd && checkOut >= monthStart;
    });

    // Crear una matriz para rastrear ocupación por día y fila
    const occupancyMatrix: boolean[][] = Array(42).fill(null).map(() => Array(10).fill(false));

    monthReservations.forEach(reservation => {
      const checkIn = new Date(reservation.checkIn + 'T12:00:00');
      const checkOut = new Date(reservation.checkOut + 'T12:00:00');

      const startIndex = days.findIndex(day => 
        day.toISOString().split('T')[0] === checkIn.toISOString().split('T')[0]
      );
      const endIndex = days.findIndex(day => 
        day.toISOString().split('T')[0] === checkOut.toISOString().split('T')[0]
      );

      if (startIndex >= 0 && (endIndex >= 0 || checkOut > days[days.length - 1])) {
        const actualEndIndex = endIndex >= 0 ? endIndex : days.length - 1;
        
        // Encontrar la primera fila disponible
        let row = 0;
        let canPlace = false;
        
        while (row < 10 && !canPlace) {
          canPlace = true;
          for (let dayIndex = startIndex; dayIndex <= actualEndIndex; dayIndex++) {
            if (occupancyMatrix[dayIndex][row]) {
              canPlace = false;
              break;
            }
          }
          if (!canPlace) row++;
        }

        // Marcar los días como ocupados en esta fila
        for (let dayIndex = startIndex; dayIndex <= actualEndIndex; dayIndex++) {
          occupancyMatrix[dayIndex][row] = true;
        }

        // Crear segmentos para reservas que abarcan múltiples semanas
        const segments = [];
        let currentStart = startIndex;
        
        while (currentStart <= actualEndIndex) {
          const weekRow = Math.floor(currentStart / 7);
          const weekEnd = Math.min((weekRow + 1) * 7 - 1, actualEndIndex);
          
          segments.push({
            startIndex: currentStart,
            endIndex: weekEnd,
            weekRow
          });
          
          currentStart = weekEnd + 1;
        }

        processedReservations.push({
          reservation,
          startIndex,
          endIndex: actualEndIndex,
          row,
          segments
        });
      }
    });

    return { processedReservations, occupancyMatrix };
  };

  const { processedReservations, occupancyMatrix } = processReservationsForCalendar();

  // Calcular la altura máxima necesaria para cada fila de semana
  const getMaxRowsForWeek = (weekIndex: number) => {
    let maxRows = 0;
    for (let day = weekIndex * 7; day < (weekIndex + 1) * 7; day++) {
      const rowsInDay = occupancyMatrix[day] ? occupancyMatrix[day].map((occupied, index) => occupied ? index : -1).reduce((last, current) => current > last ? current : last, -1) + 1 : 0;
      maxRows = Math.max(maxRows, rowsInDay);
    }
    return Math.max(maxRows, 1);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('es-CL', { 
    month: 'long', 
    year: 'numeric' 
  });

  const handleReservationClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteReservation(id);
      toast({
        title: "Éxito",
        description: "Reserva eliminada correctamente."
      });
      loadReservations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la reserva.",
        variant: "destructive"
      });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  const getSeasonBadge = (season: string) => {
    return season === 'Alta' ? 'destructive' : 'secondary';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Calendario & Reservas</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-lg font-medium capitalize min-w-[200px] text-center">
              {monthName}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="ml-2"
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Hoy
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="btn-cabin w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>

      {/* Calendar */}
      <Card className="card-cabin">
        <CardContent className="p-6">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando calendario...</div>
          ) : (
            <div className="relative">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, weekIndex) => {
                  const maxRows = getMaxRowsForWeek(weekIndex);
                  const weekHeight = 60 + (maxRows * 30);
                  
                  return (
                    <div key={weekIndex} className="grid grid-cols-7 gap-2 relative" style={{ height: `${weekHeight}px` }}>
                      {/* Week days */}
                      {days.slice(weekIndex * 7, (weekIndex + 1) * 7).map((day, dayIndex) => {
                        const dayIndexInMonth = weekIndex * 7 + dayIndex;
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                        const isToday = day.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={dayIndexInMonth}
                            className={`
                              calendar-cell p-2 border border-border/50 relative
                              ${!isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''}
                              ${isToday ? 'bg-primary/10 border-primary' : ''}
                            `}
                            style={{ height: `${weekHeight}px` }}
                          >
                            <div className="text-sm font-medium mb-1 relative z-10">
                              {day.getDate()}
                            </div>
                          </div>
                        );
                      })}

                      {/* Reservation blocks for this week */}
                      {processedReservations
                        .filter(block => block.segments.some(segment => segment.weekRow === weekIndex))
                        .map((block, blockIndex) => 
                          block.segments
                            .filter(segment => segment.weekRow === weekIndex)
                            .map((segment, segmentIndex) => {
                              const startCol = segment.startIndex % 7;
                              const endCol = segment.endIndex % 7;
                              const segmentWidth = endCol - startCol + 1;
                              
                              return (
                                <div
                                  key={`${block.reservation.id}-${weekIndex}-${segmentIndex}`}
                                  className="absolute z-20 reservation-continuous cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                                  style={{
                                    left: `${(startCol * 100) / 7 + 0.5}%`,
                                    width: `${(segmentWidth * 100) / 7 - 1}%`,
                                    top: `${35 + block.row * 30}px`,
                                    height: '24px'
                                  }}
                                  onClick={() => handleReservationClick(block.reservation)}
                                  title={`${block.reservation.passengerName} - ${formatDateForDisplay(block.reservation.checkIn)} al ${formatDateForDisplay(block.reservation.checkOut)}`}
                                >
                                  <div 
                                    className="h-full w-full rounded-md px-2 py-1 text-white text-xs font-medium shadow-sm flex items-center justify-between overflow-hidden"
                                    style={{
                                      backgroundColor: getCabinColor(block.reservation.cabinType),
                                      color: 'white'
                                    }}
                                  >
                                    {segmentIndex === 0 && (
                                      <>
                                        <span className="truncate">{block.reservation.passengerName}</span>
                                        <span className="text-xs opacity-90 ml-1">
                                          {block.reservation.cabinType.split(' ')[1]}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="card-cabin">
        <CardHeader>
          <CardTitle className="text-lg">Leyenda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-primary/10 border border-primary rounded"></div>
              <span className="text-sm">Día actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
              <span className="text-sm">Cabaña Pequeña</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
              <span className="text-sm">Cabaña Mediana 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#F59E0B' }}></div>
              <span className="text-sm">Cabaña Mediana 2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#EC4899' }}></div>
              <span className="text-sm">Cabaña Grande</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card className="card-cabin">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filterCabin} onValueChange={setFilterCabin}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por cabaña" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las cabañas</SelectItem>
                <SelectItem value="Cabaña Pequeña (Max 3p)">Cabaña Pequeña</SelectItem>
                <SelectItem value="Cabaña Mediana 1 (Max 4p)">Cabaña Mediana 1</SelectItem>
                <SelectItem value="Cabaña Mediana 2 (Max 4p)">Cabaña Mediana 2</SelectItem>
                <SelectItem value="Cabaña Grande (Max 6p)">Cabaña Grande</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkIn">Fecha de entrada</SelectItem>
                <SelectItem value="checkOut">Fecha de salida</SelectItem>
                <SelectItem value="passengerName">Nombre</SelectItem>
                <SelectItem value="totalPrice">Precio</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {filteredReservations.length} resultados
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card className="card-cabin">
        <CardHeader>
          <CardTitle className="text-lg">Lista de Reservas</CardTitle>
          <p className="text-muted-foreground">
            {filteredReservations.length} de {reservations.length} reservas
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando reservas...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {reservations.length === 0 ? 'No hay reservas registradas' : 'No se encontraron reservas con los filtros aplicados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Pasajero</th>
                    <th className="p-4 font-medium">Check-in</th>
                    <th className="p-4 font-medium">Check-out</th>
                    <th className="p-4 font-medium">Cabaña</th>
                    <th className="p-4 font-medium">Huéspedes</th>
                    <th className="p-4 font-medium">Temporada</th>
                    <th className="p-4 font-medium">Vuelos</th>
                    <th className="p-4 font-medium">Precio</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getCabinColor(reservation.cabinType) }}
                          ></div>
                          <div className="font-medium">{reservation.passengerName}</div>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {formatDateForDisplay(reservation.checkIn)}
                      </td>
                      <td className="p-4 text-sm">
                        {formatDateForDisplay(reservation.checkOut)}
                      </td>
                      <td className="p-4 text-sm">
                        {reservation.cabinType.split(' (')[0]}
                      </td>
                      <td className="p-4 text-sm">
                        {reservation.adults} + {reservation.children}
                      </td>
                      <td className="p-4">
                        <Badge variant={getSeasonBadge(reservation.season)}>
                          {reservation.season}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm">
                        <div>{reservation.arrivalFlight}</div>
                        <div>{reservation.departureFlight}</div>
                      </td>
                      <td className="p-4 font-medium text-primary">
                        ${reservation.totalPrice.toLocaleString('es-CL')}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(reservation)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará permanentemente la reserva de {reservation.passengerName}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(reservation.id!)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={loadReservations}
        reservation={selectedReservation}
      />
    </div>
  );
};

export default Calendar;
