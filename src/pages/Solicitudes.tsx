import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Check, 
  X, 
  Inbox, 
  Calendar, 
  User, 
  Mail, 
  Phone,
  MessageSquare,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SolicitudReserva } from '@/types/solicitud';
import { 
  getAllSolicitudes, 
  aprobarSolicitud, 
  rechazarSolicitud,
  deleteSolicitud 
} from '@/lib/solicitudesService';
import { formatDateForDisplay } from '@/lib/dateUtils';
import { getCabinDisplayName, getCabinColor } from '@/lib/availabilityHelpers';

const Solicitudes: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<SolicitudReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitud, setSelectedSolicitud] = useState<SolicitudReserva | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'pendiente' | 'aprobada' | 'rechazada'>('todas');
  const { toast } = useToast();

  const loadSolicitudes = async () => {
    setLoading(true);
    try {
      const data = await getAllSolicitudes();
      setSolicitudes(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las solicitudes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSolicitudes();
  }, []);

  const handleAprobar = async (solicitud: SolicitudReserva) => {
    setProcessing(true);
    try {
      await aprobarSolicitud(solicitud);
      toast({
        title: 'Solicitud aprobada',
        description: `Se creó la reserva para ${solicitud.guestName}`
      });
      loadSolicitudes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo aprobar la solicitud',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRechazar = async () => {
    if (!selectedSolicitud) return;
    
    setProcessing(true);
    try {
      await rechazarSolicitud(selectedSolicitud.id, rejectionReason);
      toast({
        title: 'Solicitud rechazada',
        description: 'La solicitud ha sido rechazada'
      });
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedSolicitud(null);
      loadSolicitudes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo rechazar la solicitud',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSolicitud) return;
    
    setProcessing(true);
    try {
      await deleteSolicitud(selectedSolicitud.id);
      toast({
        title: 'Solicitud eliminada',
        description: 'La solicitud ha sido eliminada'
      });
      setShowDeleteDialog(false);
      setSelectedSolicitud(null);
      loadSolicitudes();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la solicitud',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendiente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'aprobada':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Aprobada</Badge>;
      case 'rechazada':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rechazada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredSolicitudes = solicitudes.filter(s => 
    filter === 'todas' || s.status === filter
  );

  const pendingCount = solicitudes.filter(s => s.status === 'pendiente').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitudes de Reserva</h1>
          <p className="text-muted-foreground">
            {pendingCount > 0 
              ? `${pendingCount} solicitudes pendientes de revisión` 
              : 'No hay solicitudes pendientes'}
          </p>
        </div>
        <Button onClick={loadSolicitudes} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant={filter === 'todas' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('todas')}
            >
              Todas ({solicitudes.length})
            </Button>
            <Button 
              variant={filter === 'pendiente' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('pendiente')}
            >
              Pendientes ({solicitudes.filter(s => s.status === 'pendiente').length})
            </Button>
            <Button 
              variant={filter === 'aprobada' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('aprobada')}
            >
              Aprobadas ({solicitudes.filter(s => s.status === 'aprobada').length})
            </Button>
            <Button 
              variant={filter === 'rechazada' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setFilter('rechazada')}
            >
              Rechazadas ({solicitudes.filter(s => s.status === 'rechazada').length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Solicitudes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-5 w-5" />
            Solicitudes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando solicitudes...
            </div>
          ) : filteredSolicitudes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay solicitudes {filter !== 'todas' ? filter + 's' : ''}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Huésped</TableHead>
                    <TableHead>Cabaña</TableHead>
                    <TableHead>Fechas</TableHead>
                    <TableHead>Huéspedes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha Solicitud</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSolicitudes.map((solicitud) => (
                    <TableRow key={solicitud.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{solicitud.guestName}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {solicitud.guestEmail}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {solicitud.guestPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getCabinColor(solicitud.cabinType)}`} />
                          {getCabinDisplayName(solicitud.cabinType)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{formatDateForDisplay(solicitud.checkIn)}</div>
                            <div className="text-sm text-muted-foreground">
                              al {formatDateForDisplay(solicitud.checkOut)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {solicitud.adults} adultos
                        {solicitud.children > 0 && `, ${solicitud.children} niños`}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(solicitud.status)}
                        {solicitud.message && (
                          <div className="mt-1">
                            <MessageSquare className="h-3 w-3 text-muted-foreground inline mr-1" />
                            <span className="text-xs text-muted-foreground">Con mensaje</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {solicitud.createdAt.toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {solicitud.status === 'pendiente' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700"
                                onClick={() => handleAprobar(solicitud)}
                                disabled={processing}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  setSelectedSolicitud(solicitud);
                                  setShowRejectDialog(true);
                                }}
                                disabled={processing}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => {
                              setSelectedSolicitud(solicitud);
                              setShowDeleteDialog(true);
                            }}
                            disabled={processing}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de rechazar la solicitud de {selectedSolicitud?.guestName}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Motivo del rechazo (opcional)</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: Fechas no disponibles, cabña en mantenimiento..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleRechazar} disabled={processing}>
              Rechazar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Solicitud</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de eliminar permanentemente esta solicitud? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={processing}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Solicitudes;
