import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bell, Send, Settings, BarChart3, Plus, Calendar, Loader2, RefreshCw, Check, Archive, AlertTriangle } from 'lucide-react';
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
  const [stats, setStats] = useState({ 
    total: 0, 
    pending: 0, 
    sent: 0, 
    read: 0, 
    completed: 0, 
    archived: 0,
    unread: 0
  });
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

  // Función optimizada para cargar datos
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [notificationsData, statsData] = await Promise.all([
        notificationService.getAllNotifications(200),
        notificationService.getNotificationStats()
      ]);
      
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtrar notificaciones optimizado
  useEffect(() => {
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
    
    setFilteredNotifications(filtered);
  }, [notifications, statusFilter]);

  const handleCreateNotification = async () => {
    if (!newNotification.title?.trim() || !newNotification.message?.trim()) {
      toast({
        title: "Error",
        description: "Título y mensaje son requeridos",
        variant: "destructive"
      });
      return;
    }

    try {
      await notificationService.createNotification({
        type: newNotification.type,
        title: newNotification.title.trim(),
        message: newNotification.message.trim(),
        priority: 'medium',
        status: 'pending',
        recipientId: newNotification.recipientId.trim() || 'staff',
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
        description: error instanceof Error ? error.message : "No se pudo crear la notificación",
        variant: "destructive"
      });
    }
  };

  const handleProcessNotifications = async () => {
    setIsProcessing(true);
    try {
      const [processedCount, deletedReservations] = await Promise.all([
        notificationService.processNotifications(),
        deleteExpiredReservations()
      ]);
      
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
          if (!notes?.trim()) {
            throw new Error('Se requieren notas para completar la notificación');
          }
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
      
      const actionLabels = {
        completed: 'completada',
        archived: 'archivada',
        snoozed: 'pospuesta',
        cancelled: 'cancelada'
      };
      
      toast({
        title: "Acción completada",
        description: `Notificación ${actionLabels[action as keyof typeof actionLabels]} correctamente`
      });
    } catch (error) {
      console.error('Error performing action:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo realizar la acción",
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
      'checkin_reminder': 'Check-in',
      'checkout_reminder': 'Check-out',
      'flight_delay': 'Vuelo',
      'maintenance_alert': 'Mantenimiento',
      'payment_reminder': 'Pago',
      'welcome_message': 'Bienvenida',
      'cleaning_schedule': 'Limpieza'
    };
    return labels[type] || type;
  };

  const getStatusBadge = (notification: Notification) => {
    const statusConfig = {
      pending: { label: 'Pendiente', variant: 'outline' as const, className: 'bg-yellow-50 text-yellow-700' },
      sent: { label: notification.readAt ? 'Enviada (leída)' : 'Enviada', variant: 'outline' as const, className: notification.readAt ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700' },
      read: { label: 'Leída', variant: 'outline' as const, className: 'bg-blue-50 text-blue-700' },
      completed: { label: 'Completada', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      archived: { label: 'Archivada', variant: 'secondary' as const, className: '' },
      cancelled: { label: 'Cancelada', variant: 'destructive' as const, className: '' },
      snoozed: { label: 'Pospuesta', variant: 'outline' as const, className: 'bg-purple-50 text-purple-700' }
    };

    const config = statusConfig[notification.status as keyof typeof statusConfig] || 
                  { label: 'Desconocido', variant: 'outline' as const, className: '' };

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Sistema de Notificaciones
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

      {/* Estadísticas mejoradas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, icon: Bell, color: 'text-blue-500' },
          { label: 'Pendientes', value: stats.pending, icon: Calendar, color: 'text-yellow-500' },
          { label: 'Enviadas', value: stats.sent, icon: Send, color: 'text-green-500' },
          { label: 'Sin Leer', value: stats.unread, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Leídas', value: stats.read, icon: BarChart3, color: 'text-blue-500' },
          { label: 'Completadas', value: stats.completed, icon: Check, color: 'text-green-500' },
          { label: 'Archivadas', value: stats.archived, icon: Archive, color: 'text-gray-500' }
        ].map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
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
                Gestión completa del sistema de notificaciones
              </CardDescription>
              
              <div className="flex gap-2 mt-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas ({stats.total})</SelectItem>
                    <SelectItem value="unread">Sin leer ({stats.unread})</SelectItem>
                    <SelectItem value="pending">Pendientes ({stats.pending})</SelectItem>
                    <SelectItem value="sent">Enviadas ({stats.sent})</SelectItem>
                    <SelectItem value="read">Leídas ({stats.read})</SelectItem>
                    <SelectItem value="completed">Completadas ({stats.completed})</SelectItem>
                    <SelectItem value="archived">Archivadas ({stats.archived})</SelectItem>
                    <SelectItem value="active">Solo activas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                  <p className="text-muted-foreground">Cargando notificaciones...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium">{notification.title}</h3>
                            <Badge variant={getPriorityColor(notification.priority)}>
                              {notification.priority.toUpperCase()}
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
                            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                              <strong>Acción tomada:</strong> {notification.notes}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-muted-foreground text-right ml-4">
                          <div>Programada: {format(notification.scheduledAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                          {notification.sentAt && (
                            <div className="text-green-600">Enviada: {format(notification.sentAt, "d MMM HH:mm", { locale: es })}</div>
                          )}
                          {notification.readAt && (
                            <div className="text-blue-600">Leída: {format(notification.readAt, "d MMM HH:mm", { locale: es })}</div>
                          )}
                          {notification.completedAt && (
                            <div className="text-green-600">Completada: {format(notification.completedAt, "d MMM HH:mm", { locale: es })}</div>
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
                  
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>
                        {statusFilter === 'all' 
                          ? 'No hay notificaciones registradas'
                          : `No hay notificaciones con estado: ${statusFilter}`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Notificación</CardTitle>
              <CardDescription>
                Programa una notificación manual para el sistema
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
                      <SelectItem value="maintenance_alert">🔧 Mantenimiento</SelectItem>
                      <SelectItem value="checkin_reminder">📍 Check-in</SelectItem>
                      <SelectItem value="checkout_reminder">📤 Check-out</SelectItem>
                      <SelectItem value="flight_delay">✈️ Vuelo</SelectItem>
                      <SelectItem value="payment_reminder">💳 Pago</SelectItem>
                      <SelectItem value="welcome_message">👋 Bienvenida</SelectItem>
                      <SelectItem value="cleaning_schedule">🧹 Limpieza</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduledAt">Fecha y Hora de Envío</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={newNotification.scheduledAt}
                    onChange={(e) => 
                      setNewNotification(prev => ({ ...prev, scheduledAt: e.target.value }))
                    }
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Título descriptivo de la notificación"
                  value={newNotification.title}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, title: e.target.value }))
                  }
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje *</Label>
                <Textarea
                  id="message"
                  placeholder="Contenido detallado del mensaje"
                  rows={4}
                  value={newNotification.message}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, message: e.target.value }))
                  }
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">
                  {newNotification.message.length}/500 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientId">Destinatario (opcional)</Label>
                <Input
                  id="recipientId"
                  placeholder="ID del destinatario o 'staff' para personal"
                  value={newNotification.recipientId}
                  onChange={(e) => 
                    setNewNotification(prev => ({ ...prev, recipientId: e.target.value }))
                  }
                />
              </div>

              <Button 
                onClick={handleCreateNotification} 
                className="w-full"
                disabled={!newNotification.title.trim() || !newNotification.message.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Notificación
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Configuración del Sistema</CardTitle>
              <CardDescription>
                Ajustes y preferencias para las notificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Estado del Sistema</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="font-medium">Sistema Activo</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      El sistema de notificaciones está funcionando correctamente
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">Actualizaciones Auto</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Las notificaciones se procesan automáticamente cada 60 segundos
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="font-medium">Email Configurado</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enviando a: cabanasmanuara@gmail.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Flujo de Estados</h3>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-yellow-50">Pendiente</Badge>
                    <span>→</span>
                    <Badge variant="outline" className="bg-green-50">Enviada</Badge>
                    <span>→</span>
                    <Badge variant="outline" className="bg-blue-50">Leída</Badge>
                    <span>→</span>
                    <Badge variant="default" className="bg-green-100">Completada</Badge>
                    <span>/</span>
                    <Badge variant="secondary">Archivada</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Las notificaciones siguen este flujo de estados. Solo las enviadas pero no leídas aparecen en la campana.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
