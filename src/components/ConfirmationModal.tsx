import { useState } from 'react';
import { CheckCircle, Send, Loader2, FileDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';
import { markConfirmationSent, updateReservation } from '@/lib/reservationService';
import { generateConfirmationPDF, generateReservationConfirmationPDF } from '@/lib/pdfService';
import GuestInfoModal from './GuestInfoModal';

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
  const [generatePDF, setGeneratePDF] = useState(true);
  const [useEnhancedPDF, setUseEnhancedPDF] = useState(false);
  const [showGuestInfo, setShowGuestInfo] = useState(false);
  const [updatedReservation, setUpdatedReservation] = useState(reservation);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if enhanced PDF is selected and guest info is missing
    if (generatePDF && useEnhancedPDF && !hasCompleteGuestInfo()) {
      setShowGuestInfo(true);
      return;
    }
    
    setLoading(true);
    
    try {
      if (generatePDF) {
        if (useEnhancedPDF) {
          await generateReservationConfirmationPDF(updatedReservation);
          toast({
            title: "✅ PDF de confirmación generado",
            description: "El PDF de confirmación oficial se ha descargado."
          });
        } else {
          await generateConfirmationPDF(updatedReservation);
          toast({
            title: "✅ PDF generado",
            description: "El PDF de confirmación se ha descargado."
          });
        }
      }

      await markConfirmationSent(updatedReservation.id!, method, notes);
      toast({
        title: "✅ Confirmación marcada como enviada",
        description: `Se ha registrado el envío de confirmación para ${updatedReservation.passengerName}.`
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

  const hasCompleteGuestInfo = () => {
    return updatedReservation.customerEmail && 
           updatedReservation.guestNames && 
           updatedReservation.guestNames.length > 0;
  };

  const handleGuestInfoSave = async (guestNames: string[], guestRuts: string[], customerEmail: string, customerPhone: string, transferInfo: string) => {
    try {
      const updatedData = {
        ...updatedReservation,
        guestNames,
        guestRuts,
        customerEmail,
        customerPhone,
        transferInfo
      };
      
      if (updatedReservation.id) {
        await updateReservation(updatedReservation.id, updatedData);
      }
      
      setUpdatedReservation(updatedData);
      setShowGuestInfo(false);
      
      toast({
        title: "✅ Información guardada",
        description: "Los datos de huéspedes han sido actualizados."
      });
      
      // Now proceed with the confirmation
      handleSubmit(new Event('submit') as any);
    } catch (error: any) {
      toast({
        title: "⚠️ Error al guardar",
        description: error.message || "Hubo un problema al guardar la información.",
        variant: "destructive"
      });
    }
  };

  const handleGeneratePDF = async () => {
    try {
      await generateConfirmationPDF(reservation);
      toast({
        title: "✅ PDF Generado",
        description: "El PDF de confirmación se ha descargado."
      });
    } catch (error) {
      toast({
        title: "⚠️ Error al generar PDF",
        description: "Hubo un problema al generar el PDF de confirmación.",
        variant: "destructive"
      });
      console.error("Error generating PDF: ", error);
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

        {/* PDF Generation Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generatePDF"
              checked={generatePDF}
              onCheckedChange={(checked) => setGeneratePDF(checked === true)}
            />
            <Label htmlFor="generatePDF" className="text-sm font-medium">
              Generar PDF de confirmación
            </Label>
          </div>
          
          {generatePDF && (
            <div className="ml-6 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enhancedPDF"
                  checked={useEnhancedPDF}
                  onCheckedChange={(checked) => setUseEnhancedPDF(checked === true)}
                />
                <Label htmlFor="enhancedPDF" className="text-sm">
                  Usar formato oficial con listado de huéspedes
                </Label>
              </div>
              
              {useEnhancedPDF && !hasCompleteGuestInfo() && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-600" />
                    <p className="text-sm text-amber-800">
                      Se requiere información adicional de huéspedes para el PDF oficial
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGuestInfo(true)}
                    className="mt-2 h-8"
                  >
                    <Users className="w-3 h-3 mr-2" />
                    Completar información
                  </Button>
                </div>
              )}
            </div>
          )}
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
        <div className="space-y-3 pt-2">
          <div className="flex gap-3">
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
            <Button
              type="button"
              variant="secondary"
              onClick={handleGeneratePDF}
              className="w-full"
            >
              <FileDown className="w-4 h-4 mr-2" />
              Vista Previa PDF
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
    <>
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

      <GuestInfoModal
        isOpen={showGuestInfo}
        onClose={() => setShowGuestInfo(false)}
        onSave={handleGuestInfoSave}
        reservation={updatedReservation}
      />
    </>
  );
};

export default ConfirmationModal;