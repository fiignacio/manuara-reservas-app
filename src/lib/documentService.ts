import { Document } from '@/types/document';

export class DocumentService {
  static async saveDocument(document: Document): Promise<void> {
    // Simular guardado en localStorage por ahora
    const existingDocs = JSON.parse(localStorage.getItem('documents') || '[]');
    existingDocs.push(document);
    localStorage.setItem('documents', JSON.stringify(existingDocs));
  }

  static async updateDocument(document: Document): Promise<void> {
    const existingDocs = JSON.parse(localStorage.getItem('documents') || '[]');
    const updatedDocs = existingDocs.map((doc: Document) => 
      doc.id === document.id ? document : doc
    );
    localStorage.setItem('documents', JSON.stringify(updatedDocs));
  }

  static async getDocumentsByReservation(reservationId: string): Promise<Document[]> {
    const existingDocs = JSON.parse(localStorage.getItem('documents') || '[]');
    return existingDocs.filter((doc: Document) => doc.reservationId === reservationId);
  }
}