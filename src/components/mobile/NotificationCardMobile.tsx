import React from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Check, Archive, Clock, AlertTriangle, Bell } from 'lucide-react';
import { Notification } from '../../types/notification';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface NotificationCardMobileProps {
  notification: Notification;
  onAction: (action: string, notes?: string) => Promise<void>;
}

export function NotificationCardMobile({ notification, onAction }: NotificationCardMobileProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4 text-muted-foreground" />;
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

  const getStatusBadge = () => {
    const status = notification.status || (notification.sentAt ? 'sent' : 'pending');
    
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'archived':
        return <Badge variant="secondary">Archivada</Badge>;
      case 'snoozed':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pospuesta</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      case 'sent':
        return notification.readAt 
          ? <Badge variant="outline" className="bg-blue-50 text-blue-700">Leída</Badge>
          : <Badge variant="outline" className="bg-green-50 text-green-700">Enviada</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pendiente</Badge>;
    }
  };

  const canTakeAction = () => {
    const status = notification.status || (notification.sentAt ? 'sent' : 'pending');
    return !['archived', 'cancelled'].includes(status);
  };

  const handleQuickAction = async (action: string) => {
    try {
      if (action === 'completed') {
        await onAction(action, 'Completada desde móvil');
      } else {
        await onAction(action);
      }
    } catch (error) {
      console.error('Error performing action:', error);
    }
  };

  return (
    <Card className={`border-l-4 ${getPriorityColor(notification.priority)} transition-all duration-200 hover:shadow-md`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getPriorityIcon(notification.priority)}
            <h3 className="font-medium text-sm line-clamp-2 flex-1">
              {notification.title}
            </h3>
          </div>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {notification.priority.toUpperCase()}
          </Badge>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {notification.message}
        </p>

        {/* Notes if completed */}
        {notification.notes && (
          <div className="text-xs text-green-700 bg-green-50 p-2 rounded border-l-2 border-green-200">
            <strong>Acción:</strong> {notification.notes}
          </div>
        )}

        {/* Metadata */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>Programada: {format(notification.scheduledAt, "d MMM, HH:mm", { locale: es })}</span>
            {getStatusBadge()}
          </div>
          {notification.sentAt && (
            <div className="text-green-600">
              Enviada: {format(notification.sentAt, "d MMM, HH:mm", { locale: es })}
            </div>
          )}
          {notification.readAt && (
            <div className="text-blue-600">
              Leída: {format(notification.readAt, "d MMM, HH:mm", { locale: es })}
            </div>
          )}
        </div>

        {/* Actions */}
        {canTakeAction() && (
          <div className="flex gap-2 pt-2 border-t">
            {!notification.completedAt && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('completed')}
                className="flex-1 h-8 text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Completar
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickAction('archived')}
              className="flex-1 h-8 text-xs"
            >
              <Archive className="h-3 w-3 mr-1" />
              Archivar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}