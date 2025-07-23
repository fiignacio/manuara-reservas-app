import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Reservation, CheckInOutData } from '@/types/reservation';
import { performCheckIn, performCheckOut } from '@/lib/reservationService';
import { formatDateForDisplay } from '@/lib/dateUtils';

interface CheckInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation | null;
  type: 'check_in' | 'check_out';
  onSuccess: () => void;
}

const CheckInOutModal = ({ isOpen, onClose, reservation, type, onSuccess }: CheckInOutModalProps) => {
  const [formData, setFormData] = useState<Omit<CheckInOutData, 'reservationId'>>({
    actualDateTime: new Date().toISOString().slice(0, 16),
    notes: '',
    type
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reservation?.id) return;

    setIsLoading(true);
    try {
      const checkInOutData: CheckInOutData = {
        reservationId: reservation.id,
        actualDateTime: formData.actualDateTime,
        notes: formData.notes,
        type
      };

      if (type === 'check_in') {
        await performCheckIn(checkInOutData);
        toast({
          title: "Check-in realizado",
          description: `Check-in registrado para ${reservation.passengerName}`,
        });
      } else {
        await performCheckOut(checkInOutData);
        toast({
          title: "Check-out realizado",
          description: `Check-out registrado para ${reservation.passengerName}`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error in check-in/out:', error);
      toast({
        title: "Error",
        description: `Error al registrar ${type === 'check_in' ? 'check-in' : 'check-out'}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      actualDateTime: new Date().toISOString().slice(0, 16),
      notes: '',
      type
    });
    onClose();
  };

  if (!reservation) return null;

  const isCheckIn = type === 'check_in';
  const scheduledDate = isCheckIn ? reservation.checkIn : reservation.checkOut;
  const title = isCheckIn ? 'Registrar Check-in' : 'Registrar Check-out';
  const buttonText = isCheckIn ? 'Confirmar Check-in' : 'Confirmar Check-out';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reservation Info */}
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div><strong>Huésped:</strong> {reservation.passengerName}</div>
            <div><strong>Cabaña:</strong> {reservation.cabinType}</div>
            <div>
              <strong>Fecha programada:</strong> {formatDateForDisplay(scheduledDate)}
            </div>
          </div>

          {/* Actual DateTime */}
          <div className="space-y-2">
            <Label htmlFor="actualDateTime">
              Fecha y hora real del {isCheckIn ? 'check-in' : 'check-out'}
            </Label>
            <Input
              id="actualDateTime"
              type="datetime-local"
              value={formData.actualDateTime}
              onChange={(e) => setFormData({ ...formData, actualDateTime: e.target.value })}
              required
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notas {isCheckIn ? 'del check-in' : 'del check-out'} (opcional)
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 500) })}
              placeholder={`Observaciones sobre el ${isCheckIn ? 'check-in' : 'check-out'}...`}
              rows={3}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground">
              {formData.notes.length}/500 caracteres
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Procesando...' : buttonText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInOutModal;