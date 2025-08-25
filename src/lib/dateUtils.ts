
import { differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

// Unified date handling utility to ensure consistency across the app
export const parseDate = (dateStr: string): Date => {
  // Create date at noon to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

export const formatDateForDisplay = (dateStr: string): string => {
  const date = parseDate(dateStr);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateForCalendar = (dateStr: string): string => {
  return dateStr; // Keep ISO format for calendar comparisons
};

export const getDaysBetween = (startDate: string, endDate: string): number => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 for inclusive dates
};

// New function for calculating nights correctly
export const calculateNights = (checkIn: string, checkOut: string): number => {
  const checkInDate = parseDate(checkIn);
  const checkOutDate = parseDate(checkOut);
  return differenceInDays(checkOutDate, checkInDate);
};

// Function to format date ranges inclusively
export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  const startFormatted = format(start, "dd 'de' MMMM", { locale: es });
  const endFormatted = format(end, "dd 'de' MMMM", { locale: es });
  
  return `Del ${startFormatted} al ${endFormatted}`;
};

export const isSameDate = (date1: Date, date2: string): boolean => {
  const dateStr1 = date1.toISOString().split('T')[0];
  return dateStr1 === date2;
};

export const formatDateToISO = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const addDays = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
};

export const getTodayDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTomorrowDate = (): string => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getDateRange = (startDate: string, endDays: number): string[] => {
  const dates: string[] = [];
  for (let i = 0; i < endDays; i++) {
    dates.push(addDays(startDate, i));
  }
  return dates;
};
