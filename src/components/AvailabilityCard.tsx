import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Users, Check, X } from 'lucide-react';
import { formatDateForDisplay } from '@/lib/dateUtils';
import { getLocalMultipleCabinAvailability, getCabinDisplayName, getCabinColor, type CabinAvailability } from '@/lib/availabilityHelpers';
import { Reservation } from '@/types/reservation';

interface AvailabilityCardProps {
  startDate: string;
  endDate: string;
  reservations: Reservation[];
  onBookCabin: (cabinType: string) => void;
  onClear: () => void;
}

const AvailabilityCard = ({ startDate, endDate, reservations, onBookCabin, onClear }: AvailabilityCardProps) => {
  const [availability, setAvailability] = useState<CabinAvailability[]>([]);

  useEffect(() => {
    if (startDate && endDate) {
      const availabilityData = getLocalMultipleCabinAvailability(reservations, startDate, endDate);
      setAvailability(availabilityData);
    }
  }, [startDate, endDate, reservations]);

  const totalNights = startDate && endDate ? 
    Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Disponibilidad de Cabañas
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-4 h-4" />
            <span>
              {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{totalNights} {totalNights === 1 ? 'noche' : 'noches'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {availability.map((cabin) => (
          <div
            key={cabin.cabinType}
            className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
              cabin.isAvailable
                ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded ${getCabinColor(cabin.cabinType)}`} />
              <div>
                <div className="font-medium text-sm">
                  {getCabinDisplayName(cabin.cabinType)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Máx. {cabin.maxCapacity} personas
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={cabin.isAvailable ? 'success' : 'destructive'}
                className="text-xs"
              >
                {cabin.isAvailable ? (
                  <>
                    <Check className="w-3 h-3 mr-1" />
                    Disponible
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Ocupada
                  </>
                )}
              </Badge>
              {cabin.isAvailable && (
                <Button
                  size="sm"
                  onClick={() => onBookCabin(cabin.cabinType)}
                  className="btn-cabin h-7 text-xs px-2"
                >
                  Reservar
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {availability.every(cabin => !cabin.isAvailable) && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No hay cabañas disponibles para estas fechas.
            <br />
            <span className="text-xs">Intenta seleccionar otras fechas.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AvailabilityCard;