import { Quote, QuoteFormData } from '@/types/quote';
import { differenceInDays } from 'date-fns';

// Precios por temporada y tipo de cabaña
const CABIN_PRICES = {
  'Alta': {
    'Cabaña Pequeña (Max 3p)': 120000,
    'Cabaña Mediana 1 (Max 4p)': 150000,
    'Cabaña Mediana 2 (Max 4p)': 150000,
    'Cabaña Grande (Max 6p)': 200000,
  },
  'Baja': {
    'Cabaña Pequeña (Max 3p)': 100000,
    'Cabaña Mediana 1 (Max 4p)': 120000,
    'Cabaña Mediana 2 (Max 4p)': 120000,
    'Cabaña Grande (Max 6p)': 160000,
  },
};

export const calculateQuotePrice = (formData: QuoteFormData): number => {
  const checkInDate = new Date(formData.checkIn);
  const checkOutDate = new Date(formData.checkOut);
  const nights = differenceInDays(checkOutDate, checkInDate);
  
  if (nights <= 0) {
    throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
  }

  const pricePerNight = CABIN_PRICES[formData.season][formData.cabinType];
  return pricePerNight * nights;
};

export const createQuote = (formData: QuoteFormData): Quote => {
  const totalPrice = calculateQuotePrice(formData);
  
  // La cotización es válida por 30 días
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + 30);

  return {
    ...formData,
    totalPrice,
    validUntil: validUntil.toISOString().split('T')[0],
    createdAt: new Date(),
    id: `quote-${Date.now()}`,
  };
};