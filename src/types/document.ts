export type DocumentType = 'quote' | 'confirmation' | 'invoice' | 'check_in' | 'check_out';
export type DocumentStatus = 'generated' | 'sent' | 'pending';

export interface Document {
  id: string;
  reservationId: string;
  type: DocumentType;
  status: DocumentStatus;
  generatedAt: string;
  sentAt?: string;
  fileName: string;
  htmlContent: string;
  recipientInfo: {
    name: string;
    email: string;
  };
}

export interface DocumentGenerationRequest {
  type: DocumentType;
  status: DocumentStatus;
  reservation: any; // Will be Reservation type but avoiding circular import
}