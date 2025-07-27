import { useState } from 'react';
import { FileText, Download, Send, Clock, CheckCircle, AlertCircle, Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  RadioGroup, 
  RadioGroupItem 
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Reservation } from '@/types/reservation';
import { Document, DocumentType, DocumentStatus } from '@/types/document';
import { DocumentService } from '@/lib/documentService';
import { createReservationConfirmationHTML, generateReservationConfirmationPDF } from '@/lib/pdfService';

interface DocumentManagerProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
}

const DocumentManager = ({ reservation, isOpen, onClose }: DocumentManagerProps) => {
  const [documents, setDocuments] = useState<Document[]>(reservation.documents || []);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType>('quote');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus>('generated');
  const { toast } = useToast();

  const documentTypes: { value: DocumentType; label: string; description: string }[] = [
    { value: 'quote', label: 'Cotización', description: 'Documento de cotización de la reserva' },
    { value: 'confirmation', label: 'Confirmación', description: 'Confirmación de reserva' },
    { value: 'invoice', label: 'Factura', description: 'Factura de la reserva' },
    { value: 'check_in', label: 'Check-in', description: 'Documento de ingreso' },
    { value: 'check_out', label: 'Check-out', description: 'Documento de salida' },
  ];

  const statusOptions: { value: DocumentStatus; label: string; description: string }[] = [
    { value: 'generated', label: 'Archivo Generado', description: 'Solo generar el documento' },
    { value: 'sent', label: 'Archivo Enviado', description: 'Generar y marcar como enviado' },
  ];

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'generated':
        return { variant: 'secondary' as const, label: 'Generado', icon: FileText };
      case 'sent':
        return { variant: 'default' as const, label: 'Enviado', icon: CheckCircle };
      case 'pending':
        return { variant: 'outline' as const, label: 'Pendiente', icon: Clock };
      default:
        return { variant: 'destructive' as const, label: 'Error', icon: AlertCircle };
    }
  };

  const getDocumentTypeName = (type: DocumentType) => {
    return documentTypes.find(dt => dt.value === type)?.label || type;
  };

  const handleGenerateDocument = async () => {
    try {
      setIsGenerating(true);
      
      let htmlContent = '';
      let fileName = '';

      switch (selectedDocumentType) {
        case 'confirmation':
          htmlContent = createReservationConfirmationHTML(reservation);
          fileName = `confirmacion_${reservation.passengerName.replace(/\s+/g, '_')}_${new Date().getTime()}`;
          break;
        default:
          htmlContent = createReservationConfirmationHTML(reservation);
          fileName = `documento_${reservation.passengerName.replace(/\s+/g, '_')}_${new Date().getTime()}`;
      }

      const newDocument: Document = {
        id: `doc_${Date.now()}`,
        reservationId: reservation.id!,
        type: selectedDocumentType,
        status: selectedStatus,
        generatedAt: new Date().toISOString(),
        sentAt: selectedStatus === 'sent' ? new Date().toISOString() : undefined,
        fileName,
        htmlContent,
        recipientInfo: {
          name: reservation.passengerName,
          email: reservation.email || '',
        }
      };

      // Simular guardado del documento
      await DocumentService.saveDocument(newDocument);
      
      // Actualizar estado local
      setDocuments(prev => [...prev, newDocument]);

      // Generar y descargar PDF
      await generateReservationConfirmationPDF(reservation);

      toast({
        title: "Documento generado",
        description: `${getDocumentTypeName(selectedDocumentType)} generado exitosamente`,
      });

      // Limpiar selección
      setSelectedDocumentType('quote');
      setSelectedStatus('generated');

    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el documento",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateDocument = async (document: Document) => {
    try {
      setIsGenerating(true);
      
      // Regenerar el documento con el mismo tipo
      await generateReservationConfirmationPDF(reservation);

      toast({
        title: "Documento regenerado",
        description: `${getDocumentTypeName(document.type)} descargado exitosamente`,
      });
    } catch (error) {
      console.error('Error regenerating document:', error);
      toast({
        title: "Error",
        description: "No se pudo regenerar el documento",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkAsSent = async (document: Document) => {
    try {
      const updatedDocument = {
        ...document,
        status: 'sent' as DocumentStatus,
        sentAt: new Date().toISOString()
      };

      await DocumentService.updateDocument(updatedDocument);
      
      setDocuments(prev => 
        prev.map(doc => doc.id === document.id ? updatedDocument : doc)
      );

      toast({
        title: "Documento marcado como enviado",
        description: `${getDocumentTypeName(document.type)} marcado como enviado`,
      });
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado del documento",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Gestión de Documentos - {reservation.passengerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Generar nuevo documento */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Generar Nuevo Documento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Tipo de Documento</Label>
                  <RadioGroup 
                    value={selectedDocumentType} 
                    onValueChange={(value) => setSelectedDocumentType(value as DocumentType)}
                    className="mt-2"
                  >
                    {documentTypes.map((type) => (
                      <div key={type.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={type.value} id={type.value} />
                        <Label htmlFor={type.value} className="flex-1 cursor-pointer">
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <div>
                  <Label className="text-sm font-medium">Estado del Documento</Label>
                  <RadioGroup 
                    value={selectedStatus} 
                    onValueChange={(value) => setSelectedStatus(value as DocumentStatus)}
                    className="mt-2"
                  >
                    {statusOptions.map((status) => (
                      <div key={status.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={status.value} id={status.value} />
                        <Label htmlFor={status.value} className="flex-1 cursor-pointer">
                          <div className="font-medium">{status.label}</div>
                          <div className="text-xs text-muted-foreground">{status.description}</div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <Button 
                onClick={handleGenerateDocument}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Generar Documento
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Separator />

          {/* Lista de documentos existentes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Documentos Existentes</h3>
            
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No hay documentos generados para esta reserva.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => {
                  const statusBadge = getStatusBadge(document.status);
                  const StatusIcon = statusBadge.icon;
                  
                  return (
                    <Card key={document.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {getDocumentTypeName(document.type)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Generado: {formatDate(document.generatedAt)}
                              </div>
                              {document.sentAt && (
                                <div className="text-sm text-muted-foreground">
                                  Enviado: {formatDate(document.sentAt)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                              <StatusIcon className="w-3 h-3" />
                              {statusBadge.label}
                            </Badge>
                            
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRegenerateDocument(document)}
                                disabled={isGenerating}
                                title="Descargar documento"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              
                              {document.status !== 'sent' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkAsSent(document)}
                                  title="Marcar como enviado"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentManager;