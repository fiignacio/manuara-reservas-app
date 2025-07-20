import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Filter } from 'lucide-react';
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
import { Reservation } from '@/types/reservation';
import { getAllReservations, deleteReservation } from '@/lib/reservationService';
import { useToast } from '@/hooks/use-toast';

const Reservations = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCabin, setFilterCabin] = useState('all');
  const [sortBy, setSortBy] = useState('checkIn');
  const { toast } = useToast();

  const loadReservations = async () => {
    try {
      setLoading(true);
      const data = await getAllReservations();
      setReservations(data);
      setFilteredReservations(data);
    } catch (error) {
      console.error('Error loading reservations:', error);
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
        default:
          return 0;
      }
    });

    setFilteredReservations(filtered);
  }, [reservations, searchTerm, filterCabin, sortBy]);

  const handleEdit = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setIsModalOpen(true);
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL');
  };

  const getSeasonBadge = (season: string) => {
    return season === 'Alta' ? 'destructive' : 'secondary';
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
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

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

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checkIn">Fecha de entrada</SelectItem>
                <SelectItem value="checkOut">Fecha de salida</SelectItem>
                <SelectItem value="passengerName">Nombre</SelectItem>
                <SelectItem value="totalPrice">Precio</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="w-4 h-4" />
              {filteredReservations.length} resultados
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reservations Table */}
      <Card className="card-cabin">
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando reservas...</div>
          ) : filteredReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {reservations.length === 0 ? 'No hay reservas registradas' : 'No se encontraron reservas con los filtros aplicados'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Pasajero</th>
                    <th className="p-4 font-medium">Check-in</th>
                    <th className="p-4 font-medium">Check-out</th>
                    <th className="p-4 font-medium">Cabaña</th>
                    <th className="p-4 font-medium">Huéspedes</th>
                    <th className="p-4 font-medium">Temporada</th>
                    <th className="p-4 font-medium">Vuelos</th>
                    <th className="p-4 font-medium">Precio</th>
                    <th className="p-4 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{reservation.passengerName}</div>
                      </td>
                      <td className="p-4 text-sm">
                        {formatDate(reservation.checkIn)}
                      </td>
                      <td className="p-4 text-sm">
                        {formatDate(reservation.checkOut)}
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
                      <td className="p-4 text-sm">
                        <div>{reservation.arrivalFlight}</div>
                        <div>{reservation.departureFlight}</div>
                      </td>
                      <td className="p-4 font-medium text-primary">
                        ${reservation.totalPrice.toLocaleString('es-CL')}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(reservation)}
                          >
                            <Edit className="w-4 h-4" />
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReservationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={loadReservations}
        reservation={selectedReservation}
      />
    </div>
  );
};

export default Reservations;