import React, { useMemo } from 'react';
import { Check, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { calculateNights, formatDateRange } from '@/lib/dateUtils';
import type { CabinSelectorProps, CabinInfo } from './types';

export const CabinSelector: React.FC<CabinSelectorProps> = ({
  checkIn,
  checkOut,
  availability,
  cabins,
  onCabinSelect,
  onClear
}) => {
  const nights = useMemo(() => calculateNights(checkIn, checkOut), [checkIn, checkOut]);
  
  const cabinAvailability = useMemo(() => {
    return cabins.map(cabin => {
      // Check if cabin is available for all days in the range (except checkout day)
      const relevantDays = availability.filter(day => 
        day.date >= checkIn && day.date < checkOut
      );
      
      const isAvailable = relevantDays.length > 0 && 
        relevantDays.every(day => day.cabinStatus[cabin.name] === true);
      
      return {
        cabin,
        isAvailable
      };
    });
  }, [cabins, availability, checkIn, checkOut]);

  const availableCount = cabinAvailability.filter(c => c.isAvailable).length;

  const handleCabinClick = (cabin: CabinInfo, isAvailable: boolean) => {
    if (isAvailable && onCabinSelect) {
      onCabinSelect(cabin);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Cabañas Disponibles</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDateRange(checkIn, checkOut)} • {nights} {nights === 1 ? 'noche' : 'noches'}
            </p>
          </div>
          {onClear && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Limpiar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {availableCount === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <X className="w-8 h-8 mx-auto mb-2 text-rose-500" />
            <p>No hay cabañas disponibles para estas fechas</p>
            <p className="text-sm mt-1">Intenta seleccionar otras fechas</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {availableCount} de {cabins.length} cabañas disponibles
            </p>
            
            <div className="space-y-2">
              {cabinAvailability.map(({ cabin, isAvailable }) => (
                <div
                  key={cabin.id}
                  onClick={() => handleCabinClick(cabin, isAvailable)}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-all',
                    isAvailable 
                      ? 'bg-card hover:bg-accent cursor-pointer border-border' 
                      : 'bg-muted/50 cursor-not-allowed border-transparent'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-3 h-3 rounded-full', cabin.color)} />
                    <div>
                      <p className={cn(
                        'font-medium',
                        !isAvailable && 'text-muted-foreground'
                      )}>
                        {cabin.displayName}
                      </p>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>Máx {cabin.maxCapacity} personas</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isAvailable ? (
                      <>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                          <Check className="w-3 h-3 mr-1" />
                          Disponible
                        </Badge>
                        {onCabinSelect && (
                          <Button size="sm" variant="default">
                            Seleccionar
                          </Button>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                        <X className="w-3 h-3 mr-1" />
                        Ocupada
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
