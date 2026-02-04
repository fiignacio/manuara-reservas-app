import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Search, Filter, DollarSign, CreditCard, LogIn, LogOut, Send, CheckCircle, TrendingUp, Calendar, Users, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReservationModal from '@/components/ReservationModal';
import PaymentModal from '@/components/PaymentModal';
import CheckInOutModal from '@/components/CheckInOutModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import ReservationCard from '@/components/mobile/ReservationCard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Reservation } from '@/types/reservation';
import { deleteReservation, calculateRemainingBalance } from '@/lib/reservationService';
import { useToast } from '@/hooks/use-toast';
import { CABIN_TYPES } from '@/lib/cabinConfig';
import { useOfflineReservations, useSyncPendingOperations } from '@/hooks/useOfflineReservations';

const Reservations = () => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  // Use offline-capable hook for reservations
  const { 
    reservations: rawReservations, 
    isLoading: loading, 
    isOnline, 
    isUsingCache, 
    cacheStatus,
    refetch 
  } = useOfflineReservations();
  useSyncPendingOperations();
  
  // Add remaining balance to reservations
  const reservations = useMemo(() => 
    rawReservations.map(r => ({
      ...r,
      remainingBalance: calculateRemainingBalance(r)
    })), 
    [rawReservations]
  );
  
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCabin, setFilterCabin] = useState('all');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [sortBy, setSortBy] = useState('checkIn');

  // Calculate completed reservations analytics
  const completedAnalytics = useMemo(() => {
    const completed = reservations.filter(r => 
      r.checkOutStatus === 'checked_out' || r.reservationStatus === 'checked_out'
    );
    
    const totalRevenue = completed.reduce((sum, r) => sum + r.totalPrice, 0);
    const totalGuests = completed.reduce((sum, r) => sum + r.adults + r.children, 0);
    const avgStayDays = completed.length > 0 
      ? completed.reduce((sum, r) => {
          const checkIn = new Date(r.checkIn);
          const checkOut = new Date(r.checkOut);
          return sum + Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / completed.length
      : 0;

    const byCabin = CABIN_TYPES.reduce((acc, cabin) => {
      acc[cabin] = completed.filter(r => r.cabinType === cabin).length;
      return acc;
    }, {} as Record<string, number>);

    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisMonthCompleted = completed.filter(r => {
      const checkOut = new Date(r.actualCheckOut || r.checkOut);
      return checkOut.getMonth() === thisMonth && checkOut.getFullYear() === thisYear;
    });

    return {
      total: completed.length,
      totalRevenue,
      totalGuests,
      avgStayDays: avgStayDays.toFixed(1),
      byCabin,
      thisMonthCount: thisMonthCompleted.length,
      thisMonthRevenue: thisMonthCompleted.reduce((sum, r) => sum + r.totalPrice, 0),
      reservations: completed
    };
  }, [reservations]);

  useEffect(() => {
    let filtered = [...reservations];

    // Filter by status (active/completed)
    if (filterStatus === 'active') {
      filtered = filtered.filter(r => r.checkOutStatus !== 'checked_out' && r.reservationStatus !== 'checked_out');
    } else if (filterStatus === 'completed') {
      filtered = filtered.filter(r => r.checkOutStatus === 'checked_out' || r.reservationStatus === 'checked_out');
    }

    // Filter by search
    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.passengerName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by cabin type
    if (filterCabin !== 'all') {
      filtered = filtered.filter(r => r.cabinType === filterCabin);
    }

    // Filter by payment status
    if (filterPaymentStatus !== 'all') {
      filtered = filtered.filter(r => r.paymentStatus === filterPaymentStatus);
    }

    // Sort
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
  }, [reservations, searchTerm, filterCabin, filterPaymentStatus, sortBy, filterStatus]);

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
      refetch();
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
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const getSeasonBadge = (season: string) => {
    return season === 'Alta' ? 'destructive' : 'secondary';
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return { variant: 'default' as const, label: 'Pagado', color: 'bg-green-500' };
      case 'deposit_made':
        return { variant: 'secondary' as const, label: 'Abonado', color: 'bg-blue-500' };
      case 'pending_payment':
        return { variant: 'secondary' as const, label: 'Pendiente', color: 'bg-yellow-500' };
      case 'pending_deposit':
        return { variant: 'outline' as const, label: 'Sin Abono', color: 'bg-orange-500' };
      case 'overdue':
        return { variant: 'destructive' as const, label: 'Vencido', color: 'bg-red-500' };
      default:
        return { variant: 'outline' as const, label: 'Pendiente', color: 'bg-gray-500' };
    }
  };

  const getCheckInStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_in':
        return { variant: 'default' as const, label: 'In ✓' };
      case 'no_show':
        return { variant: 'destructive' as const, label: 'No Show' };
      default:
        return { variant: 'outline' as const, label: 'In ⏳' };
    }
  };

  const getCheckOutStatusBadge = (status: string) => {
    switch (status) {
      case 'checked_out':
        return { variant: 'default' as const, label: 'Out ✓' };
      case 'late_checkout':
        return { variant: 'secondary' as const, label: 'Tardío' };
      default:
        return { variant: 'outline' as const, label: 'Out ⏳' };
    }
  };

  const activeCount = reservations.filter(r => r.checkOutStatus !== 'checked_out' && r.reservationStatus !== 'checked_out').length;
  const completedCount = completedAnalytics.total;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Offline Alert */}
      {isUsingCache && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <WifiOff className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm">
              <strong>Modo offline:</strong> Mostrando {cacheStatus.reservationsCount} reservas en caché
              {cacheStatus.lastSync && (
                <span className="text-muted-foreground ml-1">
                  (último sync: {cacheStatus.lastSync.toLocaleTimeString('es-CL')})
                </span>
              )}
            </span>
            {isOnline && (
              <Button size="sm" variant="outline" onClick={() => refetch()} className="h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" />
                Sincronizar
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Reservas</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{activeCount} activas · {completedCount} completadas</span>
            {isUsingCache && (
              <Badge variant="outline" className="text-xs gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </Badge>
            )}
          </div>
        </div>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto"
          size={isMobile ? "lg" : "default"}
          disabled={!isOnline}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>

      {/* Tabs for Active/Completed */}
      <Tabs defaultValue="active" className="w-full" onValueChange={(v) => setFilterStatus(v)}>
        <TabsList className="grid w-full grid-cols-2 h-12">
          <TabsTrigger value="active" className="text-sm">
            Activas ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-sm">
            Completadas ({completedCount})
          </TabsTrigger>
        </TabsList>

        {/* Active Reservations Tab */}
        <TabsContent value="active" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>

                {/* Filter row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  <Select value={filterCabin} onValueChange={setFilterCabin}>
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Cabaña" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {CABIN_TYPES.map(cabin => (
                        <SelectItem key={cabin} value={cabin}>
                          {cabin.split(' (')[0]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterPaymentStatus} onValueChange={setFilterPaymentStatus}>
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Pago" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending_deposit">Sin abono</SelectItem>
                      <SelectItem value="deposit_made">Abonado</SelectItem>
                      <SelectItem value="fully_paid">Pagado</SelectItem>
                      <SelectItem value="overdue">Vencido</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checkIn">Fecha entrada</SelectItem>
                      <SelectItem value="checkOut">Fecha salida</SelectItem>
                      <SelectItem value="passengerName">Nombre</SelectItem>
                      <SelectItem value="totalPrice">Precio</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-2">
                    <Filter className="w-3 h-3" />
                    <span>{filteredReservations.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reservations List */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              Cargando...
            </div>
          ) : filteredReservations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                {reservations.length === 0 
                  ? 'No hay reservas registradas' 
                  : 'No se encontraron reservas con los filtros aplicados'
                }
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
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
          )}
        </TabsContent>

        {/* Completed Reservations Tab with Analytics */}
        <TabsContent value="completed" className="space-y-4 mt-4">
          {/* Analytics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Completadas</p>
                    <p className="text-2xl font-bold">{completedAnalytics.total}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Ingresos Totales</p>
                    <p className="text-xl sm:text-2xl font-bold">${completedAnalytics.totalRevenue.toLocaleString('es-CL')}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Huéspedes Atendidos</p>
                    <p className="text-2xl font-bold">{completedAnalytics.totalGuests}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Prom. Noches</p>
                    <p className="text-2xl font-bold">{completedAnalytics.avgStayDays}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-amber-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* This Month Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Este Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Checkout realizados</p>
                  <p className="text-xl font-bold">{completedAnalytics.thisMonthCount}</p>
                </div>
                <div className="p-3 bg-accent/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Ingresos del mes</p>
                  <p className="text-xl font-bold">${completedAnalytics.thisMonthRevenue.toLocaleString('es-CL')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed by Cabin */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Por Tipo de Cabaña</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CABIN_TYPES.map(cabin => {
                  const count = completedAnalytics.byCabin[cabin] || 0;
                  const pct = completedAnalytics.total > 0 
                    ? ((count / completedAnalytics.total) * 100).toFixed(0) 
                    : 0;
                  return (
                    <div key={cabin} className="p-3 bg-accent/50 rounded-lg">
                      <p className="text-xs text-muted-foreground truncate">{cabin.split(' (')[0]}</p>
                      <div className="flex items-end justify-between mt-1">
                        <p className="text-lg font-bold">{count}</p>
                        <Badge variant="outline" className="text-xs">{pct}%</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Completed Reservations List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial de Checkouts</CardTitle>
              <CardDescription>Últimas reservas completadas</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {completedAnalytics.reservations.slice(0, 20).map((reservation) => (
                  <div key={reservation.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{reservation.passengerName}</p>
                        <p className="text-xs text-muted-foreground">{reservation.cabinType.split(' (')[0]}</p>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          <span>{formatDate(reservation.checkIn)}</span>
                          <span>→</span>
                          <span>{formatDate(reservation.checkOut)}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-primary">${reservation.totalPrice.toLocaleString('es-CL')}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {reservation.adults + reservation.children}p
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={() => refetch()}
        reservation={selectedReservation}
      />

      {selectedPaymentReservation && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={handlePaymentModalClose}
          onSuccess={() => refetch()}
          reservation={selectedPaymentReservation}
        />
      )}

      {selectedCheckInOutReservation && (
        <CheckInOutModal
          isOpen={isCheckInOutModalOpen}
          onClose={handleCheckInOutModalClose}
          onSuccess={() => refetch()}
          reservation={selectedCheckInOutReservation}
          type={checkInOutType}
        />
      )}

      {selectedConfirmationReservation && (
        <ConfirmationModal
          isOpen={isConfirmationModalOpen}
          onClose={handleConfirmationModalClose}
          onSuccess={() => refetch()}
          reservation={selectedConfirmationReservation}
        />
      )}
    </div>
  );
};

export default Reservations;