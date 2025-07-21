import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Clock, Check, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { notificationService } from '../lib/notificationService';
import { Notification } from '../types/notification';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadNotifications();
    // Actualizar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const allNotifications = await notificationService.getAllNotifications(20);
      setNotifications(allNotifications);
      
      const unread = allNotifications.filter(n => 
        n.sentAt && !n.readAt && n.isActive
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
      case 'urgent': return 'border-l-red-500 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatNotificationTime = (date: Date) => {
    return format(date, "d MMM, HH:mm", { locale: es });
  };

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
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificaciones</CardTitle>
              <Badge variant="secondary">
                {unreadCount} nuevas
              </Badge>
            </div>
          </CardHeader>
          
          <Separator />
          
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay notificaciones</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-4 border-l-4 cursor-pointer transition-colors hover:bg-accent ${
                          !notification.readAt && notification.sentAt 
                            ? getPriorityColor(notification.priority)
                            : 'border-l-gray-200 bg-gray-50'
                        }`}
                        onClick={() => {
                          if (!notification.readAt && notification.sentAt) {
                            handleMarkAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getPriorityIcon(notification.priority)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className={`text-sm font-medium truncate ${
                                !notification.readAt && notification.sentAt 
                                  ? 'text-foreground' 
                                  : 'text-muted-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              {!notification.readAt && notification.sentAt && (
                                <div className="flex-shrink-0 ml-2">
                                  <div className="w-2 h-2 bg-primary rounded-full" />
                                </div>
                              )}
                            </div>
                            
                            <p className={`text-xs mb-2 line-clamp-2 ${
                              !notification.readAt && notification.sentAt 
                                ? 'text-foreground' 
                                : 'text-muted-foreground'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {notification.sentAt 
                                  ? formatNotificationTime(notification.sentAt)
                                  : `Programada: ${formatNotificationTime(notification.scheduledAt)}`
                                }
                              </span>
                              
                              {notification.readAt && (
                                <div className="flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  <span>Leída</span>
                                </div>
                              )}
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
                      // Aquí se podría navegar a una página de notificaciones completa
                      console.log('Ver todas las notificaciones');
                    }}
                  >
                    Ver todas las notificaciones
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}