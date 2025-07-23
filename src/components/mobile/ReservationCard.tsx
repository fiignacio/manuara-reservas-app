import { Edit, Trash2, CreditCard, LogIn, LogOut, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Reservation } from '@/types/reservation';
import { calculateRemainingBalance } from '@/lib/reservationService';

interface ReservationCardProps {
  reservation: Reservation;
  onEdit: (reservation: Reservation) => void;
  onAddPayment: (reservation: Reservation) => void;
  onCheckIn: (reservation: Reservation) => void;
  onCheckOut: (reservation: Reservation) => void;
  onDelete: (id: string) => void;
}

const ReservationCard = ({ 
  reservation, 
  onEdit, 
  onAddPayment, 
  onCheckIn, 
  onCheckOut, 
  onDelete 
}: ReservationCardProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return { variant: 'default' as const, label: 'Pagado', color: 'bg-green-500' };
      case 'partially_paid':
        return { variant: 'secondary' as const, label: 'Parcial', color: 'bg-yellow-500' };
      case 'overdue':
        return { variant: 'destructive' as const, label: 'Vencido', color: 'bg-red-500' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', color: 'bg-gray-500' };
    }
  };

  const getCheckInStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { variant: 'default' as const, label: 'Ingresado', color: 'bg-green-500' };
      case 'no_show':
        return { variant: 'destructive' as const, label: 'No Show', color: 'bg-red-500' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', color: 'bg-gray-500' };
    }
  };

  const getCheckOutStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return { variant: 'default' as const, label: 'Egresado', color: 'bg-green-500' };
      case 'late_checkout':
        return { variant: 'secondary' as const, label: 'Tardío', color: 'bg-yellow-500' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', color: 'bg-gray-500' };
    }
  };

  const getSeasonBadge = (season: string) => {
    return season === 'Alta' ? 'destructive' : 'secondary';
  };

  const paymentBadge = getPaymentStatusBadge(reservation.paymentStatus);
  const checkInBadge = getCheckInStatusBadge(reservation.checkInStatus || 'pending');
  const checkOutBadge = getCheckOutStatusBadge(reservation.checkOutStatus || 'pending');
  const remainingBalance = calculateRemainingBalance(reservation);

  return (
    <Card className="card-cabin">
      <CardContent className="p-4 space-y-4">
        {/* Header with name and price */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-foreground">{reservation.passengerName}</h3>
            <p className="text-sm text-muted-foreground">{reservation.cabinType.split(' (')[0]}</p>
            {reservation.useCustomPrice && (
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <DollarSign className="w-3 h-3" />
                Precio personalizado
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="font-semibold text-primary">${reservation.totalPrice.toLocaleString('es-CL')}</div>
            <div className={`text-sm ${remainingBalance > 0 ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              Saldo: ${remainingBalance.toLocaleString('es-CL')}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 py-3 border-y border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Check-in</p>
            <p className="text-sm font-medium">{formatDate(reservation.checkIn)}</p>
            {reservation.actualCheckIn && (
              <p className="text-xs text-muted-foreground">
                Real: {new Date(reservation.actualCheckIn).toLocaleDateString('es-CL')}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Check-out</p>
            <p className="text-sm font-medium">{formatDate(reservation.checkOut)}</p>
            {reservation.actualCheckOut && (
              <p className="text-xs text-muted-foreground">
                Real: {new Date(reservation.actualCheckOut).toLocaleDateString('es-CL')}
              </p>
            )}
          </div>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant={checkInBadge.variant} className="text-xs">
            {checkInBadge.label}
          </Badge>
          <Badge variant={checkOutBadge.variant} className="text-xs">
            {checkOutBadge.label}
          </Badge>
          <Badge variant={paymentBadge.variant} className="text-xs">
            {paymentBadge.label}
          </Badge>
          <Badge variant={getSeasonBadge(reservation.season)} className="text-xs">
            {reservation.season}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {reservation.adults + reservation.children}p
          </Badge>
        </div>

        {/* Comments */}
        {reservation.comments && (
          <div className="text-xs text-muted-foreground p-2 bg-muted/50 rounded-md">
            💬 {reservation.comments}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(reservation)}
            className="flex-1 min-w-0"
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          
          {remainingBalance > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddPayment(reservation)}
              className="flex-1 min-w-0 text-primary hover:text-primary"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar
            </Button>
          )}
          
          {reservation.checkInStatus !== 'checked_in' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckIn(reservation)}
              className="flex-1 min-w-0 text-green-600 hover:text-green-600"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Check-in
            </Button>
          )}
          
          {reservation.checkInStatus === 'checked_in' && reservation.checkOutStatus !== 'checked_out' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCheckOut(reservation)}
              className="flex-1 min-w-0 text-blue-600 hover:text-blue-600"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Check-out
            </Button>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar reserva?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará permanentemente la reserva de {reservation.passengerName}.
                  {reservation.payments.length > 0 && (
                    <div className="mt-2 text-destructive font-medium">
                      ⚠️ Esta reserva tiene {reservation.payments.length} pago{reservation.payments.length !== 1 ? 's' : ''} registrado{reservation.payments.length !== 1 ? 's' : ''}.
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(reservation.id!)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReservationCard;