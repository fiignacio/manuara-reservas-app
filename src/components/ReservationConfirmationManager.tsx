import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PassengerManagement, Passenger } from './PassengerManagement';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Reservation } from '@/types/reservation';
import { generateConfirmationPDF } from '@/lib/pdfService';

interface ReservationConfirmationManagerProps {
  isOpen: boolean;
  onClose: () => void;
  reservation?: Reservation;
}

interface ConfirmationData {
  checkInDate: string;
  checkOutDate: string;
  arrivalFlight: 'LA841' | 'LA843';
  departureFlight: 'LA842' | 'LA844';
  notes: string;
  passengers: Passenger[];
}

const defaultData: ConfirmationData = {
  checkInDate: '',
  checkOutDate: '',
  arrivalFlight: 'LA841',
  departureFlight: 'LA842',
  notes: '',
  passengers: [],
};

export const ReservationConfirmationManager: React.FC<ReservationConfirmationManagerProps> = ({
  isOpen,
  onClose,
  reservation,
}) => {
  const [formData, setFormData] = useState<ConfirmationData>(defaultData);
  const [isGenerating, setIsGenerating] = useState(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  useEffect(() => {
    if (reservation && isOpen) {
      setFormData({
        checkInDate: reservation.checkIn || '',
        checkOutDate: reservation.checkOut || '',
        arrivalFlight: reservation.arrivalFlight || 'LA841',
        departureFlight: reservation.departureFlight || 'LA842',
        notes: reservation.comments || '',
        passengers: reservation.guestNames?.map((name, index) => ({
          id: `guest-${index}`,
          name,
          rut: reservation.guestRuts?.[index] || '',
        })) || [],
      });
    }
  }, [reservation, isOpen]);

  useEffect(() => {
    // Auto-save to localStorage
    if (isOpen) {
      localStorage.setItem('confirmationData', JSON.stringify(formData));
    }
  }, [formData, isOpen]);

  useEffect(() => {
    // Load from localStorage on mount
    const saved = localStorage.getItem('confirmationData');
    if (saved && !reservation) {
      try {
        setFormData(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved data:', e);
      }
    }
  }, [isOpen, reservation]);

  const handleInputChange = (field: keyof ConfirmationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handlePassengersChange = (passengers: Passenger[]) => {
    setFormData(prev => ({
      ...prev,
      passengers,
    }));
  };

  const clearForm = () => {
    setFormData(defaultData);
    localStorage.removeItem('confirmationData');
    toast({
      title: "Formulario limpiado",
      description: "Todos los datos han sido eliminados",
    });
  };

  const generateDocument = async () => {
    if (formData.passengers.length === 0) {
      toast({
        title: "Error",
        description: "Agregue al menos un pasajero para generar el documento",
        variant: "destructive",
      });
      return;
    }

    if (!formData.checkInDate || !formData.checkOutDate) {
      toast({
        title: "Error",
        description: "Por favor complete las fechas de entrada y salida",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Create a temporary reservation-like object for PDF generation
      const reservationForPDF = reservation || {
        id: 'temp',
        passengerName: formData.passengers[0]?.name || 'Pasajero',
        phone: '',
        checkIn: formData.checkInDate,
        checkOut: formData.checkOutDate,
        adults: formData.passengers.length,
        children: 0,
        babies: 0,
        season: 'Alta' as const,
        cabinType: 'Cabaña Pequeña (Max 3p)' as const,
        arrivalFlight: formData.arrivalFlight,
        departureFlight: formData.departureFlight,
        totalPrice: 0,
        useCustomPrice: false,
        payments: [],
        remainingBalance: 0,
        paymentStatus: 'pending' as const,
        checkInStatus: 'pending' as const,
        checkOutStatus: 'pending' as const,
        confirmationSent: false,
        guestNames: formData.passengers.map(p => p.name),
        guestRuts: formData.passengers.map(p => p.rut),
        comments: formData.notes,
      };

      await generateConfirmationPDF(reservationForPDF);
      
      toast({
        title: "Documento generado",
        description: "La confirmación detallada ha sido creada exitosamente",
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el documento",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const Content = () => (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      {/* Reservation Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalles de la Reserva</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="checkIn">Fecha Entrada</Label>
              <Input
                id="checkIn"
                type="date"
                value={formData.checkInDate}
                onChange={(e) => handleInputChange('checkInDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="checkOut">Fecha Salida</Label>
              <Input
                id="checkOut"
                type="date"
                value={formData.checkOutDate}
                onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Vuelo de Entrada (IN)</Label>
              <RadioGroup
                value={formData.arrivalFlight}
                onValueChange={(value) => handleInputChange('arrivalFlight', value as 'LA841' | 'LA843')}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LA841" id="LA841" />
                  <Label htmlFor="LA841">LA841</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LA843" id="LA843" />
                  <Label htmlFor="LA843">LA843</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Vuelo de Salida (OUT)</Label>
              <RadioGroup
                value={formData.departureFlight}
                onValueChange={(value) => handleInputChange('departureFlight', value as 'LA842' | 'LA844')}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LA842" id="LA842" />
                  <Label htmlFor="LA842">LA842</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="LA844" id="LA844" />
                  <Label htmlFor="LA844">LA844</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Info relevante..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="min-h-[80px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Passenger Management */}
      <PassengerManagement
        passengers={formData.passengers}
        onPassengersChange={handlePassengersChange}
      />

      {/* Generate Document Section */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Confirmación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Crea un documento con los datos actuales.
          </p>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={generateDocument}
              disabled={isGenerating || formData.passengers.length === 0}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-current border-t-transparent rounded-full" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generar Documento
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={clearForm}
              className="flex-shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          </div>
          
          {formData.passengers.length === 0 && (
            <p className="text-sm text-destructive">
              Agregue pasajeros para generar.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[95vh]">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Confirmación Detallada
              {reservation && ` - ${reservation.passengerName}`}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <Content />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Confirmación Detallada
            {reservation && ` - ${reservation.passengerName}`}
          </DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
};