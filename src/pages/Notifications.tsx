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
import { Bell, Send, Settings, BarChart3, Plus, Calendar, AlertTriangle, Mail, MessageCircle, Phone } from 'lucide-react';
import { notificationService } from '../lib/notificationService';
import { Notification, NotificationType } from '../types/notification';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../hooks/use-toast';

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, read: 0 });
  const [isLoading, setIsLoading] = useState(false);
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [notificationsData, statsData] = await Promise.all([
        notificationService.getAllNotifications(100),
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
      await notificationService.createNotification({
        type: newNotification.type,
        title: newNotification.title,
        message: newNotification.message,
        priority: 'medium',
        recipientId: newNotification.recipientId || 'staff',
        scheduledAt: new Date(newNotification.scheduledAt),
        isActive: true,
        metadata: {}
      });

      toast({
        title: "Notificación creada",
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
    setIsLoading(true);
    try {
      const processedCount = await notificationService.processNotifications();
      toast({
        title: "Notificaciones procesadas",
        description: `Se enviaron ${processedCount} notificaciones`
      });
      await loadData();
    } catch (error) {
      console.error('Error processing notifications:', error);
      toast({
        title: "Error",
        description: "Error al procesar notificaciones",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Notificaciones
        </h1>
        <Button onClick={handleProcessNotifications} disabled={isLoading}>
          <Send className="h-4 w-4 mr-2" />
          Procesar Pendientes
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id} 
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{notification.title}</h3>
                          <Badge variant={getPriorityColor(notification.priority)}>
                            {notification.priority}
                          </Badge>
                          <Badge variant="outline">
                            {getTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <div>Programada: {format(notification.scheduledAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        {notification.sentAt && (
                          <div>Enviada: {format(notification.sentAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        )}
                        {notification.readAt && (
                          <div>Leída: {format(notification.readAt, "d MMM yyyy, HH:mm", { locale: es })}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Destinatario: {notification.recipientId}
                      </span>
                      <div className="flex gap-1">
                        {!notification.sentAt && notification.isActive && (
                          <Badge variant="outline" className="text-yellow-600">
                            Pendiente
                          </Badge>
                        )}
                        {notification.sentAt && !notification.readAt && (
                          <Badge variant="outline" className="text-green-600">
                            Enviada
                          </Badge>
                        )}
                        {notification.readAt && (
                          <Badge variant="outline" className="text-blue-600">
                            Leída
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay notificaciones registradas
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