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
        title: "Error",
        description: "La fecha de salida debe ser posterior a la de entrada.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      if (reservation?.id) {
        await updateReservation(reservation.id, formData);
        toast({
          title: "Éxito",
          description: "Reserva actualizada correctamente."
        });
      } else {
        await createReservation(formData);
        toast({
          title: "Éxito",
          description: "Reserva creada correctamente."
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al guardar la reserva.",
        variant: "destructive"
      });
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