import { getAllReservations } from './reservationService';
import { Reservation } from '@/types/reservation';
import { format, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseDate, formatDateForDisplay } from './dateUtils';
import { logger } from './logger';

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
  includeOverlaps?: boolean; // Include reservations that span month boundaries
}

export const generateReportData = async (filters: ReportFilters): Promise<ReportData[]> => {
  logger.info('reports.generateReportData.start', { filters });
  logger.time('reports.generateReportData');

  try {
    const reservations = await getAllReservations();
    logger.debug('reports.generateReportData.loaded', { totalReservations: reservations.length });
    
    const reportData: ReportData[] = reservations
      .filter((reservation) => {
        try {
          // Validate required fields with fallbacks
          if (!reservation.checkIn || !reservation.checkOut) {
            logger.warn('reports.generateReportData.missing_dates', { 
              id: reservation.id, 
              checkIn: reservation.checkIn, 
              checkOut: reservation.checkOut 
            });
            return false;
          }

          const checkInDate = parseDate(reservation.checkIn);
          const checkOutDate = parseDate(reservation.checkOut);
          
          if (!checkInDate || !checkOutDate) {
            logger.warn('reports.generateReportData.invalid_dates', { 
              id: reservation.id, 
              checkIn: reservation.checkIn, 
              checkOut: reservation.checkOut 
            });
            return false;
          }

          const reservationYear = checkInDate.getFullYear();
          
          // Filter by year
          if (reservationYear !== filters.year) {
            // Also check checkout year for year-spanning reservations
            const checkOutYear = checkOutDate.getFullYear();
            if (checkOutYear !== filters.year) return false;
          }
          
          // Enhanced month filtering with overlap support
          if (filters.month) {
            const startOfMonth = new Date(filters.year, filters.month - 1, 1);
            const endOfMonth = new Date(filters.year, filters.month, 0);
            
            if (filters.includeOverlaps) {
              // Include if reservation overlaps with the month
              const hasOverlap = isWithinInterval(checkInDate, { start: startOfMonth, end: endOfMonth }) ||
                               isWithinInterval(checkOutDate, { start: startOfMonth, end: endOfMonth }) ||
                               (checkInDate <= startOfMonth && checkOutDate >= endOfMonth);
              if (!hasOverlap) return false;
            } else {
              // Default: only include if check-in is in the month
              const checkInMonth = checkInDate.getMonth() + 1;
              if (checkInMonth !== filters.month) return false;
            }
          }
          
          // Filter by cabin type if specified
          if (filters.cabinType && reservation.cabinType !== filters.cabinType) return false;
          
          return true;
        } catch (error) {
          logger.error('reports.generateReportData.filter_error', { 
            id: reservation.id, 
            error: String(error) 
          });
          return false;
        }
      })
      .map((reservation) => {
        try {
          const checkInDate = parseDate(reservation.checkIn);
          const checkOutDate = parseDate(reservation.checkOut);
          
          return {
            passengerName: reservation.passengerName || 'Sin nombre',
            checkIn: format(checkInDate, 'dd/MM/yyyy', { locale: es }),
            checkOut: format(checkOutDate, 'dd/MM/yyyy', { locale: es }),
            arrivalFlight: reservation.arrivalFlight || 'N/A',
            departureFlight: reservation.departureFlight || 'N/A',
            totalGuests: (reservation.adults || 0) + (reservation.children || 0) + (reservation.babies || 0),
            adults: reservation.adults || 0,
            children: reservation.children || 0,
            babies: reservation.babies || 0,
            cabinType: reservation.cabinType || 'Sin especificar',
            month: format(checkInDate, 'MMMM', { locale: es }),
            year: checkInDate.getFullYear().toString(),
          };
        } catch (error) {
          logger.error('reports.generateReportData.mapping_error', { 
            id: reservation.id, 
            error: String(error) 
          });
          // Return fallback data for corrupted reservations
          return {
            passengerName: reservation.passengerName || 'Error en datos',
            checkIn: reservation.checkIn || 'N/A',
            checkOut: reservation.checkOut || 'N/A',
            arrivalFlight: 'N/A',
            departureFlight: 'N/A',
            totalGuests: 0,
            adults: 0,
            children: 0,
            babies: 0,
            cabinType: reservation.cabinType || 'N/A',
            month: 'N/A',
            year: 'N/A',
          };
        }
      })
      // Robust date-based sorting
      .sort((a, b) => {
        try {
          const dateA = a.checkIn.split('/').reverse().join('-');
          const dateB = b.checkIn.split('/').reverse().join('-');
          return dateA.localeCompare(dateB);
        } catch (error) {
          logger.warn('reports.generateReportData.sort_error', { error: String(error) });
          return 0; // Keep original order for problematic entries
        }
      });

    logger.info('reports.generateReportData.success', { 
      filteredCount: reportData.length,
      totalCount: reservations.length 
    });
    
    return reportData;
  } catch (error) {
    logger.error('reports.generateReportData.error', { error: String(error), filters });
    throw new Error('Error al generar los datos del reporte');
  } finally {
    logger.timeEnd('reports.generateReportData');
  }
};

// Security: Sanitize CSV data to prevent formula injection
const sanitizeCSVValue = (value: string | number): string => {
  const strValue = String(value);
  // Prevent CSV formula injection by prefixing dangerous characters
  if (/^[=+\-@\t\r]/.test(strValue)) {
    return `'${strValue}`;
  }
  return strValue;
};

export const exportToCSV = (data: ReportData[], filters: ReportFilters): void => {
  logger.info('reports.exportToCSV.start', { dataCount: data.length, filters });
  logger.time('reports.exportToCSV');

  try {
    const csvData = data.map(row => ({
      'Nombre del Pasajero': sanitizeCSVValue(row.passengerName),
      'Check-in': sanitizeCSVValue(row.checkIn),
      'Check-out': sanitizeCSVValue(row.checkOut),
      'Vuelo de Llegada': sanitizeCSVValue(row.arrivalFlight),
      'Vuelo de Salida': sanitizeCSVValue(row.departureFlight),
      'Total Huéspedes': sanitizeCSVValue(row.totalGuests),
      'Adultos': sanitizeCSVValue(row.adults),
      'Niños': sanitizeCSVValue(row.children),
      'Bebés': sanitizeCSVValue(row.babies),
      'Tipo de Cabaña': sanitizeCSVValue(row.cabinType),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const fileName = `reporte_uso_${filters.year}${filters.month ? `_${String(filters.month).padStart(2, '0')}` : ''}${filters.cabinType ? `_${filters.cabinType.replace(/\s+/g, '_')}` : ''}.csv`;
    
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    
    logger.info('reports.exportToCSV.success', { fileName, dataCount: data.length });
  } catch (error) {
    logger.error('reports.exportToCSV.error', { error: String(error), dataCount: data.length });
    throw new Error('Error al exportar a CSV');
  } finally {
    logger.timeEnd('reports.exportToCSV');
  }
};

export const exportToPDF = (data: ReportData[], filters: ReportFilters): void => {
  logger.info('reports.exportToPDF.start', { dataCount: data.length, filters });
  logger.time('reports.exportToPDF');

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
    if (filters.includeOverlaps) {
      filterText += ' | Incluye solapamientos';
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
    
    // Table data with enhanced text wrapping
    const tableData = data.map(row => [
      row.passengerName.length > 20 ? row.passengerName.substring(0, 17) + '...' : row.passengerName,
      row.checkIn,
      row.checkOut,
      row.arrivalFlight.length > 12 ? row.arrivalFlight.substring(0, 9) + '...' : row.arrivalFlight,
      row.departureFlight.length > 12 ? row.departureFlight.substring(0, 9) + '...' : row.departureFlight,
      row.totalGuests.toString(),
      row.adults.toString(),
      row.children.toString(),
      row.babies.toString(),
      row.cabinType.length > 25 ? row.cabinType.substring(0, 22) + '...' : row.cabinType
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
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
    
    logger.info('reports.exportToPDF.success', { fileName, dataCount: data.length });
  } catch (error) {
    logger.error('reports.exportToPDF.error', { error: String(error), dataCount: data.length });
    throw new Error('Error al exportar a PDF');
  } finally {
    logger.timeEnd('reports.exportToPDF');
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
  logger.info('reports.generateReportDataByCabinTypes.start', { filters, cabinTypes });
  logger.time('reports.generateReportDataByCabinTypes');

  try {
    const reservations = await getAllReservations();
    logger.debug('reports.generateReportDataByCabinTypes.loaded', { totalReservations: reservations.length });

    const reportData: ReportData[] = reservations
      .filter((reservation) => {
        try {
          if (!reservation.checkIn || !reservation.checkOut) return false;
          
          const checkInDate = parseDate(reservation.checkIn);
          const checkOutDate = parseDate(reservation.checkOut);
          
          if (!checkInDate || !checkOutDate) return false;

          const reservationYear = checkInDate.getFullYear();
          
          // Year filtering with overlap support
          if (reservationYear !== filters.year) {
            const checkOutYear = checkOutDate.getFullYear();
            if (checkOutYear !== filters.year) return false;
          }
          
          // Enhanced month filtering
          if (filters.month) {
            const startOfMonth = new Date(filters.year, filters.month - 1, 1);
            const endOfMonth = new Date(filters.year, filters.month, 0);
            
            if (filters.includeOverlaps) {
              const hasOverlap = isWithinInterval(checkInDate, { start: startOfMonth, end: endOfMonth }) ||
                               isWithinInterval(checkOutDate, { start: startOfMonth, end: endOfMonth }) ||
                               (checkInDate <= startOfMonth && checkOutDate >= endOfMonth);
              if (!hasOverlap) return false;
            } else {
              const checkInMonth = checkInDate.getMonth() + 1;
              if (checkInMonth !== filters.month) return false;
            }
          }
          
          if (!cabinTypes.includes(reservation.cabinType)) return false;

          return true;
        } catch (error) {
          logger.error('reports.generateReportDataByCabinTypes.filter_error', { 
            id: reservation.id, 
            error: String(error) 
          });
          return false;
        }
      })
      .map((reservation) => {
        try {
          const checkInDate = parseDate(reservation.checkIn);
          const checkOutDate = parseDate(reservation.checkOut);
          
          return {
            passengerName: reservation.passengerName || 'Sin nombre',
            checkIn: format(checkInDate, 'dd/MM/yyyy', { locale: es }),
            checkOut: format(checkOutDate, 'dd/MM/yyyy', { locale: es }),
            arrivalFlight: reservation.arrivalFlight || 'N/A',
            departureFlight: reservation.departureFlight || 'N/A',
            totalGuests: (reservation.adults || 0) + (reservation.children || 0) + (reservation.babies || 0),
            adults: reservation.adults || 0,
            children: reservation.children || 0,
            babies: reservation.babies || 0,
            cabinType: reservation.cabinType || 'Sin especificar',
            month: format(checkInDate, 'MMMM', { locale: es }),
            year: checkInDate.getFullYear().toString(),
          };
        } catch (error) {
          logger.error('reports.generateReportDataByCabinTypes.mapping_error', { 
            id: reservation.id, 
            error: String(error) 
          });
          return {
            passengerName: 'Error en datos',
            checkIn: 'N/A',
            checkOut: 'N/A',
            arrivalFlight: 'N/A',
            departureFlight: 'N/A',
            totalGuests: 0,
            adults: 0,
            children: 0,
            babies: 0,
            cabinType: 'N/A',
            month: 'N/A',
            year: 'N/A',
          };
        }
      })
      .sort((a, b) => {
        try {
          const dateA = a.checkIn.split('/').reverse().join('-');
          const dateB = b.checkIn.split('/').reverse().join('-');
          return dateA.localeCompare(dateB);
        } catch (error) {
          return 0;
        }
      });

    logger.info('reports.generateReportDataByCabinTypes.success', { 
      filteredCount: reportData.length,
      totalCount: reservations.length 
    });

    return reportData;
  } catch (error) {
    logger.error('reports.generateReportDataByCabinTypes.error', { 
      error: String(error), 
      filters, 
      cabinTypes 
    });
    throw new Error('Error al generar los datos del reporte por grupo');
  } finally {
    logger.timeEnd('reports.generateReportDataByCabinTypes');
  }
};

export const generateGroupReportData = async (filters: ReportFilters, group: CabinGroup): Promise<ReportData[]> => {
  const cabinTypes = CABIN_GROUPS[group].types;
  const safeFilters = { ...filters, cabinType: undefined };
  return generateReportDataByCabinTypes(safeFilters, cabinTypes);
};

export const exportCabinGroupToCSV = async (filters: ReportFilters, group: CabinGroup): Promise<void> => {
  logger.info('reports.exportCabinGroupToCSV.start', { filters, group });
  logger.time('reports.exportCabinGroupToCSV');

  try {
    const data = await generateGroupReportData(filters, group);
    
    const csvData = data.map(row => ({
      'Nombre del Pasajero': sanitizeCSVValue(row.passengerName),
      'Check-in': sanitizeCSVValue(row.checkIn),
      'Check-out': sanitizeCSVValue(row.checkOut),
      'Vuelo de Llegada': sanitizeCSVValue(row.arrivalFlight),
      'Vuelo de Salida': sanitizeCSVValue(row.departureFlight),
      'Total Huéspedes': sanitizeCSVValue(row.totalGuests),
      'Adultos': sanitizeCSVValue(row.adults),
      'Niños': sanitizeCSVValue(row.children),
      'Bebés': sanitizeCSVValue(row.babies),
      'Tipo de Cabaña': sanitizeCSVValue(row.cabinType),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    const monthPart = filters.month ? `_${String(filters.month).padStart(2, '0')}` : '';
    const fileName = `reporte_uso_${filters.year}${monthPart}_${CABIN_GROUPS[group].fileSuffix}.csv`;

    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    
    logger.info('reports.exportCabinGroupToCSV.success', { fileName, dataCount: data.length, group });
  } catch (error) {
    logger.error('reports.exportCabinGroupToCSV.error', { error: String(error), filters, group });
    throw new Error('Error al exportar a CSV (grupo)');
  } finally {
    logger.timeEnd('reports.exportCabinGroupToCSV');
  }
};

export const exportCabinGroupToPDF = async (filters: ReportFilters, group: CabinGroup): Promise<void> => {
  logger.info('reports.exportCabinGroupToPDF.start', { filters, group });
  logger.time('reports.exportCabinGroupToPDF');

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
    if (filters.includeOverlaps) {
      filterText += ' | Incluye solapamientos';
    }
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
      row.passengerName.length > 20 ? row.passengerName.substring(0, 17) + '...' : row.passengerName,
      row.checkIn,
      row.checkOut,
      row.arrivalFlight.length > 12 ? row.arrivalFlight.substring(0, 9) + '...' : row.arrivalFlight,
      row.departureFlight.length > 12 ? row.departureFlight.substring(0, 9) + '...' : row.departureFlight,
      row.totalGuests.toString(),
      row.adults.toString(),
      row.children.toString(),
      row.babies.toString(),
      row.cabinType.length > 25 ? row.cabinType.substring(0, 22) + '...' : row.cabinType
    ]);

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
        overflow: 'linebreak',
        cellWidth: 'wrap',
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
    
    logger.info('reports.exportCabinGroupToPDF.success', { fileName, dataCount: data.length, group });
  } catch (error) {
    logger.error('reports.exportCabinGroupToPDF.error', { error: String(error), filters, group });
    throw new Error('Error al exportar a PDF (grupo)');
  } finally {
    logger.timeEnd('reports.exportCabinGroupToPDF');
  }
};

export const getAvailableYears = async (): Promise<number[]> => {
  logger.info('reports.getAvailableYears.start');
  logger.time('reports.getAvailableYears');

  try {
    const reservations = await getAllReservations();
    
    const years = new Set<number>();
    reservations.forEach(r => {
      try {
        if (r.checkIn) {
          const checkInDate = parseDate(r.checkIn);
          if (checkInDate) years.add(checkInDate.getFullYear());
        }
        if (r.checkOut) {
          const checkOutDate = parseDate(r.checkOut);
          if (checkOutDate) years.add(checkOutDate.getFullYear());
        }
      } catch (error) {
        logger.warn('reports.getAvailableYears.date_parse_error', { 
          id: r.id, 
          checkIn: r.checkIn, 
          checkOut: r.checkOut,
          error: String(error) 
        });
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a); // Most recent first
    
    logger.info('reports.getAvailableYears.success', { 
      yearsFound: sortedYears.length,
      years: sortedYears 
    });
    
    return sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()];
  } catch (error) {
    logger.error('reports.getAvailableYears.error', { error: String(error) });
    return [new Date().getFullYear()];
  } finally {
    logger.timeEnd('reports.getAvailableYears');
  }
};