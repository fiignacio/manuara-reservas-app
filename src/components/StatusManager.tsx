import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit, Save, X } from 'lucide-react';
import { Reservation } from '@/types/reservation';

interface StatusManagerProps {
  reservation: Reservation;
  onStatusUpdate: (updates: Partial<Reservation>) => void;
  compact?: boolean;
}

const StatusManager = ({ reservation, onStatusUpdate, compact = false }: StatusManagerProps) => {
  // Early return if no reservation
  if (!reservation) {
    return null;
  }

  const [isEditing, setIsEditing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(reservation.paymentStatus);
  const [reservationStatus, setReservationStatus] = useState(reservation.reservationStatus || 'pending_checkin');
  const [checkInStatus, setCheckInStatus] = useState(reservation.checkInStatus || 'pending');
  const [checkOutStatus, setCheckOutStatus] = useState(reservation.checkOutStatus || 'pending');
  const [notes, setNotes] = useState('');

  const getPaymentStatusConfig = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return { variant: 'success' as const, label: 'Pago Completo', icon: '✅' };
      case 'deposit_made':
        return { variant: 'info' as const, label: 'Abono Realizado', icon: '💰' };
      case 'pending_payment':
        return { variant: 'warning' as const, label: 'Pendiente de Pago', icon: '⏳' };
      case 'pending_deposit':
        return { variant: 'pending' as const, label: 'Pendiente de Abono', icon: '💸' };
      case 'overdue':
        return { variant: 'destructive' as const, label: 'Vencido', icon: '🚨' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', icon: '❓' };
    }
  };

  const getReservationStatusConfig = (status: string) => {
    switch (status) {
      case 'in_stay':
        return { variant: 'success' as const, label: 'En Estadía', icon: '🏠' };
      case 'checked_out':
        return { variant: 'info' as const, label: 'Check Out', icon: '🚪' };
      case 'departed':
        return { variant: 'secondary' as const, label: 'Salida', icon: '✈️' };
      case 'pending_checkin':
      default:
        return { variant: 'warning' as const, label: 'Pendiente Check In', icon: '🔑' };
    }
  };

  const getCheckInStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { variant: 'success' as const, label: 'Ingresado', icon: '✅' };
      case 'no_show':
        return { variant: 'destructive' as const, label: 'No Show', icon: '❌' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', icon: '⏳' };
    }
  };

  const getCheckOutStatusConfig = (status: string) => {
    switch (status) {
      case 'checked_out':
        return { variant: 'success' as const, label: 'Egresado', icon: '✅' };
      case 'late_checkout':
        return { variant: 'warning' as const, label: 'Tardío', icon: '⚠️' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', icon: '⏳' };
    }
  };

  const handleSave = () => {
    const updates: Partial<Reservation> = {
      paymentStatus,
      reservationStatus,
      checkInStatus,
      checkOutStatus
    };

    // Add notes if provided
    if (notes.trim()) {
      if (checkInStatus !== reservation.checkInStatus) {
        updates.checkInNotes = notes;
      }
      if (checkOutStatus !== reservation.checkOutStatus) {
        updates.checkOutNotes = notes;
      }
    }

    // Pass source collection and previous reservation for robust updates
    const enhancedUpdates = {
      ...updates,
      _sourceCollection: reservation._sourceCollection,
      _previousReservation: reservation
    };

    onStatusUpdate(enhancedUpdates);
    setIsEditing(false);
    setNotes('');
  };

  const handleCancel = () => {
    setPaymentStatus(reservation.paymentStatus);
    setReservationStatus(reservation.reservationStatus || 'pending_checkin');
    setCheckInStatus(reservation.checkInStatus || 'pending');
    setCheckOutStatus(reservation.checkOutStatus || 'pending');
    setNotes('');
    setIsEditing(false);
  };

  const paymentConfig = getPaymentStatusConfig(reservation.paymentStatus);
  const reservationConfig = getReservationStatusConfig(reservation.reservationStatus || 'pending_checkin');
  const checkInConfig = getCheckInStatusConfig(reservation.checkInStatus || 'pending');
  const checkOutConfig = getCheckOutStatusConfig(reservation.checkOutStatus || 'pending');

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant={paymentConfig.variant} className="text-xs">
          {paymentConfig.icon} {paymentConfig.label}
        </Badge>
        <Badge variant={reservationConfig.variant} className="text-xs">
          {reservationConfig.icon} {reservationConfig.label}
        </Badge>
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Edit className="h-3 w-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Estados</DialogTitle>
              <DialogDescription>
                Modifica los estados de pago y reserva de forma rápida.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Estado de Pago</Label>
                <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_deposit">Pendiente de Abono</SelectItem>
                    <SelectItem value="pending_payment">Pendiente de Pago</SelectItem>
                    <SelectItem value="deposit_made">Abono Realizado</SelectItem>
                    <SelectItem value="fully_paid">Pago Completo</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado de Reserva</Label>
                <Select value={reservationStatus} onValueChange={(value: any) => setReservationStatus(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending_checkin">Pendiente Check In</SelectItem>
                    <SelectItem value="in_stay">En Estadía</SelectItem>
                    <SelectItem value="checked_out">Check Out</SelectItem>
                    <SelectItem value="departed">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado Check In</Label>
                <Select value={checkInStatus} onValueChange={(value: any) => {
                  setCheckInStatus(value);
                  // Auto-sync reservation status when check-in changes
                  if (value === 'checked_in' && reservationStatus === 'pending_checkin') {
                    setReservationStatus('in_stay');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="checked_in">Ingresado</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Estado Check Out</Label>
                <Select value={checkOutStatus} onValueChange={(value: any) => {
                  setCheckOutStatus(value);
                  // Auto-sync reservation status when check-out changes
                  if (value === 'checked_out' && reservationStatus === 'in_stay') {
                    setReservationStatus('checked_out');
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="checked_out">Egresado</SelectItem>
                    <SelectItem value="late_checkout">Tardío</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agregar notas sobre el cambio de estado..."
                  className="min-h-[60px]"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  <Save className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Estados de la Reserva</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit className="w-4 h-4 mr-1" />
          Editar Estados
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Estado de Pago</Label>
          <div className="mt-1">
            <Badge variant={paymentConfig.variant} className="text-sm">
              {paymentConfig.icon} {paymentConfig.label}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Estado de Reserva</Label>
          <div className="mt-1">
            <Badge variant={reservationConfig.variant} className="text-sm">
              {reservationConfig.icon} {reservationConfig.label}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Estado Check In</Label>
          <div className="mt-1">
            <Badge variant={checkInConfig.variant} className="text-sm">
              {checkInConfig.icon} {checkInConfig.label}
            </Badge>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Estado Check Out</Label>
          <div className="mt-1">
            <Badge variant={checkOutConfig.variant} className="text-sm">
              {checkOutConfig.icon} {checkOutConfig.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Estados de la Reserva</DialogTitle>
            <DialogDescription>
              Actualiza todos los estados de la reserva, incluyendo pagos, check-in y check-out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado de Pago</Label>
              <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_deposit">💸 Pendiente de Abono</SelectItem>
                  <SelectItem value="pending_payment">⏳ Pendiente de Pago</SelectItem>
                  <SelectItem value="deposit_made">💰 Abono Realizado</SelectItem>
                  <SelectItem value="fully_paid">✅ Pago Completo</SelectItem>
                  <SelectItem value="overdue">🚨 Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado de Reserva</Label>
              <Select value={reservationStatus} onValueChange={(value: any) => setReservationStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_checkin">🔑 Pendiente Check In</SelectItem>
                  <SelectItem value="in_stay">🏠 En Estadía</SelectItem>
                  <SelectItem value="checked_out">🚪 Check Out</SelectItem>
                  <SelectItem value="departed">✈️ Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado Check In</Label>
              <Select value={checkInStatus} onValueChange={(value: any) => {
                setCheckInStatus(value);
                // Auto-sync reservation status when check-in changes
                if (value === 'checked_in' && reservationStatus === 'pending_checkin') {
                  setReservationStatus('in_stay');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendiente</SelectItem>
                  <SelectItem value="checked_in">✅ Ingresado</SelectItem>
                  <SelectItem value="no_show">❌ No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado Check Out</Label>
              <Select value={checkOutStatus} onValueChange={(value: any) => {
                setCheckOutStatus(value);
                // Auto-sync reservation status when check-out changes
                if (value === 'checked_out' && reservationStatus === 'in_stay') {
                  setReservationStatus('checked_out');
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">⏳ Pendiente</SelectItem>
                  <SelectItem value="checked_out">✅ Egresado</SelectItem>
                  <SelectItem value="late_checkout">⚠️ Tardío</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas sobre el cambio (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agregar notas sobre el cambio de estado..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-1" />
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-1" />
                Guardar Cambios
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StatusManager;