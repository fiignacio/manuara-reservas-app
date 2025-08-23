
import { useState, useEffect } from 'react';
import { X, Save, Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { formatDateForDisplay } from '@/lib/dateUtils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';
import { PaymentFormData } from '@/types/payment';
import { addPayment, calculateRemainingBalance } from '@/lib/reservationService';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  reservation: Reservation;
}

interface ContentProps {
  reservation: Reservation;
  remainingBalance: number;
  formData: PaymentFormData;
  setFormData: (formData: PaymentFormData) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isMobile: boolean;
  onClose: () => void;
  loading: boolean;
}

const Content = ({
  reservation,
  remainingBalance,
  formData,
  setFormData,
  handleSubmit,
  isMobile,
  onClose,
  loading,
}: ContentProps) => {
  
  return (
  <div className="space-y-4 p-4">
    {/* Reservation Info */}
    <div className="bg-accent/50 p-4 rounded-lg">
      <div className="text-sm text-muted-foreground">Reserva de:</div>
      <div className="font-medium">{reservation.passengerName}</div>
      <div className="text-sm text-muted-foreground mt-1">
        {reservation.cabinType} • {formatDateForDisplay(reservation.checkIn)} - {formatDateForDisplay(reservation.checkOut)}
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span>Total:</span>
        <span className="font-medium">${reservation.totalPrice.toLocaleString('es-CL')}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Pagado:</span>
        <span className="font-medium">${(reservation.totalPrice - remainingBalance).toLocaleString('es-CL')}</span>
      </div>
      <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
        <span>Balance pendiente:</span>
        <span className="text-primary">${remainingBalance.toLocaleString('es-CL')}</span>
      </div>
    </div>

    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Amount */}
      <div>
        <Label htmlFor="amount">Monto del Pago</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="amount"
            type="number"
            min="1"
            max={remainingBalance}
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            placeholder="0"
            required
            className="flex-1"
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Puedes editar el monto manualmente si es necesario
        </div>
      </div>

      {/* Payment Date */}
      <div>
        <Label htmlFor="paymentDate">Fecha del Pago</Label>
        <Input
          id="paymentDate"
          type="date"
          value={formData.paymentDate}
          onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
          required
          className="mt-1"
        />
      </div>

      {/* Payment Method */}
      <div>
        <Label>Método de Pago</Label>
        <Select
          value={formData.method}
          onValueChange={(value: any) => setFormData({ ...formData, method: value })}
        >
          <SelectTrigger className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Efectivo</SelectItem>
            <SelectItem value="transfer">Transferencia</SelectItem>
            <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notas (opcional)</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 500) })}
          placeholder="Detalles adicionales sobre el pago..."
          className="mt-1"
          rows={3}
          maxLength={500}
        />
        <div className="text-xs text-muted-foreground mt-1">
          {formData.notes.length}/500 caracteres
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="flex-1 min-h-[44px]"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={loading || formData.amount <= 0 || formData.amount > remainingBalance}
          className="flex-1 min-h-[44px]"
        >
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {loading ? 'Registrando...' : 'Registrar Pago'}
        </Button>
      </div>
    </form>
  </div>
  );
};

const PaymentModal = ({ isOpen, onClose, onSuccess, reservation }: PaymentModalProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<PaymentFormData>({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'cash',
    notes: '',
    createdBy: 'Sistema'
  });

  const remainingBalance = calculateRemainingBalance(reservation);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'cash',
        notes: '',
        createdBy: 'Sistema'
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.amount <= 0) {
      toast({
        title: "💰 Monto inválido",
        description: "El monto del pago debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    if (formData.amount > remainingBalance) {
      toast({
        title: "💰 Monto excesivo",
        description: `El monto no puede exceder el balance pendiente de $${remainingBalance.toLocaleString('es-CL')}.`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      await addPayment(reservation.id!, formData);
      toast({
        title: "✅ Pago registrado exitosamente",
        description: `Se ha registrado un pago de $${formData.amount.toLocaleString('es-CL')} para la reserva de ${reservation.passengerName}.`
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage = error.message || "Hubo un problema al registrar el pago.";
      
      toast({
        title: "⚠️ Error al registrar pago",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };


  const contentProps = {
    reservation,
    remainingBalance,
    formData,
    setFormData,
    handleSubmit,
    isMobile,
    onClose,
    loading,
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Registrar Pago
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-4">
            <Content {...contentProps} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Registrar Pago
          </DialogTitle>
          <DialogDescription>
            Registra un nuevo pago para esta reserva. El balance pendiente se actualizará automáticamente.
          </DialogDescription>
        </DialogHeader>
        <Content {...contentProps} />
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
