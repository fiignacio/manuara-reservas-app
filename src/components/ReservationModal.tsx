import { useState, useEffect } from 'react';
import { X, Save, Loader2, Calendar, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { 
  calculatePrice, 
  createReservation, 
  updateReservation, 
  checkCabinAvailability,
  validateReservationDates,
  getNextAvailableDate
} from '@/lib/reservationService';
import { addDays } from '@/lib/dateUtils';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation?: Reservation | null;
}

// Helper function to ensure proper default values for form data
const initializeFormData = (reservation?: Reservation | null): ReservationFormData => {
  if (reservation) {
    return {
      passengerName: reservation.passengerName || '',
      checkIn: reservation.checkIn || '',
      checkOut: reservation.checkOut || '',
      adults: reservation.adults || 1,
      children: reservation.children || 0,
      season: reservation.season || 'Baja',
      cabinType: reservation.cabinType || 'Cabaña Pequeña (Max 3p)',
      arrivalFlight: reservation.arrivalFlight || 'LA841',
      departureFlight: reservation.departureFlight || 'LA842',
      useCustomPrice: reservation.useCustomPrice ?? false, // Use nullish coalescing to handle undefined
      customPrice: reservation.customPrice || 0
    };
  }
  
  return {
    passengerName: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    season: 'Baja',
    cabinType: 'Cabaña Pequeña (Max 3p)',
    arrivalFlight: 'LA841',
    departureFlight: 'LA842',
    useCustomPrice: false,
    customPrice: 0
  };
};

const ReservationModal = ({ isOpen, onClose, onSuccess, reservation }: ReservationModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'unavailable' | 'checking' | null>(null);
  const [nextAvailableDate, setNextAvailableDate] = useState<string | null>(null);
  const [dateValidationError, setDateValidationError] = useState<string | null>(null);
  const [updateDates, setUpdateDates] = useState(false);
  
  const [formData, setFormData] = useState<ReservationFormData>(initializeFormData());

  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [automaticPrice, setAutomaticPrice] = useState(0);
  const isEditing = !!reservation;

  // Configurar límites de fechas
  const today = new Date().toISOString().split('T')[0];
  const maxDate = addDays(today, 730); // 2 años en el futuro
  const minCheckOut = formData.checkIn ? addDays(formData.checkIn, 1) : '';

  // Determinar si se deben validar las fechas
  const shouldValidateDates = !isEditing || updateDates;

  useEffect(() => {
    if (reservation) {
      const initializedData = initializeFormData(reservation);
      setFormData(initializedData);
      setUpdateDates(false);
    } else {
      setFormData(initializeFormData());
      setUpdateDates(false);
    }
    setAvailabilityStatus(null);
    setNextAvailableDate(null);
    setDateValidationError(null);
  }, [reservation]);

  // Calculate prices
  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      // Calculate automatic price (for comparison)
      const autoFormData = { ...formData, useCustomPrice: false, customPrice: 0 };
      const autoPrice = calculatePrice(autoFormData);
      setAutomaticPrice(autoPrice);
      
      // Calculate final price
      const finalPrice = calculatePrice(formData);
      setCalculatedPrice(finalPrice);
      
      // Validate dates if needed
      if (shouldValidateDates) {
        const validation = validateReservationDates(formData.checkIn, formData.checkOut);
        if (!validation.isValid) {
          setDateValidationError(validation.error || null);
          setAvailabilityStatus(null);
          return;
        } else {
          setDateValidationError(null);
        }
      } else {
        setDateValidationError(null);
      }
    } else {
      setCalculatedPrice(0);
      setAutomaticPrice(0);
      if (shouldValidateDates) {
        setDateValidationError(null);
        setAvailabilityStatus(null);
      }
    }
  }, [formData, shouldValidateDates]);

  // Verificar disponibilidad cuando cambien las fechas o tipo de cabaña
  useEffect(() => {
    const checkAvailability = async () => {
      // Solo verificar disponibilidad si debemos validar fechas
      if (shouldValidateDates && formData.checkIn && formData.checkOut && formData.cabinType && !dateValidationError) {
        setCheckingAvailability(true);
        setAvailabilityStatus('checking');
        
        try {
          const isAvailable = await checkCabinAvailability(
            formData.cabinType, 
            formData.checkIn, 
            formData.checkOut,
            reservation?.id
          );
          
          if (isAvailable) {
            setAvailabilityStatus('available');
            setNextAvailableDate(null);
          } else {
            setAvailabilityStatus('unavailable');
            const nextDate = await getNextAvailableDate(formData.cabinType, formData.checkIn);
            setNextAvailableDate(nextDate);
          }
        } catch (error) {
          console.error('Error checking availability:', error);
          setAvailabilityStatus(null);
        } finally {
          setCheckingAvailability(false);
        }
      } else {
        setAvailabilityStatus(null);
        setNextAvailableDate(null);
        setCheckingAvailability(false);
      }
    };

    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.checkIn, formData.checkOut, formData.cabinType, dateValidationError, reservation?.id, shouldValidateDates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones finales solo si debemos validar fechas
    if (shouldValidateDates) {
      if (dateValidationError) {
        toast({
          title: "📅 Error en las fechas",
          description: dateValidationError,
          variant: "destructive"
        });
        return;
      }

      if (availabilityStatus === 'unavailable') {
        toast({
          title: "❌ Cabaña no disponible",
          description: `La ${formData.cabinType} no está disponible para las fechas seleccionadas. ${nextAvailableDate ? `Próxima fecha disponible: ${new Date(nextAvailableDate).toLocaleDateString('es-ES')}` : ''}`,
          variant: "destructive"
        });
        return;
      }
    }

    // Validar precio personalizado
    if (formData.useCustomPrice && (!formData.customPrice || formData.customPrice <= 0)) {
      toast({
        title: "💰 Precio inválido",
        description: "Debes especificar un precio personalizado válido mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    // Validar capacidad de la cabaña (siempre)
    const totalGuests = formData.adults + formData.children;
    const maxCapacity = formData.cabinType.includes('Pequeña') ? 3 : 
                       formData.cabinType.includes('Mediana') ? 4 : 6;
    
    if (totalGuests > maxCapacity) {
      toast({
        title: "👥 Capacidad excedida",
        description: `La ${formData.cabinType} tiene capacidad máxima para ${maxCapacity} personas, pero has seleccionado ${totalGuests} huéspedes (${formData.adults} adultos + ${formData.children} niños).`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      // Clean form data before submission
      const cleanFormData = {
        ...formData,
        useCustomPrice: !!formData.useCustomPrice, // Ensure boolean
        customPrice: formData.useCustomPrice ? (formData.customPrice || 0) : 0
      };

      if (reservation?.id) {
        await updateReservation(reservation.id, cleanFormData, shouldValidateDates);
        toast({
          title: "✅ Reserva actualizada exitosamente",
          description: `La reserva de ${formData.passengerName} para la ${formData.cabinType} ha sido modificada${shouldValidateDates ? ` del ${new Date(formData.checkIn).toLocaleDateString('es-ES')} al ${new Date(formData.checkOut).toLocaleDateString('es-ES')}` : ''}.`
        });
      } else {
        await createReservation(cleanFormData);
        toast({
          title: "🎉 Reserva creada exitosamente",
          description: `Se ha registrado la reserva de ${formData.passengerName} para la ${formData.cabinType} del ${new Date(formData.checkIn).toLocaleDateString('es-ES')} al ${new Date(formData.checkOut).toLocaleDateString('es-ES')}.`
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || "Hubo un problema al guardar la reserva.";
      
      toast({
        title: "⚠️ Error al procesar la reserva",
        description: `No se pudo ${reservation?.id ? 'actualizar' : 'crear'} la reserva. ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUseNextAvailableDate = () => {
    if (nextAvailableDate) {
      setFormData({ 
        ...formData, 
        checkIn: nextAvailableDate,
        checkOut: addDays(nextAvailableDate, Math.ceil((new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      });
    }
  };

  // Handle custom price toggle with proper cleanup
  const handleCustomPriceToggle = (checked: boolean) => {
    setFormData({ 
      ...formData, 
      useCustomPrice: checked,
      customPrice: checked ? formData.customPrice : 0
    });
  };

  const getAvailabilityIndicator = () => {
    // No mostrar indicador si no estamos validando fechas
    if (!shouldValidateDates) {
      return (
        <Alert className="border-blue-500 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            ℹ️ Las fechas no se actualizarán. Solo se modificarán los demás datos de la reserva.
          </AlertDescription>
        </Alert>
      );
    }

    if (checkingAvailability || availabilityStatus === 'checking') {
      return (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>Verificando disponibilidad...</AlertDescription>
        </Alert>
      );
    }

    if (availabilityStatus === 'available') {
      return (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ✅ {formData.cabinType} disponible para las fechas seleccionadas
          </AlertDescription>
        </Alert>
      );
    }

    if (availabilityStatus === 'unavailable') {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            ❌ {formData.cabinType} no disponible para estas fechas.
            {nextAvailableDate && (
              <div className="mt-2 space-y-2">
                <div>Próxima fecha disponible: {new Date(nextAvailableDate).toLocaleDateString('es-ES')}</div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleUseNextAvailableDate}
                >
                  Usar esta fecha
                </Button>
              </div>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {reservation ? 'Editar Reserva' : 'Nueva Reserva'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checkbox para actualizar fechas - solo al editar */}
          {isEditing && (
            <div className="bg-accent/50 p-4 rounded-lg border">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="updateDates"
                  checked={updateDates}
                  onCheckedChange={(checked) => setUpdateDates(!!checked)}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label htmlFor="updateDates" className="text-sm font-medium cursor-pointer">
                    Actualizar fechas de la reserva
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Marcar si deseas cambiar las fechas de check-in y check-out. 
                    Si no está marcado, podrás editar otros datos sin restricciones de disponibilidad.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nombre del Pasajero */}
            <div className="md:col-span-2">
              <Label htmlFor="passengerName">Nombre del Pasajero</Label>
              <Input
                id="passengerName"
                value={formData.passengerName}
                onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            {/* Fechas con validaciones mejoradas */}
            <div>
              <Label htmlFor="checkIn">Fecha de Check-in</Label>
              <Input
                id="checkIn"
                type="date"
                min={shouldValidateDates ? today : undefined}
                max={shouldValidateDates ? maxDate : undefined}
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                disabled={isEditing && !updateDates}
                required
                className={`mt-1 ${isEditing && !updateDates ? 'bg-muted cursor-not-allowed' : ''}`}
              />
            </div>

            <div>
              <Label htmlFor="checkOut">Fecha de Check-out</Label>
              <Input
                id="checkOut"
                type="date"
                min={shouldValidateDates ? minCheckOut : undefined}
                max={shouldValidateDates ? maxDate : undefined}
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                disabled={isEditing && !updateDates}
                required
                className={`mt-1 ${isEditing && !updateDates ? 'bg-muted cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Tipo de Cabaña */}
            <div className="md:col-span-2">
              <Label>Tipo de Cabaña</Label>
              <Select
                value={formData.cabinType}
                onValueChange={(value: any) => setFormData({ ...formData, cabinType: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cabaña Pequeña (Max 3p)">Cabaña Pequeña (Max 3p)</SelectItem>
                  <SelectItem value="Cabaña Mediana 1 (Max 4p)">Cabaña Mediana 1 (Max 4p)</SelectItem>
                  <SelectItem value="Cabaña Mediana 2 (Max 4p)">Cabaña Mediana 2 (Max 4p)</SelectItem>
                  <SelectItem value="Cabaña Grande (Max 6p)">Cabaña Grande (Max 6p)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indicador de validación de fechas */}
          {shouldValidateDates && dateValidationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dateValidationError}</AlertDescription>
            </Alert>
          )}

          {/* Indicador de disponibilidad */}
          {getAvailabilityIndicator()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Número de personas */}
            <div>
              <Label htmlFor="adults">Número de Adultos</Label>
              <Input
                id="adults"
                type="number"
                min="1"
                max="6"
                value={formData.adults}
                onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="children">Niños (8-15 años)</Label>
              <Input
                id="children"
                type="number"
                min="0"
                max="4"
                value={formData.children}
                onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) })}
                className="mt-1"
              />
            </div>

            {/* Temporada */}
            <div>
              <Label>Temporada</Label>
              <Select
                value={formData.season}
                onValueChange={(value: 'Alta' | 'Baja') => setFormData({ ...formData, season: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baja">Temporada Baja</SelectItem>
                  <SelectItem value="Alta">Temporada Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Vuelos */}
            <div>
              <Label>Vuelo de Llegada</Label>
              <Select
                value={formData.arrivalFlight}
                onValueChange={(value: 'LA841' | 'LA843') => setFormData({ ...formData, arrivalFlight: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LA841">LA841</SelectItem>
                  <SelectItem value="LA843">LA843</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Vuelo de Salida</Label>
              <Select
                value={formData.departureFlight}
                onValueChange={(value: 'LA842' | 'LA844') => setFormData({ ...formData, departureFlight: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LA842">LA842</SelectItem>
                  <SelectItem value="LA844">LA844</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Price Section */}
          <div className="bg-accent/50 p-4 rounded-lg border">
            <div className="flex items-center space-x-3 mb-4">
              <Checkbox
                id="useCustomPrice"
                checked={formData.useCustomPrice}
                onCheckedChange={handleCustomPriceToggle}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="useCustomPrice" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Usar precio personalizado
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marcar para establecer un precio manual en lugar del cálculo automático.
                </p>
              </div>
            </div>

            {formData.useCustomPrice && (
              <div>
                <Label htmlFor="customPrice">Precio Personalizado</Label>
                <Input
                  id="customPrice"
                  type="number"
                  min="1"
                  value={formData.customPrice || ''}
                  onChange={(e) => setFormData({ ...formData, customPrice: parseInt(e.target.value) || 0 })}
                  placeholder="Ingrese el precio personalizado"
                  required={formData.useCustomPrice}
                  className="mt-1"
                />
              </div>
            )}

            {/* Price comparison */}
            {automaticPrice > 0 && (
              <div className="mt-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Precio automático:</span>
                  <span className={formData.useCustomPrice ? "line-through text-muted-foreground" : "font-medium"}>
                    ${automaticPrice.toLocaleString('es-CL')}
                  </span>
                </div>
                {formData.useCustomPrice && calculatedPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio personalizado:</span>
                    <span className="font-medium text-primary">
                      ${calculatedPrice.toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Final price display */}
          {calculatedPrice > 0 && (
            <div className="bg-accent p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Precio Total</div>
              <div className="text-2xl font-bold text-primary">
                ${calculatedPrice.toLocaleString('es-CL')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {Math.ceil((new Date(formData.checkOut).getTime() - new Date(formData.checkIn).getTime()) / (1000 * 60 * 60 * 24))} noches
                {formData.useCustomPrice && <span className="ml-2">(Precio personalizado)</span>}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || (shouldValidateDates && (availabilityStatus === 'unavailable' || !!dateValidationError))}
              className="flex-1 btn-cabin"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar Reserva'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationModal;
