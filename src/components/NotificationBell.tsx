
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellRing, Clock, Check, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { notificationService } from '../lib/notificationService';
import { Notification } from '../types/notification';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../hooks/use-toast';
import { useIsMobile } from '../hooks/use-mobile';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Función optimizada para cargar notificaciones
  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);
      const bellNotifications = await notificationService.getBellNotifications();
      
      setNotifications(bellNotifications);
      setUnreadCount(bellNotifications.length);
    } catch (error) {
      console.error('Error loading bell notifications:', error);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    // Actualizar cada 60 segundos
    const interval = setInterval(loadNotifications, 60000);
    return () => {
      clearInterval(interval);
    };
  }, [loadNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications(); // Recargar inmediatamente
      
      toast({
        title: "Notificación leída",
        description: "La notificación ha sido marcada como leída"
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar como leída",
        variant: "destructive"
      });
    }
  };

  const handleQuickAction = async (notificationId: string, action: string) => {
    try {
      switch (action) {
        case 'completed':
          // Para completar desde la campana, usar una nota por defecto
          await notificationService.markAsCompleted(notificationId, 'Completada desde la campana de notificaciones');
          break;
        case 'archived':
          await notificationService.archiveNotification(notificationId);
          break;
      }
      
      await loadNotifications(); // Recargar inmediatamente
      
      toast({
        title: "Acción completada",
        description: action === 'completed' ? 'Notificación completada' : 'Notificación archivada'
      });
    } catch (error) {
      console.error('Error performing quick action:', error);
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-destructive bg-destructive/5';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-muted bg-muted/20';
    }
  };

  const formatNotificationTime = (date: Date) => {
    return format(date, "d MMM, HH:mm", { locale: es });
  };

  const NotificationContent = () => (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={`${isMobile ? 'text-lg' : 'text-lg'}`}>Notificaciones</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {unreadCount} sin leer
          </Badge>
        </div>
      </CardHeader>
      
      <Separator />
      
      <CardContent className="p-0">
        <ScrollArea className={`${isMobile ? 'h-[60vh]' : 'h-[400px]'}`}>
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p>Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay notificaciones sin leer</p>
            </div>
          ) : (
            <div className="space-y-0">
              {notifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className={`p-4 border-l-4 transition-colors hover:bg-accent ${getPriorityColor(notification.priority)}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getPriorityIcon(notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium truncate text-foreground">
                            {notification.title}
                          </h4>
                          <div className="flex-shrink-0 ml-2">
                            <div className="w-2 h-2 bg-primary rounded-full" />
                          </div>
                        </div>
                        
                        <p className="text-xs mb-2 line-clamp-2 text-foreground">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>
                            {notification.sentAt 
                              ? formatNotificationTime(notification.sentAt)
                              : `Programada: ${formatNotificationTime(notification.scheduledAt)}`
                            }
                          </span>
                          
                          <Badge variant="outline" className="text-xs">
                            {notification.priority.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Acciones rápidas */}
                        <div className={`flex gap-1 mt-2 ${isMobile ? 'flex-col' : ''}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${isMobile ? 'h-8 text-xs' : 'h-6 px-2 text-xs'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Marcar leída
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className={`${isMobile ? 'h-8 text-xs' : 'h-6 px-2 text-xs'}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuickAction(notification.id, 'completed');
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Completar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < notifications.length - 1 && (
                    <Separator className="ml-4" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => {
                  setIsOpen(false);
                  // Aquí se podría navegar a la página de notificaciones
                  window.location.href = '/notifications';
                }}
              >
                Ver todas las notificaciones
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => setIsOpen(!isOpen)}
          >
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DrawerTrigger>
        
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Notificaciones</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <NotificationContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-96 p-0" align="end">
        <NotificationContent />
      </PopoverContent>
    </Popover>
  );
}
