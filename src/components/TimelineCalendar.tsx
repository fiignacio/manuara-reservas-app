
import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Eye, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Reservation } from '@/types/reservation';
import { formatDateForDisplay, parseDate, getDaysBetween, isSameDate, formatDateToISO } from '@/lib/dateUtils';

interface TimelineCalendarProps {
  reservations: Reservation[];
  onReservationClick: (reservation: Reservation) => void;
  loading: boolean;
}

const CABIN_TYPES = [
  'Cabaña Pequeña (Max 3p)',
  'Cabaña Mediana 1 (Max 4p)',
  'Cabaña Mediana 2 (Max 4p)',
  'Cabaña Grande (Max 6p)'
];

const TimelineCalendar = ({ reservations, onReservationClick, loading }: TimelineCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [dayWidth, setDayWidth] = useState(40);

  const getCabinColor = (cabinType: string) => {
    switch (cabinType) {
      case 'Cabaña Pequeña (Max 3p)':
        return 'bg-blue-500';
      case 'Cabaña Mediana 1 (Max 4p)':
        return 'bg-purple-500';
      case 'Cabaña Mediana 2 (Max 4p)':
        return 'bg-amber-500';
      case 'Cabaña Grande (Max 6p)':
        return 'bg-pink-500';
      default:
        return 'bg-emerald-500';
    }
  };

  const getTimelineDates = () => {
    const start = new Date(currentDate);
    if (viewMode === 'month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    } else {
      start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    }

    const dates = [];
    const totalDays = viewMode === 'month' ? 42 : 7;
    
    for (let i = 0; i < totalDays; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const timelineDates = getTimelineDates();

  const getReservationPosition = (reservation: Reservation) => {
    const checkInDate = reservation.checkIn;
    const checkOutDate = reservation.checkOut;
    
    const startIndex = timelineDates.findIndex(date => 
      isSameDate(date, checkInDate)
    );
    const endIndex = timelineDates.findIndex(date => 
      isSameDate(date, checkOutDate)
    );

    if (startIndex === -1 && endIndex === -1) {
      // Check if reservation overlaps with visible period
      const firstDateStr = formatDateToISO(timelineDates[0]);
      const lastDateStr = formatDateToISO(timelineDates[timelineDates.length - 1]);
      
      if (checkInDate <= lastDateStr && checkOutDate >= firstDateStr) {
        const actualStart = checkInDate < firstDateStr ? 0 : startIndex;
        const actualEnd = checkOutDate > lastDateStr ? timelineDates.length - 1 : endIndex;
        return { startIndex: actualStart, endIndex: actualEnd, width: (actualEnd - actualStart + 1) * dayWidth };
      }
      return null;
    }

    const actualStart = Math.max(0, startIndex);
    const actualEnd = Math.min(timelineDates.length - 1, endIndex >= 0 ? endIndex : timelineDates.length - 1);
    
    return {
      startIndex: actualStart,
      endIndex: actualEnd,
      width: (actualEnd - actualStart + 1) * dayWidth
    };
  };

  const processReservationsForTimeline = () => {
    const cabinReservations: { [key: string]: Array<{ reservation: Reservation; position: any; row: number }> } = {};

    CABIN_TYPES.forEach(cabinType => {
      cabinReservations[cabinType] = [];
    });

    const filteredReservations = reservations.filter(reservation => {
      const position = getReservationPosition(reservation);
      return position !== null;
    });

    filteredReservations.forEach(reservation => {
      const position = getReservationPosition(reservation);
      if (!position) return;

      const cabinType = reservation.cabinType;
      const cabinReservationList = cabinReservations[cabinType];

      // Find available row for this reservation
      let row = 0;
      let canPlace = false;

      while (!canPlace) {
        canPlace = true;
        for (const existing of cabinReservationList) {
          if (existing.row === row) {
            // Check if positions overlap
            const existingStart = existing.position.startIndex;
            const existingEnd = existing.position.endIndex;
            const newStart = position.startIndex;
            const newEnd = position.endIndex;

            if (newStart <= existingEnd && newEnd >= existingStart) {
              canPlace = false;
              break;
            }
          }
        }
        if (!canPlace) row++;
      }

      cabinReservationList.push({
        reservation,
        position,
        row
      });
    });

    return cabinReservations;
  };

  const processedReservations = processReservationsForTimeline();

  const navigateTime = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      } else {
        newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const adjustZoom = (direction: 'in' | 'out') => {
    setDayWidth(prev => {
      if (direction === 'in') {
        return Math.min(prev + 10, 80);
      } else {
        return Math.max(prev - 10, 20);
      }
    });
  };

  const formatPeriodLabel = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
    } else {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  };

  if (loading) {
    return (
      <Card className="card-cabin">
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">Cargando timeline...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-cabin">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="text-lg">Timeline de Reservas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTime('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium capitalize min-w-[200px] text-center">
                {formatPeriodLabel()}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateTime('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              Mes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustZoom('out')}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => adjustZoom('in')}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              Hoy
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex">
          {/* Cabin Labels */}
          <div className="w-48 border-r border-border/50 bg-muted/30">
            {/* Date header spacer */}
            <div className="h-12 border-b border-border/50 flex items-center px-4">
              <span className="text-sm font-medium text-muted-foreground">Cabañas</span>
            </div>
            
            {/* Cabin rows */}
            {CABIN_TYPES.map((cabinType) => {
              const maxRows = Math.max(1, processedReservations[cabinType]?.length > 0 ? 
                Math.max(...processedReservations[cabinType].map(r => r.row)) + 1 : 1);
              const rowHeight = Math.max(60, maxRows * 35);
              
              return (
                <div 
                  key={cabinType} 
                  className="border-b border-border/50 flex items-center px-4 bg-background"
                  style={{ height: `${rowHeight}px` }}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${getCabinColor(cabinType)}`}
                    ></div>
                    <span className="text-sm font-medium">
                      {cabinType.split(' (')[0]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline Content */}
          <ScrollArea className="flex-1">
            <div style={{ width: `${timelineDates.length * dayWidth}px` }}>
              {/* Date Headers */}
              <div className="h-12 border-b border-border/50 flex bg-muted/30 sticky top-0 z-10">
                {timelineDates.map((date, index) => {
                  const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                  const isToday = isSameDate(date, formatDateToISO(new Date()));
                  
                  return (
                    <div
                      key={index}
                      className={`
                        flex flex-col items-center justify-center border-r border-border/50 text-xs
                        ${!isCurrentMonth && viewMode === 'month' ? 'text-muted-foreground bg-muted/20' : ''}
                        ${isToday ? 'bg-primary/10 text-primary font-medium' : ''}
                      `}
                      style={{ width: `${dayWidth}px` }}
                    >
                      <div className="font-medium">{date.getDate()}</div>
                      <div className="text-xs opacity-70">
                        {date.toLocaleDateString('es-CL', { weekday: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cabin Rows with Reservations */}
              {CABIN_TYPES.map((cabinType) => {
                const cabinReservations = processedReservations[cabinType] || [];
                const maxRows = Math.max(1, cabinReservations.length > 0 ? 
                  Math.max(...cabinReservations.map(r => r.row)) + 1 : 1);
                const rowHeight = Math.max(60, maxRows * 35);
                
                return (
                  <div 
                    key={cabinType} 
                    className="border-b border-border/50 relative bg-background"
                    style={{ height: `${rowHeight}px` }}
                  >
                    {/* Day grid lines */}
                    {timelineDates.map((_, index) => (
                      <div
                        key={index}
                        className="absolute top-0 border-r border-border/20"
                        style={{
                          left: `${index * dayWidth}px`,
                          width: '1px',
                          height: '100%'
                        }}
                      />
                    ))}
                    
                    {/* Reservation bars */}
                    {cabinReservations.map((item, index) => (
                      <div
                        key={`${item.reservation.id}-${index}`}
                        className={`
                          absolute cursor-pointer hover:scale-[1.02] transition-transform duration-200
                          ${getCabinColor(cabinType)} text-white rounded-md shadow-sm
                          flex items-center px-2 py-1 text-xs font-medium
                        `}
                        style={{
                          left: `${item.position.startIndex * dayWidth + 2}px`,
                          width: `${item.position.width - 4}px`,
                          top: `${8 + item.row * 35}px`,
                          height: '28px'
                        }}
                        onClick={() => onReservationClick(item.reservation)}
                        title={`${item.reservation.passengerName} - ${formatDateForDisplay(item.reservation.checkIn)} al ${formatDateForDisplay(item.reservation.checkOut)}`}
                      >
                        <div className="truncate flex-1">
                          {item.reservation.passengerName}
                        </div>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {getDaysBetween(item.reservation.checkIn, item.reservation.checkOut)}d
                        </Badge>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineCalendar;
