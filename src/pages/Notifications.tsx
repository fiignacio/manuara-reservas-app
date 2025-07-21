import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bell, Send, Settings, BarChart3, Plus, Calendar, AlertTriangle, Mail, MessageCircle, Phone, Loader2, RefreshCw, Check, Archive } from 'lucide-react';
import { notificationService } from '../lib/notificationService';
import { deleteExpiredReservations } from '../lib/reservationService';
import { Notification, NotificationType } from '../types/notification';
import { NotificationActions } from '../components/NotificationActions';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../hooks/use-toast';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, read: 0, completed: 0, archived: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [newNotification, setNewNotification] = useState({
    type: 'maintenance_alert' as NotificationType,
    title: '',
    message: '',
    recipientId: '',
    scheduledAt: new Date().toISOString().slice(0, 16)
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, statusFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      console.log('Loading notifications data...');
      const [notificationsData, statsData] = await Promise.all([
        notificationService.getAllNotifications(100),
        notificationService.getNotificationStats()
      ]);
      
      console.log('Loaded notifications:', notificationsData.length);
      console.log('Stats:', statsData);
      
      setNotifications(notificationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading notifications data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las notificaciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;
    
    switch (statusFilter) {
      case 'pending':
        filtered = notifications.filter(n => n.status === 'pending' && n.isActive);
        break;
      case 'sent':
        filtered = notifications.filter(n => n.status === 'sent');
        break;
      case 'read':
        filtered = notifications.filter(n => n.status === 'read');
        break;
      case 'completed':
        filtered = notifications.filter(n => n.status === 'completed');
        break;
      case 'archived':
        filtered = notifications.filter(n => n.status === 'archived');
        break;
      case 'cancelled':
        filtered = notifications.filter(n => n.status === 'cancelled');
        break;
      case 'snoozed':
        filtered = notifications.filter(n => n.status === 'snoozed');
        break;
      case 'active':
        filtered = notifications.filter(n => 
          n.isActive && 
          !n.archivedAt && 
          n.status !== 'cancelled' && 
          n.status !== 'archived'
        );
        break;
      case 'unread':
        filtered = notifications.filter(n => n.status === 'sent' && !n.readAt);
        break;
      default:
        filtered = notifications;
    }
    
    console.log(`Filtered ${filtered.length} notifications for status: ${statusFilter}`);
    setFilteredNotifications(filtered);
  };

  const handleCreateNotification = async () => {
    if (!newNotification.title || !newNotification.message) {
      toast({
        title: "Error",
        description: "Título y mensaje son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Creating manual notification:', newNotification);
      
      await notificationService.createNotification({
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        priority: 'medium',
        status: 'pending',
        recipientId: newNotification.recipientId || 'staff',
        recipientEmail: 'cabanasmanuara@gmail.com',
        scheduledAt: new Date(newNotification.scheduledAt),
        isActive: true,
        metadata: {}
      });

      toast({
        title: "✅ Notificación creada",
        description: "La notificación ha sido programada correctamente"
      });

      setNewNotification({
        type: 'maintenance_alert',
        title: '',
        message: '',
        recipientId: '',
        scheduledAt: new Date().toISOString().slice(0, 16)
      });

      await loadData();
    } catch (error) {
      console.error('Error creating notification:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la notificación",
        variant: "destructive"
      });
    }
  };

  const handleProcessNotifications = async () => {
    setIsProcessing(true);
    try {
      console.log('Processing notifications...');
      
      const processedCount = await notificationService.processNotifications();
      const deletedReservations = await deleteExpiredReservations();
      
      let message = '';
      if (processedCount > 0) {
        message += `Se enviaron ${processedCount} notificaciones correctamente.`;
      }
      if (deletedReservations > 0) {
        if (message) message += ' ';
        message += `Se eliminaron ${deletedReservations} reservas vencidas.`;
      }
      
      if (!message) {
        message = 'No hay notificaciones pendientes ni reservas vencidas.';
      }
      
      toast({
        title: "✅ Procesamiento completado",
        description: message
      });
      
      // Recargar datos después del procesamiento
      await loadData();
    } catch (error) {
      console.error('Error processing notifications:', error);
      toast({
        title: "❌ Error al procesar",
        description: "Hubo un error al procesar las notificaciones",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNotificationAction = async (notificationId: string, action: string, notes?: string) => {
    try {
      switch (action) {
        case 'completed':
          await notificationService.markAsCompleted(notificationId, notes);
          break;
        case 'archived':
          await notificationService.archiveNotification(notificationId);
          break;
        case 'snoozed':
          await notificationService.snoozeNotification(notificationId, 24);
          break;
        case 'cancelled':
          await notificationService.cancelNotification(notificationId);
          break;
      }
      
      await loadData();
      toast({
        title: "Acción completada",
        description: `Notificación ${action === 'completed' ? 'completada' : action === 'archived' ? 'archivada' : action === 'snoozed' ? 'pospuesta' : 'cancelada'} correctamente`
      });
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: "Error",
        description: "No se pudo realizar la acción",
        variant: "destructive"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  const getTypeLabel = (type: NotificationType) => {
    const labels: Record<NotificationType, string> = {
      'checkin_reminder': 'Recordatorio Check-in',
      'checkout_reminder': 'Recordatorio Check-out',
      'flight_delay': 'Alerta de Vuelo',
      'maintenance_alert': 'Alerta de Mantenimiento',
      'payment_reminder': 'Recordatorio de Pago',
      'welcome_message': 'Mensaje de Bienvenida',
      'cleaning_schedule': 'Programa de Limpieza'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (notification: Notification) => {
    switch (notification.status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pendiente</Badge>;
      case 'sent':
        return notification.readAt 
          ? <Badge variant="outline" className="bg-blue-50 text-blue-700">Enviada (leída)</Badge>
          : <Badge variant="outline" className="bg-green-50 text-green-700">Enviada</Badge>;
      case 'read':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Leída</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archivada</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'snoozed':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Pospuesta</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notificaciones
        </h1>
        <div className="flex gap-2">
          <Button 
            onClick={loadData} 
            disabled={isLoading}
            variant="outline"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Actualizar
          </Button>
          <Button 
            onClick={handleProcessNotifications} 
            disabled={isProcessing || isLoading}
            className="btn-cabin"
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isProcessing ? 'Procesando...' : 'Procesar Pendientes'}
          </Button>
        </div>
      </div>

      {/* Estadísticas actualizadas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Bell className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Calendar className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Enviadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leídas</p>
                <p className="text-2xl font-bold text-blue-600">{stats.read}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <Check className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Archivadas</p>
                <p className="text-2xl font-bold text-gray-600">{stats.archived}</p>
              </div>
              <Archive className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Lista de Notificaciones</TabsTrigger>
          <TabsTrigger value="create">Crear Notificación</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Notificaciones</CardTitle>
              <CardDescription>
                Todas las notificaciones del sistema
              </CardDescription>
              
              {/* Filtros mejorados */}
              <div className="flex gap-2 mt-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las notificaciones</SelectItem>
                    <SelectItem value="active">Solo activas</SelectItem>
                    <SelectItem value="unread">No leídas</SelectItem>
                    <SelectItem value="pending">Pendientes</SelectItem>
                    <SelectItem value="sent">Enviadas</SelectItem>
                    <SelectItem value="read">Leídas</SelectItem>
                    <SelectItem value="completed">Completadas</SelectItem>
                    <SelectItem value="archived">Archivadas</SelectItem>
                    <SelectItem value="cancelled">Canceladas</SelectItem>
                    <SelectItem value="snoozed">Pospuestas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{notification.title}</h3>
                          <Badge variant={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(notification.type)}
                          </Badge>
                          {getStatusBadge(notification)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        {notification.notes && (
                          <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                            <strong>Acción tomada:</strong> {notification.notes}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Programada: {format(notification.scheduledAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        {notification.sentAt && (
                          <div>Enviada: {format(notification.sentAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        )}
                        {notification.readAt && (
                          <div>Leída: {format(notification.readAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        )}
                        {notification.completedAt && (
                          <div>Completada: {format(notification.completedAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        )}
                        {notification.completedBy && (
                          <div>Por: {notification.completedBy}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Destinatario: {notification.recipientId}
                      </span>
                      
                      <NotificationActions
                        notification={notification}
                        onAction={handleNotificationAction}
                        compact={true}
                      />
                    </div>
                  </div>
                ))}
                
                {filteredNotifications.length === 0 && !isLoading && (
                  <div className="text-center py-8 text-muted-foreground">
                    {statusFilter === 'all' 
                      ? 'No hay notificaciones registradas'
                      : `No hay notificaciones ${statusFilter === 'pending' ? 'pendientes' : statusFilter === 'completed' ? 'completadas' : statusFilter}`
                    }
                  </div>
                )}
                
                {isLoading && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-muted-foreground">Cargando notificaciones...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Notificación</CardTitle>
              <CardDescription>
                Programa una nueva notificación manual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Notificación</Label>
                  <Select 
                    value={newNotification.type} 
                    onValueChange={(value: NotificationType) => 
                      setNewNotification(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance_alert">Alerta de Mantenimiento</SelectItem>
                      <SelectItem value="checkin_reminder">Recordatorio Check-in</SelectItem>
                      <SelectItem value="checkout_reminder">Recordatorio Check-out</SelectItem>
                      <SelectItem value="flight_delay">Alerta de Vuelo</SelectItem>
                      <SelectItem value="payment_reminder">Recordatorio de Pago</SelectItem>
                      <SelectItem value="welcome_message">Mensaje de Bienvenida</SelectItem>
                      <SelectItem value="cleaning_schedule">Programa de Limpieza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Fecha y Hora</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={newNotification.scheduledAt}
                    onChange={(e) => 
                      setNewNotification(prev => ({ ...prev, scheduledAt: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  placeholder="Título de la notificación"
                  value={newNotification.title}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, title: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje</Label>
                <Textarea
                  id="message"
                  placeholder="Contenido del mensaje"
                  rows={4}
                  value={newNotification.message}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, message: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientId">ID del Destinatario (opcional)</Label>
                <Input
                  id="recipientId"
                  placeholder="staff, reservation-id, etc."
                  value={newNotification.recipientId}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, recipientId: e.target.value }))
                  }
                />
              </div>

              <Button onClick={handleCreateNotification} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Crear Notificación
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
              <CardDescription>
                Configura las preferencias del sistema de notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Canales de Notificación</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-500" />
                      <div>
                        <Label htmlFor="emailEnabled">Notificaciones por Email</Label>
                        <p className="text-sm text-muted-foreground">
                          Enviar a: cabanasmanuara@gmail.com
                        </p>
                      </div>
                    </div>
                    <Switch id="emailEnabled" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <Label htmlFor="whatsappEnabled">Notificaciones WhatsApp</Label>
                        <p className="text-sm text-muted-foreground">
                          Enviar a: +56984562244 (solo urgentes/altas)
                        </p>
                      </div>
                    </div>
                    <Switch id="whatsappEnabled" defaultChecked />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-purple-500" />
                      <div>
                        <Label htmlFor="pushEnabled">Notificaciones Push</Label>
                        <p className="text-sm text-muted-foreground">
                          Mostrar notificaciones en el navegador
                        </p>
                      </div>
                    </div>
                    <Switch id="pushEnabled" defaultChecked />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Plantillas Automáticas</h3>
                <p className="text-sm text-muted-foreground">
                  Las notificaciones automáticas se generan según estas plantillas predefinidas
                </p>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Recordatorio Check-in</div>
                      <div className="text-sm text-muted-foreground">24h antes del check-in</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Recordatorio Check-out</div>
                      <div className="text-sm text-muted-foreground">24h antes del check-out</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Mensaje de Bienvenida</div>
                      <div className="text-sm text-muted-foreground">Al momento del check-in</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">Alerta de Vuelo</div>
                      <div className="text-sm text-muted-foreground">2h antes del vuelo</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
