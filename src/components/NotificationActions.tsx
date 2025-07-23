
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Check, Archive, Clock, X, MessageSquare } from 'lucide-react';
import { Notification } from '../types/notification';
import { useToast } from '../hooks/use-toast';
import { useIsMobile } from '../hooks/use-mobile';

interface NotificationActionsProps {
  notification: Notification;
  onAction: (action: string, notes?: string) => Promise<void>;
  compact?: boolean;
}

export function NotificationActions({ notification, onAction, compact = false }: NotificationActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleAction = async (action: string, requiresNotes = false) => {
    if (requiresNotes) {
      setActionType(action);
      setIsDialogOpen(true);
      return;
    }

    try {
      setIsLoading(true);
      await onAction(action);
      toast({
        title: "Acción completada",
        description: getActionMessage(action)
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogAction = async () => {
    try {
      setIsLoading(true);
      await onAction(actionType, notes);
      toast({
        title: "Acción completada",
        description: getActionMessage(actionType)
      });
      setIsDialogOpen(false);
      setNotes('');
      setActionType('');
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la acción",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getActionMessage = (action: string) => {
    switch (action) {
      case 'completed': return 'Notificación marcada como completada';
      case 'archived': return 'Notificación archivada';
      case 'snoozed': return 'Notificación pospuesta';
      case 'cancelled': return 'Notificación cancelada';
      default: return 'Acción realizada';
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

  const ActionDialog = () => {
    const DialogComponent = isMobile ? Drawer : Dialog;
    const TriggerComponent = isMobile ? DrawerTrigger : DialogTrigger;
    const ContentComponent = isMobile ? DrawerContent : DialogContent;
    const HeaderComponent = isMobile ? DrawerHeader : DialogHeader;
    const TitleComponent = isMobile ? DrawerTitle : DialogTitle;
    const DescriptionComponent = isMobile ? DrawerDescription : DialogDescription;

    return (
      <DialogComponent open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <ContentComponent className={isMobile ? "max-h-[90vh]" : ""}>
          <HeaderComponent>
            <TitleComponent>
              {actionType === 'completed' ? 'Completar Notificación' : 'Acción sobre Notificación'}
            </TitleComponent>
            <DescriptionComponent>
              {actionType === 'completed' 
                ? 'Describe qué acción se tomó para completar esta notificación.'
                : 'Agrega notas sobre esta acción (opcional).'}
            </DescriptionComponent>
          </HeaderComponent>
          
          <div className={`space-y-4 ${isMobile ? 'p-4' : ''}`}>
            <div>
              <Label htmlFor="notes">
                {actionType === 'completed' ? 'Acción tomada' : 'Notas'}
              </Label>
              <Textarea
                id="notes"
                placeholder={actionType === 'completed' 
                  ? "Ej: Se contactó al huésped por WhatsApp, se confirmó el check-in..."
                  : "Notas adicionales..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className={isMobile ? "text-base" : ""}
              />
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                className={isMobile ? "h-10" : ""}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDialogAction}
                disabled={isLoading || (actionType === 'completed' && !notes.trim())}
                className={isMobile ? "h-10" : ""}
              >
                {isLoading ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </ContentComponent>
      </DialogComponent>
    );
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {getStatusBadge()}
        {canTakeAction() && (
          <div className={`flex gap-1 ${isMobile ? 'flex-col' : ''}`}>
            {!notification.completedAt && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAction('completed', true)}
                disabled={isLoading}
                className={isMobile ? "h-8 w-full text-xs" : "h-6 px-2"}
              >
                <Check className="h-3 w-3" />
                {isMobile && <span className="ml-1">Completar</span>}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('archived')}
              disabled={isLoading}
              className={isMobile ? "h-8 w-full text-xs" : "h-6 px-2"}
            >
              <Archive className="h-3 w-3" />
              {isMobile && <span className="ml-1">Archivar</span>}
            </Button>
          </div>
        )}
        <ActionDialog />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${isMobile ? 'flex-col gap-2' : 'justify-between'}`}>
      {getStatusBadge()}
      
      {canTakeAction() && (
        <div className={`flex gap-2 ${isMobile ? 'w-full flex-wrap' : ''}`}>
          {!notification.completedAt && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction('completed', true)}
              disabled={isLoading}
              className={isMobile ? "flex-1 h-9" : ""}
            >
              <Check className="h-4 w-4 mr-1" />
              Completar
            </Button>
          )}
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('snoozed')}
            disabled={isLoading}
            className={isMobile ? "flex-1 h-9" : ""}
          >
            <Clock className="h-4 w-4 mr-1" />
            Posponer
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction('archived')}
            disabled={isLoading}
            className={isMobile ? "flex-1 h-9" : ""}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archivar
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleAction('cancelled')}
            disabled={isLoading}
            className={isMobile ? "flex-1 h-9" : ""}
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      )}

      <ActionDialog />
    </div>
  );
}
