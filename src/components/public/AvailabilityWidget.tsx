import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { format, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isBefore, isToday, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateToISO } from '@/lib/dateUtils';
import { usePublicAvailability } from '@/hooks/usePublicAvailability';
import { AvailabilityLegend } from './AvailabilityLegend';
import { CabinSelector } from './CabinSelector';
import type { AvailabilityWidgetProps, AvailabilityStatus, CabinInfo } from './types';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];

export const AvailabilityWidget: React.FC<AvailabilityWidgetProps> = ({
  onDateRangeSelect,
  onCabinSelect,
  theme = 'light',
  showLegend = true,
  showCabinSelector = true,
  minDate,
  maxMonthsAhead = 6,
  className
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCheckIn, setSelectedCheckIn] = useState<string | null>(null);
  const [selectedCheckOut, setSelectedCheckOut] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Calculate date range for availability query (current view + 2 months buffer)
  const queryStartDate = useMemo(() => {
    const start = startOfMonth(currentMonth);
    return formatDateToISO(start);
  }, [currentMonth]);

  const queryEndDate = useMemo(() => {
    const end = endOfMonth(addMonths(currentMonth, 2));
    return formatDateToISO(end);
  }, [currentMonth]);

  const { availability, cabins, loading, error } = usePublicAvailability(queryStartDate, queryEndDate);

  // Get availability status for a specific date
  const getDateStatus = useCallback((dateStr: string): AvailabilityStatus => {
    const today = formatDateToISO(new Date());
    
    if (dateStr < today) return 'past';
    
    const dayData = availability.find(d => d.date === dateStr);
    if (!dayData) return 'none';
    
    if (dayData.availableCabins === dayData.totalCabins) return 'full';
    if (dayData.availableCabins > 0) return 'partial';
    return 'none';
  }, [availability]);

  // Generate calendar days for current month view
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    const prevMonth = addMonths(currentMonth, -1);
    const today = new Date();
    if (prevMonth >= startOfMonth(today)) {
      setCurrentMonth(prevMonth);
    }
  };

  const goToNextMonth = () => {
    const maxDate = addMonths(new Date(), maxMonthsAhead);
    const nextMonth = addMonths(currentMonth, 1);
    if (nextMonth <= maxDate) {
      setCurrentMonth(nextMonth);
    }
  };

  // Date selection handlers
  const handleDateClick = (date: Date) => {
    const dateStr = formatDateToISO(date);
    const today = formatDateToISO(new Date());
    
    // Don't allow selecting past dates
    if (dateStr < today) return;
    
    if (!selectedCheckIn || (selectedCheckIn && selectedCheckOut)) {
      // Start new selection
      setSelectedCheckIn(dateStr);
      setSelectedCheckOut(null);
    } else {
      // Complete selection
      if (dateStr < selectedCheckIn) {
        setSelectedCheckIn(dateStr);
        setSelectedCheckOut(selectedCheckIn);
      } else if (dateStr > selectedCheckIn) {
        setSelectedCheckOut(dateStr);
        onDateRangeSelect?.(selectedCheckIn, dateStr);
      }
    }
  };

  const handleDateHover = (date: Date) => {
    if (selectedCheckIn && !selectedCheckOut) {
      setHoverDate(formatDateToISO(date));
    }
  };

  const clearSelection = () => {
    setSelectedCheckIn(null);
    setSelectedCheckOut(null);
    setHoverDate(null);
  };

  const handleCabinSelect = (cabin: CabinInfo) => {
    if (selectedCheckIn && selectedCheckOut && onCabinSelect) {
      onCabinSelect(cabin, selectedCheckIn, selectedCheckOut);
    }
  };

  // Check if a date is in the selected range
  const isInRange = (dateStr: string): boolean => {
    if (!selectedCheckIn) return false;
    
    const endDate = selectedCheckOut || hoverDate;
    if (!endDate) return dateStr === selectedCheckIn;
    
    const start = selectedCheckIn < endDate ? selectedCheckIn : endDate;
    const end = selectedCheckIn < endDate ? endDate : selectedCheckIn;
    
    return dateStr >= start && dateStr <= end;
  };

  // Get cell styling based on status and selection
  const getCellClasses = (date: Date, dateStr: string, status: AvailabilityStatus): string => {
    const isSelected = dateStr === selectedCheckIn || dateStr === selectedCheckOut;
    const inRange = isInRange(dateStr);
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isPast = status === 'past';
    
    const baseClasses = 'w-full aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all';
    
    if (!isCurrentMonth) {
      return cn(baseClasses, 'text-muted-foreground/30');
    }
    
    if (isPast) {
      return cn(baseClasses, 'bg-muted text-muted-foreground cursor-not-allowed');
    }
    
    if (isSelected) {
      return cn(baseClasses, 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2');
    }
    
    if (inRange) {
      return cn(baseClasses, 'bg-primary/20 text-primary-foreground');
    }
    
    // Status-based colors
    switch (status) {
      case 'full':
        return cn(baseClasses, 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200 cursor-pointer');
      case 'partial':
        return cn(baseClasses, 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 cursor-pointer');
      case 'none':
        return cn(baseClasses, 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 cursor-pointer');
      default:
        return cn(baseClasses, 'bg-muted text-muted-foreground');
    }
  };

  // Get tooltip text for a date
  const getTooltip = (dateStr: string, status: AvailabilityStatus): string => {
    const dayData = availability.find(d => d.date === dateStr);
    
    if (status === 'past') return 'Fecha pasada';
    if (!dayData) return 'Sin datos';
    
    return `${dayData.availableCabins}/${dayData.totalCabins} cabañas disponibles`;
  };

  const canGoPrev = currentMonth > startOfMonth(new Date());
  const canGoNext = currentMonth < addMonths(new Date(), maxMonthsAhead - 1);

  return (
    <Card className={cn('w-full max-w-md', className, theme === 'dark' && 'dark')}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            disabled={!canGoPrev}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <CardTitle className="text-lg capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: es })}
          </CardTitle>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedCheckIn && (
          <div className="flex items-center justify-between mt-2 text-sm">
            <span className="text-muted-foreground">
              {selectedCheckOut 
                ? `${selectedCheckIn} → ${selectedCheckOut}`
                : `Check-in: ${selectedCheckIn} (selecciona check-out)`
              }
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-6 px-2 text-xs">
              Limpiar
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando disponibilidad...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-destructive mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {WEEKDAYS.map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map(date => {
                const dateStr = formatDateToISO(date);
                const status = getDateStatus(dateStr);
                const isCurrentMonth = isSameMonth(date, currentMonth);
                
                return (
                  <button
                    key={dateStr}
                    onClick={() => isCurrentMonth && status !== 'past' && handleDateClick(date)}
                    onMouseEnter={() => handleDateHover(date)}
                    className={getCellClasses(date, dateStr, status)}
                    disabled={!isCurrentMonth || status === 'past'}
                    title={isCurrentMonth ? getTooltip(dateStr, status) : undefined}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
            
            {/* Legend */}
            {showLegend && (
              <AvailabilityLegend className="mt-4" />
            )}
            
            {/* Cabin selector */}
            {showCabinSelector && selectedCheckIn && selectedCheckOut && (
              <CabinSelector
                checkIn={selectedCheckIn}
                checkOut={selectedCheckOut}
                availability={availability}
                cabins={cabins}
                onCabinSelect={handleCabinSelect}
                onClear={clearSelection}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityWidget;
