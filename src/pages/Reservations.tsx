import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter, DollarSign, CreditCard, LogIn, LogOut, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ReservationModal from '@/components/ReservationModal';
import PaymentModal from '@/components/PaymentModal';
import CheckInOutModal from '@/components/CheckInOutModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import ReservationCard from '@/components/mobile/ReservationCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';
import { getAllReservations, deleteReservation, calculateRemainingBalance } from '@/lib/reservationService';
import { useToast } from '@/hooks/use-toast';

const Reservations = () => {
  const isMobile = useIsMobile();
  const [reservations, setReservations] = useState<(Reservation & { remainingBalance: number })[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<(Reservation & { remainingBalance: number })[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [selectedPaymentReservation, setSelectedPaymentReservation] = useState<Reservation | null>(null);
  const [selectedCheckInOutReservation, setSelectedCheckInOutReservation] = useState<Reservation | null>(null);
  const [selectedConfirmationReservation, setSelectedConfirmationReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCheckInOutModalOpen, setIsCheckInOutModalOpen] = useState(false);
  const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
  const [checkInOutType, setCheckInOutType] = useState<'check_in' | 'check_out'>('check_in');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCabin, setFilterCabin] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [sortBy, setSortBy] = useState('checkIn');
  const { toast } = useToast();

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getAllReservations();
      const reservationsWithBalance = data.map(r => ({
        ...r,
        remainingBalance: calculateRemainingBalance(r)
      }));
      setReservations(reservationsWithBalance);
      setFilteredReservations(reservationsWithBalance);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservas.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  useEffect(() => {
    let filtered = [...reservations];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por tipo de cabaña
    if (filterCabin !== 'all') {
      filtered = filtered.filter(r => r.cabinType === filterCabin);
    }

    // Filtrar por estado de pago
    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(r => r.paymentStatus === filterPaymentStatus);
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'checkIn':
          return new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime();
        case 'checkOut':
          return new Date(a.checkOut).getTime() - new Date(b.checkOut).getTime();
        case 'passengerName':
          return a.passengerName.localeCompare(b.passengerName);
        case 'totalPrice':
          return b.totalPrice - a.totalPrice;
        case 'remainingBalance':
          return b.remainingBalance - a.remainingBalance;
        default:
          return 0;
      }
    });

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, filterCabin, filterPaymentStatus, sortBy]);

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
  };

  const handleAddPayment = (reservation: Reservation) => {
    setSelectedPaymentReservation(reservation);
    setIsPaymentModalOpen(true);
  };

  const handleCheckIn = (reservation: Reservation) => {
    setSelectedCheckInOutReservation(reservation);
    setCheckInOutType('check_in');
    setIsCheckInOutModalOpen(true);
  };

  const handleCheckOut = (reservation: Reservation) => {
    setSelectedCheckInOutReservation(reservation);
    setCheckInOutType('check_out');
    setIsCheckInOutModalOpen(true);
  };

  const handleConfirmation = (reservation: Reservation) => {
    setSelectedConfirmationReservation(reservation);
    setIsConfirmationModalOpen(true);
  };


  const handleDelete = async (id: string) => {
    try {
      await deleteReservation(id);
      toast({
        title: "Éxito",
        description: "Reserva eliminada correctamente."
      });
      loadReservations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la reserva.",
        variant: "destructive"
      });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setSelectedPaymentReservation(null);
  };

  const handleCheckInOutModalClose = () => {
    setIsCheckInOutModalOpen(false);
    setSelectedCheckInOutReservation(null);
  };

  const handleConfirmationModalClose = () => {
    setIsConfirmationModalOpen(false);
    setSelectedConfirmationReservation(null);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getSeasonBadge = (season: string) => {
    return season === 'Alta' ? 'destructive' : 'secondary';
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return { variant: 'default' as const, label: 'Pago Completo', color: 'bg-green-500' };
      case 'deposit_made':
        return { variant: 'secondary' as const, label: 'Abono Realizado', color: 'bg-blue-500' };
      case 'pending_payment':
        return { variant: 'secondary' as const, label: 'Pendiente de Pago', color: 'bg-yellow-500' };
      case 'pending_deposit':
        return { variant: 'outline' as const, label: 'Pendiente de Abono', color: 'bg-orange-500' };
      case 'overdue':
        return { variant: 'destructive' as const, label: 'Vencido', color: 'bg-red-500' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', color: 'bg-gray-500' };
    }
  };

  const getReservationStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stay':
        return { variant: 'default' as const, label: 'En Estadía', color: 'bg-green-500' };
      case 'checked_out':
        return { variant: 'secondary' as const, label: 'Check Out', color: 'bg-blue-500' };
      case 'departed':
        return { variant: 'secondary' as const, label: 'Salida', color: 'bg-gray-500' };
      case 'pending_checkin':
      default:
        return { variant: 'outline' as const, label: 'Pendiente Check In', color: 'bg-orange-500' };
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reservas</h1>
          <p className="text-muted-foreground">
            {filteredReservations.length} de {reservations.length} reservas
          </p>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="btn-cabin w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-cabin">
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={filterCabin} onValueChange={setFilterCabin}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por cabaña" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las cabañas</SelectItem>
                  <SelectItem value="Cabaña Pequeña (Max 3p)">Cabaña Pequeña</SelectItem>
                  <SelectItem value="Cabaña Mediana 1 (Max 4p)">Cabaña Mediana 1</SelectItem>
                  <SelectItem value="Cabaña Mediana 2 (Max 4p)">Cabaña Mediana 2</SelectItem>
                  <SelectItem value="Cabaña Grande (Max 6p)">Cabaña Grande</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado de pago" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending_deposit">Pendiente de abono</SelectItem>
                  <SelectItem value="pending_payment">Pendiente de pago</SelectItem>
                  <SelectItem value="deposit_made">Abono realizado</SelectItem>
                  <SelectItem value="fully_paid">Pago completo</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkIn">Fecha de entrada</SelectItem>
                  <SelectItem value="checkOut">Fecha de salida</SelectItem>
                  <SelectItem value="passengerName">Nombre</SelectItem>
                  <SelectItem value="totalPrice">Precio total</SelectItem>
                  <SelectItem value="remainingBalance">Balance pendiente</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                <Filter className="w-4 h-4" />
                {filteredReservations.length} resultados
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Content */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando reservas...</div>
      ) : filteredReservations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {reservations.length === 0 ? 'No hay reservas registradas' : 'No se encontraron reservas con los filtros aplicados'}
        </div>
      ) : isMobile ? (
        /* Mobile Cards View */
        <div className="space-y-4">
          {filteredReservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onEdit={handleEdit}
              onAddPayment={handleAddPayment}
              onCheckIn={handleCheckIn}
              onCheckOut={handleCheckOut}
                  onDelete={handleDelete}
                  onConfirmation={handleConfirmation}
                  
                />
          ))}
        </div>
      ) : (
        /* Desktop Table View */
        <Card className="card-cabin">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Pasajero</th>
                    <th className="p-4 font-medium">Check-in</th>
                    <th className="p-4 font-medium">Check-out</th>
                    <th className="p-4 font-medium">Estado</th>
                    <th className="p-4 font-medium">Cabaña</th>
                    <th className="p-4 font-medium">Huéspedes</th>
                    <th className="p-4 font-medium">Temporada</th>
                    <th className="p-4 font-medium">Precio Total</th>
                    <th className="p-4 font-medium">Estado Pago</th>
                    <th className="p-4 font-medium">Balance</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => {
                    const paymentBadge = getPaymentStatusBadge(reservation.paymentStatus);
                    const reservationBadge = getReservationStatusBadge(reservation.reservationStatus || 'pending_checkin');
                    const checkInBadge = getCheckInStatusBadge(reservation.checkInStatus || 'pending');
                    const checkOutBadge = getCheckOutStatusBadge(reservation.checkOutStatus || 'pending');
                    
                    return (
                      <tr key={reservation.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{reservation.passengerName}</div>
                          {reservation.useCustomPrice && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              Precio personalizado
                            </div>
                          )}
                          {reservation.comments && (
                            <div className="text-xs text-muted-foreground mt-1" title={reservation.comments}>
                              💬 {reservation.comments.length > 30 ? `${reservation.comments.substring(0, 30)}...` : reservation.comments}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          <div>{formatDate(reservation.checkIn)}</div>
                          {reservation.actualCheckIn && (
                            <div className="text-xs text-muted-foreground">
                              Real: {new Date(reservation.actualCheckIn).toLocaleDateString('es-CL')}
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-sm">
                          <div>{formatDate(reservation.checkOut)}</div>
                          {reservation.actualCheckOut && (
                            <div className="text-xs text-muted-foreground">
                              Real: {new Date(reservation.actualCheckOut).toLocaleDateString('es-CL')}
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <Badge variant={reservationBadge.variant} className="text-xs">
                              {reservationBadge.label}
                            </Badge>
                            <div className="flex gap-1">
                              <Badge variant={checkInBadge.variant} className="text-xs">
                                {checkInBadge.label}
                              </Badge>
                              <Badge variant={checkOutBadge.variant} className="text-xs">
                                {checkOutBadge.label}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          {reservation.cabinType.split(' (')[0]}
                        </td>
                        <td className="p-4 text-sm">
                          {reservation.adults} + {reservation.children}
                        </td>
                        <td className="p-4">
                          <Badge variant={getSeasonBadge(reservation.season)}>
                            {reservation.season}
                          </Badge>
                        </td>
                        <td className="p-4 font-medium text-primary">
                          ${reservation.totalPrice.toLocaleString('es-CL')}
                        </td>
                         <td className="p-4">
                           <div className="space-y-1">
                             <Badge variant={paymentBadge.variant}>
                               {paymentBadge.label}
                             </Badge>
                           </div>
                         </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className={reservation.remainingBalance > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                              ${reservation.remainingBalance.toLocaleString('es-CL')}
                            </div>
                            {(reservation.payments || []).length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {(reservation.payments || []).length} pago{(reservation.payments || []).length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(reservation)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {reservation.remainingBalance > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddPayment(reservation)}
                                className="text-primary hover:text-primary"
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                            )}
                            {reservation.checkInStatus !== 'checked_in' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckIn(reservation)}
                                className="text-green-600 hover:text-green-600"
                                title="Check-in"
                              >
                                <LogIn className="w-4 h-4" />
                              </Button>
                            )}
                            {reservation.checkInStatus === 'checked_in' && reservation.checkOutStatus !== 'checked_out' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCheckOut(reservation)}
                                className="text-blue-600 hover:text-blue-600"
                                title="Check-out"
                              >
                                <LogOut className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleConfirmation(reservation)}
                              className="text-primary hover:text-primary"
                              title="Enviar confirmación"
                            >
                              <Send className="w-4 h-4" />
                            </Button>
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
                                    {(reservation.payments || []).length > 0 && (
                                      <div className="mt-2 text-destructive font-medium">
                                        ⚠️ Esta reserva tiene {(reservation.payments || []).length} pago{(reservation.payments || []).length !== 1 ? 's' : ''} registrado{(reservation.payments || []).length !== 1 ? 's' : ''}.
                                      </div>
                                    )}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(reservation.id!)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={loadReservations}
        reservation={selectedReservation}
      />

      {selectedPaymentReservation && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentModalClose}
          onSuccess={loadReservations}
          reservation={selectedPaymentReservation}
        />
      )}

      {selectedCheckInOutReservation && (
        <CheckInOutModal
          isOpen={isCheckInOutModalOpen}
          onClose={handleCheckInOutModalClose}
          onSuccess={loadReservations}
          reservation={selectedCheckInOutReservation}
          type={checkInOutType}
        />
      )}

      {selectedConfirmationReservation && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={handleConfirmationModalClose}
          onSuccess={loadReservations}
          reservation={selectedConfirmationReservation}
        />
      )}

    </div>
  );
};

export default Reservations;
