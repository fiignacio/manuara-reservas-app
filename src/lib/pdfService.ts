
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Quote } from '@/types/quote';
import { Reservation } from '@/types/reservation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatDateRange, calculateNights } from './dateUtils';
import { AssetsService } from '@/lib/assetsService';

export const generateQuotePDF = async (quote: Quote): Promise<void> => {
  // Crear el contenido HTML para la cotización
  const quoteHTML = await createQuoteHTML(quote);
  
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

export const generateConfirmationPDF = async (reservation: Reservation): Promise<void> => {
  // Usar el PDF de confirmación de reserva mejorado
  await generateReservationConfirmationPDF(reservation);
};

export const generateReservationConfirmationPDF = async (reservation: Reservation): Promise<void> => {
  // Crear el contenido HTML para la confirmación de reserva
  const confirmationHTML = createReservationConfirmationHTML(reservation);

  // Crear un elemento temporal para renderizar el HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = confirmationHTML;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.width = '210mm'; // A4 width
  tempDiv.style.padding = '15mm';
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
    pdf.save(`Confirmacion_Reserva_${reservation.passengerName.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
  } finally {
    // Limpiar el elemento temporal
    document.body.removeChild(tempDiv);
  }
};

export const createQuoteHTML = async (quote: Quote): Promise<string> => {
  const dateRange = formatDateRange(quote.checkIn, quote.checkOut);
  const validUntilDate = format(new Date(quote.validUntil), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const createdDate = format(new Date(quote.createdAt || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: es });
  
  const nights = calculateNights(quote.checkIn, quote.checkOut);
  const pricePerNight = quote.totalPrice / nights;
  const companyHeader = await AssetsService.getCompanyHeader();

  return `
    <div style="max-width: 750px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif; line-height: 1.4; color: #333; font-size: 14px;">
      <!-- Compact Header -->
      <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2563eb; padding-bottom: 15px;">
        <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
          <h1 style="color: white; font-size: 24px; margin: 0; font-weight: bold;">CABAÑAS MANUARA</h1>
          <p style="font-size: 14px; color: white; margin: 0;">Rapa Nui - Isla de Pascua</p>
        </div>
        <p style="font-size: 12px; color: #666; margin: 0;">Cotización de Estadía</p>
      </div>

      <!-- Two-column layout for efficiency -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <!-- Left Column -->
        <div>
          <!-- Quote Info -->
          <div style="margin-bottom: 15px;">
            <h3 style="color: #2563eb; margin: 0 0 5px 0; font-size: 16px;">Cotización N°: ${quote.id}</h3>
            <p style="margin: 0; color: #666; font-size: 12px;">Fecha: ${createdDate}</p>
            <p style="margin: 5px 0 0 0; color: #ef4444; font-weight: bold; font-size: 12px;">Válida hasta: ${validUntilDate}</p>
          </div>

          <!-- Customer Info -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <h4 style="color: #2563eb; margin: 0 0 8px 0; font-size: 14px;">Cliente</h4>
            <div style="font-size: 12px;">
              <strong>Nombre:</strong> ${quote.customerName}<br>
              <strong>Email:</strong> ${quote.customerEmail}<br>
              <strong>Teléfono:</strong> ${quote.customerPhone || 'No especificado'}
            </div>
          </div>

          <!-- Flight Info -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px;">
            <h4 style="color: #2563eb; margin: 0 0 8px 0; font-size: 14px;">Vuelos</h4>
            <div style="font-size: 12px;">
              <strong>Llegada:</strong> ${quote.arrivalFlight}<br>
              <strong>Salida:</strong> ${quote.departureFlight}
            </div>
          </div>
        </div>

        <!-- Right Column -->
        <div>
          <!-- Reservation Details -->
          <div style="background: #f8fafc; padding: 12px; border-radius: 6px; margin-bottom: 15px;">
            <h4 style="color: #2563eb; margin: 0 0 8px 0; font-size: 14px;">Detalles de Estadía</h4>
            <div style="font-size: 12px;">
              <strong>Fechas:</strong> ${dateRange}<br>
              <strong>Noches:</strong> ${nights}<br>
              <strong>Temporada:</strong> ${quote.season}<br>
              <strong>Huéspedes:</strong> ${quote.adults} adultos${quote.children8to15 > 0 ? `, ${quote.children8to15} niños` : ''}${quote.childrenUnder7 > 0 ? `, ${quote.childrenUnder7} menores` : ''}<br>
              <strong>Cabaña:</strong> ${quote.cabinType}
            </div>
          </div>

          <!-- Compact Pricing -->
          <div style="border: 2px solid #2563eb; border-radius: 6px; padding: 12px;">
            <h4 style="color: #2563eb; margin: 0 0 8px 0; text-align: center; font-size: 14px;">Costos</h4>
            <div style="font-size: 12px; text-align: center;">
              <div style="margin-bottom: 5px;">
                <strong>Por noche:</strong> $${pricePerNight.toLocaleString('es-CL')}
              </div>
              <div style="margin-bottom: 5px;">
                <strong>${nights} noches:</strong> $${quote.totalPrice.toLocaleString('es-CL')}
              </div>
              <div style="border-top: 1px solid #2563eb; padding-top: 5px; margin-top: 8px;">
                <strong style="font-size: 16px; color: #2563eb;">TOTAL: $${quote.totalPrice.toLocaleString('es-CL')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      ${quote.notes ? `
      <!-- Notes -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 15px;">
        <h4 style="color: #92400e; margin: 0 0 5px 0; font-size: 14px;">Notas</h4>
        <p style="margin: 0; color: #92400e; font-size: 12px;">${quote.notes}</p>
      </div>
      ` : ''}

      <!-- Compact Terms -->
      <div style="background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 11px; color: #475569;">
        <h4 style="color: #334155; margin: 0 0 8px 0; font-size: 12px;">Términos</h4>
        <ul style="margin: 0; padding-left: 15px; line-height: 1.3;">
          <li>Cotización válida hasta fecha indicada</li>
          <li>Reserva se confirma con 50% del total</li>
          <li>Saldo restante a la llegada</li>
        </ul>
      </div>

      <!-- Compact Footer -->
      <div style="text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #666; font-size: 11px;">
        <p style="margin: 0; font-style: italic;">¡Esperamos recibirle pronto en Cabañas Manuara!</p>
      </div>
    </div>
  `;
};

const createConfirmationHTML = (reservation: Reservation): string => {
  const dateRange = formatDateRange(reservation.checkIn, reservation.checkOut);
  const createdDate = format(new Date(reservation.createdAt || new Date()), "dd 'de' MMMM 'de' yyyy", { locale: es });

  const nights = calculateNights(reservation.checkIn, reservation.checkOut);
  const pricePerNight = reservation.totalPrice / nights;
  const paidAmount = reservation.payments.reduce((acc, p) => acc + p.amount, 0);
  const pendingAmount = reservation.totalPrice - paidAmount;

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 40px; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #16a34a; padding-bottom: 20px;">
        <h1 style="color: #16a34a; font-size: 32px; margin: 0 0 10px 0; font-weight: bold;">MANUARA RESORT</h1>
        <p style="font-size: 16px; color: #666; margin: 0;">Isla Robinson Crusoe - Archipiélago Juan Fernández</p>
        <p style="font-size: 14px; color: #666; margin: 5px 0 0 0;">Confirmación de Reserva</p>
      </div>

      <!-- Confirmation Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <h3 style="color: #16a34a; margin: 0 0 10px 0;">Reserva N°: ${reservation.id}</h3>
          <p style="margin: 0; color: #666;">Fecha: ${createdDate}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; color: #16a34a; font-weight: bold; font-size: 18px;">¡Reserva Confirmada!</p>
        </div>
      </div>

      <!-- Customer Info -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #16a34a; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Datos del Cliente</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Nombre:</strong> ${reservation.passengerName}<br>
            <strong>Email:</strong> ${reservation.customerEmail || 'No especificado'}
          </div>
          <div>
            <strong>Teléfono:</strong> ${reservation.customerPhone || 'No especificado'}
          </div>
        </div>
      </div>

      <!-- Reservation Details -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #16a34a; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Detalles de la Estadía</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Fechas:</strong> ${dateRange}<br>
            <strong>Noches:</strong> ${nights}<br>
            <strong>Temporada:</strong> ${reservation.season}
          </div>
          <div>
            <strong>Huéspedes:</strong> ${reservation.adults} adultos${reservation.children > 0 ? `, ${reservation.children} niños` : ''}${reservation.babies > 0 ? `, ${reservation.babies} bebés` : ''}<br>
            <strong>Tipo de Cabaña:</strong> ${reservation.cabinType}
          </div>
        </div>
      </div>

      <!-- Flight Info -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="color: #16a34a; margin: 0 0 15px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Información de Vuelos</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
          <div>
            <strong>Vuelo de Llegada:</strong> ${reservation.arrivalFlight}
          </div>
          <div>
            <strong>Vuelo de Salida:</strong> ${reservation.departureFlight}
          </div>
        </div>
      </div>

      <!-- Pricing -->
      <div style="border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #16a34a; margin: 0 0 15px 0; text-align: center;">Resumen de Pagos</h3>
        <div style="font-size: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Total Reserva</span>
            <span>$${reservation.totalPrice.toLocaleString('es-CL')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #15803d;">
            <span>Total Pagado</span>
            <span>$${paidAmount.toLocaleString('es-CL')}</span>
          </div>
          <div style="border-top: 2px solid #16a34a; padding-top: 10px; margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: bold; color: #16a34a;">
              <span>SALDO PENDIENTE</span>
              <span>$${pendingAmount.toLocaleString('es-CL')} CLP</span>
            </div>
          </div>
        </div>
      </div>

      ${reservation.comments ? `
      <!-- Notes -->
      <div style="background: #fefce8; border: 1px solid #a16207; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="color: #854d0e; margin: 0 0 10px 0;">Notas Adicionales</h3>
        <p style="margin: 0; color: #854d0e;">${reservation.comments}</p>
      </div>
      ` : ''}

      <!-- Terms -->
      <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; font-size: 14px; color: #475569;">
        <h3 style="color: #334155; margin: 0 0 15px 0;">Información Importante</h3>
        <ul style="margin: 0; padding-left: 20px;">
          <li>El saldo restante debe ser cancelado 15 días antes del check-in.</li>
          <li>No olvide informarnos de cualquier requerimiento especial.</li>
          <li>Políticas de cancelación según términos y condiciones del resort.</li>
        </ul>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #666; font-size: 14px;">
        <p style="margin: 0;">Para consultas sobre su reserva:</p>
        <p style="margin: 5px 0 0 0;"><strong>Email:</strong> reservas@manuara.cl | <strong>Teléfono:</strong> +56 9 XXXX XXXX</p>
        <p style="margin: 15px 0 0 0; font-style: italic;">¡Su aventura en Robinson Crusoe está a punto de comenzar!</p>
      </div>
    </div>
  `;
};

export const createReservationConfirmationHTML = (reservation: Reservation): string => {
  const checkInDate = format(new Date(reservation.checkIn), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const checkOutDate = format(new Date(reservation.checkOut), "dd 'de' MMMM 'de' yyyy", { locale: es });
  const createdDate = format(new Date(reservation.createdAt || new Date()), "dd/MM/yyyy", { locale: es });
  const nights = calculateNights(reservation.checkIn, reservation.checkOut);

  // Generate guest list
  const guestList = reservation.guestNames && reservation.guestRuts 
    ? reservation.guestNames.map((name, index) => 
        `<tr><td style="padding: 8px; border: 1px solid #ddd;">${name}</td><td style="padding: 8px; border: 1px solid #ddd;">${reservation.guestRuts?.[index] || ''}</td></tr>`
      ).join('')
    : `<tr><td style="padding: 8px; border: 1px solid #ddd;">${reservation.passengerName}</td><td style="padding: 8px; border: 1px solid #ddd;">Por completar</td></tr>`;

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 30px; font-family: Arial, sans-serif; line-height: 1.4; color: #000; background: white;">
      <!-- Header with Logo and Title -->
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
          <h1 style="font-size: 36px; margin: 0; font-weight: bold; letter-spacing: 2px;">MANUARA</h1>
          <p style="font-size: 14px; margin: 5px 0 0 0; opacity: 0.9;">RESORT & SPA</p>
        </div>
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #1e40af;">
          <h2 style="color: #1e40af; font-size: 24px; margin: 0; font-weight: bold;">CONFIRMACIÓN DE RESERVA</h2>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">Isla Robinson Crusoe - Archipiélago Juan Fernández</p>
        </div>
      </div>

      <!-- SERNATUR Info -->
      <div style="text-align: right; margin-bottom: 20px; font-size: 12px; color: #666;">
        <p style="margin: 0;">Código SERNATUR: ${reservation.sernateurCode || 'RN-2024-001'}</p>
        <p style="margin: 0;">Fecha de emisión: ${createdDate}</p>
      </div>

      <!-- Reservation Details -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">DETALLES DE LA RESERVA</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Número de Reserva:</strong> ${reservation.id || 'MAN-' + Date.now()}</p>
            <p style="margin: 0 0 8px 0;"><strong>Check-in:</strong> ${checkInDate}</p>
            <p style="margin: 0 0 8px 0;"><strong>Check-out:</strong> ${checkOutDate}</p>
            <p style="margin: 0 0 8px 0;"><strong>Noches:</strong> ${nights}</p>
          </div>
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Temporada:</strong> ${reservation.season}</p>
            <p style="margin: 0 0 8px 0;"><strong>Tipo de Cabaña:</strong> ${reservation.cabinType}</p>
            <p style="margin: 0 0 8px 0;"><strong>Huéspedes:</strong> ${reservation.adults + reservation.children + reservation.babies} personas</p>
          </div>
        </div>
      </div>

      <!-- Flight Information -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">INFORMACIÓN DE VUELOS</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Vuelo de Llegada:</strong> ${reservation.arrivalFlight}</p>
          </div>
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Vuelo de Salida:</strong> ${reservation.departureFlight}</p>
          </div>
        </div>
        ${reservation.transferInfo ? `
        <div style="margin-top: 15px; padding: 10px; background: #eff6ff; border-radius: 6px;">
          <p style="margin: 0; font-size: 14px;"><strong>Información de Transfer:</strong> ${reservation.transferInfo}</p>
        </div>
        ` : ''}
      </div>

      <!-- Guest List -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">LISTADO DE HUÉSPEDES</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <thead>
            <tr style="background: #1e40af; color: white;">
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Nombre Completo</th>
              <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">RUT/Documento</th>
            </tr>
          </thead>
          <tbody>
            ${guestList}
          </tbody>
        </table>
      </div>

      <!-- Contact Information -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e5e7eb;">
        <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #1e40af; padding-bottom: 8px;">DATOS DE CONTACTO</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Nombre:</strong> ${reservation.passengerName}</p>
            <p style="margin: 0 0 8px 0;"><strong>Email:</strong> ${reservation.customerEmail || 'Por completar'}</p>
          </div>
          <div>
            <p style="margin: 0 0 8px 0;"><strong>Teléfono:</strong> ${reservation.customerPhone || 'Por completar'}</p>
          </div>
        </div>
      </div>

      <!-- Payment Summary -->
      <div style="background: #fee; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 2px solid #ef4444;">
        <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px; text-align: center;">RESUMEN DE PAGOS</h3>
        <div style="text-align: center; font-size: 18px;">
          <p style="margin: 0 0 10px 0;"><strong>Total de la Reserva: $${reservation.totalPrice.toLocaleString('es-CL')} CLP</strong></p>
          <p style="margin: 0 0 10px 0; color: #16a34a;">Pagado: $${reservation.payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString('es-CL')} CLP</p>
          <p style="margin: 0; color: #dc2626; font-size: 20px;"><strong>Saldo Pendiente: $${reservation.remainingBalance.toLocaleString('es-CL')} CLP</strong></p>
        </div>
      </div>

      <!-- Important Information -->
      <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f59e0b;">
        <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">INFORMACIÓN IMPORTANTE</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
          <li>El saldo pendiente debe ser cancelado 15 días antes del check-in.</li>
          <li>Presentar esta confirmación al momento del check-in.</li>
          <li>Horario de check-in: 15:00 hrs. / Check-out: 11:00 hrs.</li>
          <li>Incluye transfer desde/hacia aeródromo según vuelos confirmados.</li>
          <li>Para cambios o cancelaciones, contactar con 48 hrs de anticipación.</li>
        </ul>
      </div>

      ${reservation.comments ? `
      <!-- Additional Notes -->
      <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #0ea5e9;">
        <h3 style="color: #0284c7; margin: 0 0 10px 0; font-size: 16px;">Notas Adicionales</h3>
        <p style="margin: 0; color: #0369a1; font-size: 14px;">${reservation.comments}</p>
      </div>
      ` : ''}

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #1e40af; color: #666; font-size: 14px;">
        <div style="background: #1e40af; color: white; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <p style="margin: 0; font-weight: bold;">MANUARA RESORT & SPA</p>
          <p style="margin: 5px 0 0 0; font-size: 12px;">Isla Robinson Crusoe - Archipiélago Juan Fernández</p>
        </div>
        <p style="margin: 0 0 5px 0;"><strong>Contacto:</strong> reservas@manuara.cl | +56 9 XXXX XXXX</p>
        <p style="margin: 0; font-style: italic; color: #1e40af; font-weight: bold;">¡Te esperamos en el paraíso de Robinson Crusoe!</p>
      </div>
    </div>
  `;
};
