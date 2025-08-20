import { getAllReservations } from './reservationService';
import { Reservation } from '@/types/reservation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDate, formatDateForDisplay } from './dateUtils';

export interface ReportData {
  passengerName: string;
  checkIn: string;
  checkOut: string;
  arrivalFlight: string;
  departureFlight: string;
  totalGuests: number;
  adults: number;
  children: number;
  babies: number;
  cabinType: string;
  month: string;
  year: string;
}

export interface ReportFilters {
  month?: number;
  year: number;
  cabinType?: string;
}

export const generateReportData = async (filters: ReportFilters): Promise<ReportData[]> => {
  try {
    const reservations = await getAllReservations();
    
    const reportData: ReportData[] = reservations
      .filter((reservation) => {
        const checkInDate = parseDate(reservation.checkIn);
        const reservationYear = checkInDate.getFullYear();
        const reservationMonth = checkInDate.getMonth() + 1;
        
        // Filter by year
        if (reservationYear !== filters.year) return false;
        
        // Filter by month if specified
        if (filters.month && reservationMonth !== filters.month) return false;
        
        // Filter by cabin type if specified
        if (filters.cabinType && reservation.cabinType !== filters.cabinType) return false;
        
        return true;
      })
      .map((reservation) => ({
        passengerName: reservation.passengerName,
        checkIn: format(parseDate(reservation.checkIn), 'dd/MM/yyyy', { locale: es }),
        checkOut: format(parseDate(reservation.checkOut), 'dd/MM/yyyy', { locale: es }),
        arrivalFlight: reservation.arrivalFlight,
        departureFlight: reservation.departureFlight,
        totalGuests: reservation.adults + reservation.children + reservation.babies,
        adults: reservation.adults,
        children: reservation.children,
        babies: reservation.babies,
        cabinType: reservation.cabinType,
        month: format(parseDate(reservation.checkIn), 'MMMM', { locale: es }),
        year: parseDate(reservation.checkIn).getFullYear().toString(),
      }))
      .sort((a, b) => a.checkIn.split('/').reverse().join('-').localeCompare(b.checkIn.split('/').reverse().join('-')));
    
    return reportData;
  } catch (error) {
    console.error('Error generating report data:', error);
    throw new Error('Error al generar los datos del reporte');
  }
};

export const exportToCSV = (data: ReportData[], filters: ReportFilters): void => {
  try {
    const csvData = data.map(row => ({
      'Nombre del Pasajero': row.passengerName,
      'Check-in': row.checkIn,
      'Check-out': row.checkOut,
      'Vuelo de Llegada': row.arrivalFlight,
      'Vuelo de Salida': row.departureFlight,
      'Total Huéspedes': row.totalGuests,
      'Adultos': row.adults,
      'Niños': row.children,
      'Bebés': row.babies,
      'Tipo de Cabaña': row.cabinType,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const fileName = `reporte_uso_${filters.year}${filters.month ? `_${String(filters.month).padStart(2, '0')}` : ''}${filters.cabinType ? `_${filters.cabinType.replace(/\s+/g, '_')}` : ''}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Error al exportar a CSV');
  }
};

export const exportToPDF = (data: ReportData[], filters: ReportFilters): void => {
  try {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(16);
    doc.text('Reporte de Uso - Manuara Eco Lodge', 20, 20);
    
    // Filters info
    doc.setFontSize(12);
    let filterText = `Año: ${filters.year}`;
    if (filters.month) {
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      filterText += ` | Mes: ${monthNames[filters.month - 1]}`;
    }
    if (filters.cabinType) {
      filterText += ` | Cabaña: ${filters.cabinType}`;
    }
    
    doc.text(filterText, 20, 30);
    
    // Table headers
    const headers = [
      'Pasajero',
      'Check-in',
      'Check-out',
      'Vuelo Llegada',
      'Vuelo Salida',
      'Total',
      'Adultos',
      'Niños',
      'Bebés',
      'Cabaña'
    ];
    
    // Table data
    const tableData = data.map(row => [
      row.passengerName,
      row.checkIn,
      row.checkOut,
      row.arrivalFlight,
      row.departureFlight,
      row.totalGuests.toString(),
      row.adults.toString(),
      row.children.toString(),
      row.babies.toString(),
      row.cabinType
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Pasajero
        1: { cellWidth: 18 }, // Check-in
        2: { cellWidth: 18 }, // Check-out
        3: { cellWidth: 18 }, // Vuelo Llegada
        4: { cellWidth: 18 }, // Vuelo Salida
        5: { cellWidth: 12 }, // Total
        6: { cellWidth: 15 }, // Adultos
        7: { cellWidth: 12 }, // Niños
        8: { cellWidth: 12 }, // Bebés
        9: { cellWidth: 40 }, // Cabaña
      },
      margin: { top: 40 },
    });
    
    const fileName = `reporte_uso_${filters.year}${filters.month ? `_${String(filters.month).padStart(2, '0')}` : ''}${filters.cabinType ? `_${filters.cabinType.replace(/\s+/g, '_')}` : ''}.pdf`;
    
    doc.save(fileName);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Error al exportar a PDF');
  }
};

export const getCabinTypes = (): string[] => {
  return [
    'Cabaña Pequeña (Max 3p)',
    'Cabaña Mediana 1 (Max 4p)',
    'Cabaña Mediana 2 (Max 4p)',
    'Cabaña Grande (Max 6p)'
  ];
};

export type CabinGroup = 'small-large' | 'mediums';

const CABIN_GROUPS: Record<CabinGroup, { label: string; fileSuffix: string; types: string[] }> = {
  'small-large': {
    label: 'Pequeña + Grande',
    fileSuffix: 'pequena_grande',
    types: ['Cabaña Pequeña (Max 3p)', 'Cabaña Grande (Max 6p)'],
  },
  'mediums': {
    label: 'Medianas (1 y 2)',
    fileSuffix: 'medianas',
    types: ['Cabaña Mediana 1 (Max 4p)', 'Cabaña Mediana 2 (Max 4p)'],
  },
};

export const generateReportDataByCabinTypes = async (filters: ReportFilters, cabinTypes: string[]): Promise<ReportData[]> => {
  try {
    const reservations = await getAllReservations();

    const reportData: ReportData[] = reservations
      .filter((reservation) => {
        const checkInDate = parseDate(reservation.checkIn);
        const reservationYear = checkInDate.getFullYear();
        const reservationMonth = checkInDate.getMonth() + 1;

        if (reservationYear !== filters.year) return false;
        if (filters.month && reservationMonth !== filters.month) return false;
        if (!cabinTypes.includes(reservation.cabinType)) return false;

        return true;
      })
      .map((reservation) => ({
        passengerName: reservation.passengerName,
        checkIn: format(parseDate(reservation.checkIn), 'dd/MM/yyyy', { locale: es }),
        checkOut: format(parseDate(reservation.checkOut), 'dd/MM/yyyy', { locale: es }),
        arrivalFlight: reservation.arrivalFlight,
        departureFlight: reservation.departureFlight,
        totalGuests: reservation.adults + reservation.children + reservation.babies,
        adults: reservation.adults,
        children: reservation.children,
        babies: reservation.babies,
        cabinType: reservation.cabinType,
        month: format(parseDate(reservation.checkIn), 'MMMM', { locale: es }),
        year: parseDate(reservation.checkIn).getFullYear().toString(),
      }))
      .sort((a, b) => a.checkIn.split('/').reverse().join('-').localeCompare(b.checkIn.split('/').reverse().join('-')));

    return reportData;
  } catch (error) {
    console.error('Error generating report data by cabin types:', error);
    throw new Error('Error al generar los datos del reporte por grupo');
  }
};

export const generateGroupReportData = async (filters: ReportFilters, group: CabinGroup): Promise<ReportData[]> => {
  const cabinTypes = CABIN_GROUPS[group].types;
  const safeFilters = { ...filters, cabinType: undefined };
  return generateReportDataByCabinTypes(safeFilters, cabinTypes);
};

export const exportCabinGroupToCSV = async (filters: ReportFilters, group: CabinGroup): Promise<void> => {
  try {
    const data = await generateGroupReportData(filters, group);
    const csvData = data.map(row => ({
      'Nombre del Pasajero': row.passengerName,
      'Check-in': row.checkIn,
      'Check-out': row.checkOut,
      'Vuelo de Llegada': row.arrivalFlight,
      'Vuelo de Salida': row.departureFlight,
      'Total Huéspedes': row.totalGuests,
      'Adultos': row.adults,
      'Niños': row.children,
      'Bebés': row.babies,
      'Tipo de Cabaña': row.cabinType,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const monthPart = filters.month ? `_${String(filters.month).padStart(2, '0')}` : '';
    const fileName = `reporte_uso_${filters.year}${monthPart}_${CABIN_GROUPS[group].fileSuffix}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  } catch (error) {
    console.error('Error exporting cabin group to CSV:', error);
    throw new Error('Error al exportar a CSV (grupo)');
  }
};

export const exportCabinGroupToPDF = async (filters: ReportFilters, group: CabinGroup): Promise<void> => {
  try {
    const data = await generateGroupReportData(filters, group);
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Reporte de Uso - Manuara Eco Lodge', 20, 20);

    doc.setFontSize(12);
    let filterText = `Año: ${filters.year}`;
    if (filters.month) {
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      filterText += ` | Mes: ${monthNames[filters.month - 1]}`;
    }
    filterText += ` | Grupo: ${CABIN_GROUPS[group].label}`;
    doc.text(filterText, 20, 30);

    const headers = [
      'Pasajero',
      'Check-in',
      'Check-out',
      'Vuelo Llegada',
      'Vuelo Salida',
      'Total',
      'Adultos',
      'Niños',
      'Bebés',
      'Cabaña'
    ];

    const tableData = data.map(row => [
      row.passengerName,
      row.checkIn,
      row.checkOut,
      row.arrivalFlight,
      row.departureFlight,
      row.totalGuests.toString(),
      row.adults.toString(),
      row.children.toString(),
      row.babies.toString(),
      row.cabinType
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 18 },
        4: { cellWidth: 18 },
        5: { cellWidth: 12 },
        6: { cellWidth: 15 },
        7: { cellWidth: 12 },
        8: { cellWidth: 12 },
        9: { cellWidth: 40 },
      },
      margin: { top: 40 },
    });

    const monthPart = filters.month ? `_${String(filters.month).padStart(2, '0')}` : '';
    const fileName = `reporte_uso_${filters.year}${monthPart}_${CABIN_GROUPS[group].fileSuffix}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error exporting cabin group to PDF:', error);
    throw new Error('Error al exportar a PDF (grupo)');
  }
};

export const getAvailableYears = async (): Promise<number[]> => {
  try {
    const reservations = await getAllReservations();
    const years = [...new Set(reservations.map(r => parseDate(r.checkIn).getFullYear()))];
    return years.sort((a, b) => b - a); // Most recent first
  } catch (error) {
    console.error('Error getting available years:', error);
    return [new Date().getFullYear()];
  }
};