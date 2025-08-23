import { useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';

interface GuestInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guestNames: string[], guestRuts: string[], customerEmail: string, customerPhone: string, transferInfo: string) => void;
  reservation: Reservation;
}

const GuestInfoModal = ({ isOpen, onClose, onSave, reservation }: GuestInfoModalProps) => {
  const isMobile = useIsMobile();
  const totalGuests = reservation.adults + reservation.children + reservation.babies;
  
  const [guests, setGuests] = useState(() => {
    const existingGuests = reservation.guestNames?.length || 0;
    const initialGuests = [];
    
    for (let i = 0; i < totalGuests; i++) {
      initialGuests.push({
        name: reservation.guestNames?.[i] || (i === 0 ? reservation.passengerName : ''),
        rut: reservation.guestRuts?.[i] || ''
      });
    }
    
    return initialGuests;
  });
  
  const [customerEmail, setCustomerEmail] = useState(reservation.customerEmail || '');
  const [customerPhone, setCustomerPhone] = useState(reservation.customerPhone || '');
  const [transferInfo, setTransferInfo] = useState(reservation.transferInfo || '');

  const updateGuest = (index: number, field: 'name' | 'rut', value: string) => {
    setGuests(prev => prev.map((guest, i) => 
      i === index ? { ...guest, [field]: value } : guest
    ));
  };

  const validateRUT = (rut: string): boolean => {
    // Simple RUT validation for Chilean format
    if (!rut) return true; // Allow empty for now
    const cleanRut = rut.replace(/[.-]/g, '');
    return /^\d{7,8}[0-9Kk]$/.test(cleanRut);
  };

  const handleSave = () => {
    const guestNames = guests.map(g => g.name).filter(name => name.trim() !== '');
    const guestRuts = guests.map(g => g.rut).filter(rut => rut.trim() !== '');
    
    // Validate all RUTs
    const invalidRuts = guestRuts.filter(rut => !validateRUT(rut));
    if (invalidRuts.length > 0) {
      alert('Por favor, verifica el formato de los RUTs ingresados.');
      return;
    }
    
    onSave(guestNames, guestRuts, customerEmail, customerPhone, transferInfo);
  };

  const Content = () => (
    <div className="space-y-6 p-4">
      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <Users className="w-5 h-5" />
          Información de Contacto
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email de contacto</Label>
            <Input
              id="email"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="phone">Teléfono de contacto</Label>
            <Input
              id="phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+56 9 XXXX XXXX"
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Transfer Information */}
      <div className="space-y-2">
        <Label htmlFor="transfer">Información de Transfer (opcional)</Label>
        <Input
          id="transfer"
          value={transferInfo}
          onChange={(e) => setTransferInfo(e.target.value)}
          placeholder="Detalles especiales para el transfer..."
          className="mt-1"
        />
      </div>

      {/* Guest List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary">
          Listado de Huéspedes ({totalGuests} personas)
        </h3>
        
        <div className="space-y-3">
          {guests.map((guest, index) => (
            <div key={index} className="p-4 border rounded-lg bg-accent/20">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-sm">
                  Huésped {index + 1} {index === 0 && '(Titular)'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor={`name-${index}`} className="text-sm">Nombre Completo</Label>
                  <Input
                    id={`name-${index}`}
                    value={guest.name}
                    onChange={(e) => updateGuest(index, 'name', e.target.value)}
                    placeholder="Nombre y apellidos"
                    className="mt-1"
                    required={index === 0}
                  />
                </div>
                <div>
                  <Label htmlFor={`rut-${index}`} className="text-sm">RUT/Documento</Label>
                  <Input
                    id={`rut-${index}`}
                    value={guest.rut}
                    onChange={(e) => updateGuest(index, 'rut', e.target.value)}
                    placeholder="12.345.678-9"
                    className="mt-1"
                  />
                  {guest.rut && !validateRUT(guest.rut) && (
                    <p className="text-xs text-destructive mt-1">
                      Formato de RUT inválido
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleSave} className="flex-1">
          Guardar Información
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Información de Huéspedes
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto">
            <Content />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Información de Huéspedes
          </DialogTitle>
          <DialogDescription>
            Completa los datos de contacto y de todos los huéspedes que se alojarán en la cabaña.
          </DialogDescription>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
};

export default GuestInfoModal;