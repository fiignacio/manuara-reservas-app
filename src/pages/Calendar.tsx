import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import ReservationModal from '@/components/ReservationModal';
import { Reservation } from '@/types/reservation';
import { getAllReservations } from '@/lib/reservationService';

const Calendar = () => {
  const { toast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getAllReservations();
      setReservations(data);
      
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

  const getCabinColor = (cabinType: string) => {
    switch (cabinType) {
      case 'Cabaña Pequeña (Max 3p)':
        return 'hsl(var(--cabin-small))';
      case 'Cabaña Mediana 1 (Max 4p)':
        return 'hsl(var(--cabin-medium1))';
      case 'Cabaña Mediana 2 (Max 4p)':
        return 'hsl(var(--cabin-medium2))';
      case 'Cabaña Grande (Max 6p)':
        return 'hsl(var(--cabin-large))';
      default:
        return 'hsl(var(--primary))';
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
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

    reservations.forEach(reservation => {
      // Fechas inclusivas: tanto check-in como check-out deben ser visibles
      const startIndex = days.findIndex(day => 
        day.toISOString().split('T')[0] === reservation.checkIn
      );
      const endIndex = days.findIndex(day => 
        day.toISOString().split('T')[0] === reservation.checkOut
      );

      if (startIndex >= 0 && (endIndex >= 0 || new Date(reservation.checkOut) > days[days.length - 1])) {
        const actualEndIndex = endIndex >= 0 ? endIndex : days.length - 1;
        
        // Find available row to avoid conflicts
        let row = 0;
        let conflictFound = true;
        while (conflictFound) {
          conflictFound = processedReservations.some(existing => 
            existing.row === row &&
            !(actualEndIndex < existing.startIndex || startIndex > existing.endIndex)
          );
          if (conflictFound) row++;
        }

        // Create segments for reservations that span multiple weeks
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

    return processedReservations;
  };

  const reservationBlocks = processReservationsForCalendar();

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

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-foreground">Calendario</h1>
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
              <div className="grid grid-cols-7 gap-2 relative">
                {/* Calendar days */}
                {days.map((day, index) => {
                  const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                  const isToday = day.toDateString() === new Date().toDateString();

                  return (
                    <div
                      key={index}
                      className={`
                        calendar-cell min-h-[80px] p-2 border border-border/50 relative
                        ${!isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''}
                        ${isToday ? 'bg-primary/10 border-primary' : ''}
                      `}
                      style={{ 
                        minHeight: `${80 + Math.max(0, reservationBlocks.filter(block => 
                          block.segments.some(segment => 
                            segment.startIndex <= index && segment.endIndex >= index
                          )
                        ).length * 28)}px` 
                      }}
                    >
                      <div className="text-sm font-medium mb-1 relative z-10">
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}

                {/* Continuous reservation blocks */}
                {reservationBlocks.map((block, blockIndex) => 
                  block.segments.map((segment, segmentIndex) => {
                    const startCol = segment.startIndex % 7;
                    const endCol = segment.endIndex % 7;
                    const weekRow = Math.floor(segment.startIndex / 7);
                    const segmentWidth = endCol - startCol + 1;
                    
                    return (
                      <div
                        key={`${block.reservation.id}-${segmentIndex}`}
                        className="absolute z-20 reservation-continuous cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        style={{
                          left: `${(startCol * 100) / 7 + 0.5}%`,
                          width: `${(segmentWidth * 100) / 7 - 1}%`,
                          top: `${weekRow * (80 + Math.max(0, reservationBlocks.filter(b => 
                            b.segments.some(s => s.weekRow === weekRow)
                          ).length * 28)) + 20 + block.row * 28}px`,
                          height: '24px'
                        }}
                        onClick={() => handleReservationClick(block.reservation)}
                      >
                        <div 
                          className="h-full w-full rounded-md px-2 py-1 text-white text-xs font-medium shadow-sm flex items-center justify-between overflow-hidden"
                          style={{
                            background: `linear-gradient(135deg, ${getCabinColor(block.reservation.cabinType)}, ${getCabinColor(block.reservation.cabinType)}dd)`
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
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--cabin-small))' }}></div>
              <span className="text-sm">Cabaña Pequeña</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--cabin-medium1))' }}></div>
              <span className="text-sm">Cabaña Mediana 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--cabin-medium2))' }}></div>
              <span className="text-sm">Cabaña Mediana 2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--cabin-large))' }}></div>
              <span className="text-sm">Cabaña Grande</span>
            </div>
          </div>
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