import { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Reservation, ReservationFormData } from '@/types/reservation';
import { calculatePrice, createReservation, updateReservation } from '@/lib/reservationService';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation?: Reservation | null;
}

const ReservationModal = ({ isOpen, onClose, onSuccess, reservation }: ReservationModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ReservationFormData>({
    passengerName: '',
    checkIn: '',
    checkOut: '',
    adults: 1,
    children: 0,
    season: 'Baja',
    cabinType: 'Cabaña Pequeña (Max 3p)',
    arrivalFlight: 'LA841',
    departureFlight: 'LA842'
  });

  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    if (reservation) {
      setFormData({
        passengerName: reservation.passengerName,
        checkIn: reservation.checkIn,
        checkOut: reservation.checkOut,
        adults: reservation.adults,
        children: reservation.children,
        season: reservation.season,
        cabinType: reservation.cabinType,
        arrivalFlight: reservation.arrivalFlight,
        departureFlight: reservation.departureFlight
      });
    } else {
      setFormData({
        passengerName: '',
        checkIn: '',
        checkOut: '',
        adults: 1,
        children: 0,
        season: 'Baja',
        cabinType: 'Cabaña Pequeña (Max 3p)',
        arrivalFlight: 'LA841',
        departureFlight: 'LA842'
      });
    }
  }, [reservation]);

  useEffect(() => {
    if (formData.checkIn && formData.checkOut) {
      const price = calculatePrice(formData);
      setCalculatedPrice(price);
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      toast({
        title: "📅 Fechas inválidas",
        description: `La fecha de check-out (${new Date(formData.checkOut).toLocaleDateString('es-ES')}) debe ser posterior a la fecha de check-in (${new Date(formData.checkIn).toLocaleDateString('es-ES')}). Por favor, corrige las fechas.`,
        variant: "destructive"
      });
      return;
    }

    // Validar capacidad de la cabaña
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
      if (reservation?.id) {
        await updateReservation(reservation.id, formData);
        toast({
          title: "✅ Reserva actualizada exitosamente",
          description: `La reserva de ${formData.passengerName} para la ${formData.cabinType} ha sido modificada del ${new Date(formData.checkIn).toLocaleDateString('es-ES')} al ${new Date(formData.checkOut).toLocaleDateString('es-ES')}.`
        });
      } else {
        await createReservation(formData);
        toast({
          title: "🎉 Reserva creada exitosamente",
          description: `Se ha registrado la reserva de ${formData.passengerName} para la ${formData.cabinType} del ${new Date(formData.checkIn).toLocaleDateString('es-ES')} al ${new Date(formData.checkOut).toLocaleDateString('es-ES')}.`
        });
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || "Hubo un problema al guardar la reserva.";
      
      if (errorMessage.includes('no está disponible')) {
        toast({
          title: "❌ Cabaña no disponible",
          description: `La ${formData.cabinType} ya está reservada para las fechas seleccionadas (${new Date(formData.checkIn).toLocaleDateString('es-ES')} - ${new Date(formData.checkOut).toLocaleDateString('es-ES')}). Por favor, selecciona otras fechas o una cabaña diferente.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "⚠️ Error al procesar la reserva",
          description: `No se pudo ${reservation?.id ? 'actualizar' : 'crear'} la reserva. ${errorMessage}`,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
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

            {/* Fechas */}
            <div>
              <Label htmlFor="checkIn">Fecha de Check-in</Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkIn}
                onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="checkOut">Fecha de Check-out</Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOut}
                onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
                required
                className="mt-1"
              />
            </div>

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

            {/* Tipo de Cabaña */}
            <div>
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

          {/* Precio calculado */}
          {calculatedPrice > 0 && (
            <div className="bg-accent p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Precio Total</div>
              <div className="text-2xl font-bold text-primary">
                ${calculatedPrice.toLocaleString('es-CL')}
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
              disabled={loading}
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