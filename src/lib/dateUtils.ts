
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
