import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Users, Calendar } from 'lucide-react';
import { checkMultipleCabinAvailability, getCabinDisplayName, getCabinColor, CABIN_TYPES, type CabinAvailability } from '@/lib/availabilityHelpers';
import { formatDateForDisplay } from '@/lib/dateUtils';

type CabinType = typeof CABIN_TYPES[number];

interface CabinAvailabilityMatrixProps {
  checkIn: string;
  checkOut: string;
  selectedCabin: CabinType;
  onCabinSelect: (cabinType: CabinType) => void;
  excludeReservationId?: string;
}

const CabinAvailabilityMatrix = ({ 
  checkIn, 
  checkOut, 
  selectedCabin, 
  onCabinSelect, 
  excludeReservationId 
}: CabinAvailabilityMatrixProps) => {
  const [availability, setAvailability] = useState<CabinAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAvailability = async () => {
      if (!checkIn || !checkOut) return;
      
      setLoading(true);
      try {
        const availabilityData = await checkMultipleCabinAvailability(
          checkIn, 
          checkOut, 
          excludeReservationId
        );
        setAvailability(availabilityData);
      } catch (error) {
        console.error('Error checking availability:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, [checkIn, checkOut, excludeReservationId]);

  const totalNights = checkIn && checkOut ? 
    Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  if (!checkIn || !checkOut) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          Disponibilidad de Cabañas
        </CardTitle>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>
            {formatDateForDisplay(checkIn)} - {formatDateForDisplay(checkOut)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {totalNights} {totalNights === 1 ? 'noche' : 'noches'}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Verificando disponibilidad...
          </div>
        ) : (
          availability.map((cabin) => {
            const isSelected = cabin.cabinType === selectedCabin;
            
            return (
              <div
                key={cabin.cabinType}
                className={`
                  flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer
                  ${isSelected 
                    ? 'bg-primary/10 border-primary ring-2 ring-primary/20' 
                    : cabin.isAvailable
                      ? 'bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-950/30 dark:border-green-800'
                      : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 opacity-60 cursor-not-allowed'
                  }
                `}
                onClick={() => cabin.isAvailable && onCabinSelect(cabin.cabinType)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded ${getCabinColor(cabin.cabinType)}`} />
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
                  {isSelected && (
                    <Badge variant="default" className="text-xs">
                      Seleccionada
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {!loading && availability.every(cabin => !cabin.isAvailable) && (
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

export default CabinAvailabilityMatrix;