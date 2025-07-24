import { useState } from 'react';
import { CheckCircle, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';
import { markConfirmationSent } from '@/lib/reservationService';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation: Reservation;
}

const ConfirmationModal = ({ isOpen, onClose, onSuccess, reservation }: ConfirmationModalProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'email' | 'whatsapp' | 'manual'>('email');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await markConfirmationSent(reservation.id!, method, notes);
      toast({
        title: "✅ Confirmación marcada como enviada",
        description: `Se ha registrado el envío de confirmación para ${reservation.passengerName}.`
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "⚠️ Error al marcar confirmación",
        description: error.message || "Hubo un problema al registrar la confirmación.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const Content = () => (
    <div className="space-y-4 p-4">
      {/* Reservation Info */}
      <div className="bg-accent/50 p-4 rounded-lg">
        <div className="text-sm text-muted-foreground">Confirmación para:</div>
        <div className="font-medium">{reservation.passengerName}</div>
        <div className="text-sm text-muted-foreground mt-1">
          {reservation.cabinType} • {new Date(reservation.checkIn).toLocaleDateString('es-ES')} - {new Date(reservation.checkOut).toLocaleDateString('es-ES')}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Method */}
        <div>
          <Label>Método de envío</Label>
          <Select value={method} onValueChange={(value: any) => setMethod(value)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">📧 Email</SelectItem>
              <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>
              <SelectItem value="manual">📄 Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes">Notas (opcional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            placeholder="Detalles adicionales sobre el envío..."
            className="mt-1"
            rows={3}
            maxLength={200}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {notes.length}/200 caracteres
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
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
            className="flex-1"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {loading ? 'Marcando...' : 'Marcar como enviado'}
          </Button>
        </div>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Marcar Confirmación
            </DrawerTitle>
          </DrawerHeader>
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Marcar Confirmación
          </DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmationModal;