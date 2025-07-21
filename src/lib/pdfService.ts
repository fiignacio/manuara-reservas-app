
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Quote } from '@/types/quote';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateRange, calculateNights } from './dateUtils';

export const generateQuotePDF = async (quote: Quote): Promise<void> => {
  // Crear el contenido HTML para la cotización
  const quoteHTML = createQuoteHTML(quote);
  
  // Crear un elemento temporal para renderizar el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = quoteHTML;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.padding = '20mm';
  tempDiv.style.backgroundColor = 'white';
  tempDiv.style.fontFamily = 'Arial, sans-serif';
  
  document.body.appendChild(tempDiv);

  try {
    // Convertir HTML a canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
    });

    // Crear PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Descargar el PDF
    pdf.save(`Cotizacion_${quote.customerName.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv);
  }
};

const createQuoteHTML = (quote: Quote): string => {
  const dateRange = formatDateRange(quote.checkIn, quote.checkOut);
  const validUntilDate = format(new Date(quote.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const createdDate = format(new Date(quote.createdAt || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: es });
  
  const nights = calculateNights(quote.checkIn, quote.checkOut);
  const pricePerNight = quote.totalPrice / nights;

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2563eb; padding-bottom: 20px;">
        <h1 style="color: #2563eb; font-size: 32px; margin: 0 0 10px 0; font-weight: bold;">MANUARA RESORT</h1>
        <p style="font-size: 16px; color: #666; margin: 0;">Isla Robinson Crusoe - Archipiélago Juan Fernández</p>
        <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">Cotización de Estadía</p>
      </div>

      <!-- Quote Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <h3 style="color: #2563eb; margin: 0 0 10px 0;">Cotización N°: ${quote.id}</h3>
          <p style="margin: 0; color: #666;">Fecha: ${createdDate}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #ef4444; font-weight: bold;">Válida hasta: ${validUntilDate}</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #2563eb; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Datos del Cliente</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Nombre:</strong> ${quote.customerName}<br>
            <strong>Email:</strong> ${quote.customerEmail}
          </div>
          <div>
            <strong>Teléfono:</strong> ${quote.customerPhone || 'No especificado'}
          </div>
        </div>
      </div>

      <!-- Reservation Details -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #2563eb; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Detalles de la Estadía</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Fechas:</strong> ${dateRange}<br>
            <strong>Noches:</strong> ${nights}<br>
            <strong>Temporada:</strong> ${quote.season}
          </div>
          <div>
            <strong>Huéspedes:</strong> ${quote.adults} adultos${quote.children8to15 > 0 ? `, ${quote.children8to15} niños (8-15 años)` : ''}${quote.childrenUnder7 > 0 ? `, ${quote.childrenUnder7} menores de 7 años` : ''}<br>
            <strong>Tipo de Cabaña:</strong> ${quote.cabinType}
          </div>
        </div>
      </div>

      <!-- Flight Info -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #2563eb; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Información de Vuelos</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Vuelo de Llegada:</strong> ${quote.arrivalFlight}
          </div>
          <div>
            <strong>Vuelo de Salida:</strong> ${quote.departureFlight}
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div style="border: 2px solid #2563eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #2563eb; margin: 0 0 15px 0; text-align: center;">Resumen de Costos</h3>
        <div style="font-size: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Precio por noche (${quote.cabinType})</span>
            <span>$${pricePerNight.toLocaleString('es-CL')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Número de noches</span>
            <span>${nights}</span>
          </div>
          <div style="border-top: 2px solid #2563eb; padding-top: 10px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; color: #2563eb;">
              <span>TOTAL</span>
              <span>$${quote.totalPrice.toLocaleString('es-CL')} CLP</span>
            </div>
          </div>
        </div>
      </div>

      ${quote.notes ? `
      <!-- Notes -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #92400e; margin: 0 0 10px 0;">Notas Adicionales</h3>
        <p style="margin: 0; color: #92400e;">${quote.notes}</p>
      </div>
      ` : ''}

      <!-- Terms -->
      <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; font-size: 14px; color: #475569;">
        <h3 style="color: #334155; margin: 0 0 15px 0;">Términos y Condiciones</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Esta cotización es válida hasta la fecha indicada.</li>
          <li>Los precios están expresados en pesos chilenos (CLP).</li>
          <li>La reserva se confirma con el pago del 50% del total.</li>
          <li>El saldo restante debe ser cancelado 15 días antes del check-in.</li>
          <li>Políticas de cancelación según términos y condiciones del resort.</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 14px;">
        <p style="margin: 0;">Para confirmar su reserva o realizar consultas:</p>
        <p style="margin: 5px 0 0 0;"><strong>Email:</strong> reservas@manuara.cl | <strong>Teléfono:</strong> +56 9 XXXX XXXX</p>
        <p style="margin: 15px 0 0 0; font-style: italic;">¡Esperamos recibirle pronto en Manuara Resort!</p>
      </div>
    </div>
  `;
};
