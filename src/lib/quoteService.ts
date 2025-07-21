
import { Quote, QuoteFormData } from '@/types/quote';
import { calculateNights } from './dateUtils';

// Precios por temporada y edad
const PERSON_PRICES = {
  'Alta': {
    adult: 30000,
    child8to15: 15000,
    childUnder7: 0,
  },
  'Baja': {
    adult: 25000,
    child8to15: 15000,
    childUnder7: 0,
  },
};

export const calculateQuotePrice = (formData: QuoteFormData): { totalPrice: number; nights: number; pricePerNight: number; breakdown: any } => {
  const nights = calculateNights(formData.checkIn, formData.checkOut);
  
  if (nights <= 0) {
    throw new Error('La fecha de salida debe ser posterior a la fecha de entrada');
  }

  const prices = PERSON_PRICES[formData.season];
  
  // Calcular costo por persona por noche
  const adultCostPerNight = formData.adults * prices.adult;
  const children8to15CostPerNight = formData.children8to15 * prices.child8to15;
  const childrenUnder7CostPerNight = formData.childrenUnder7 * prices.childUnder7;
  
  const totalCostPerNight = adultCostPerNight + children8to15CostPerNight + childrenUnder7CostPerNight;
  const totalPrice = totalCostPerNight * nights;

  const breakdown = {
    adults: { count: formData.adults, pricePerNight: prices.adult, totalPerNight: adultCostPerNight },
    children8to15: { count: formData.children8to15, pricePerNight: prices.child8to15, totalPerNight: children8to15CostPerNight },
    childrenUnder7: { count: formData.childrenUnder7, pricePerNight: prices.childUnder7, totalPerNight: childrenUnder7CostPerNight }
  };

  console.log('Quote calculation:', {
    checkIn: formData.checkIn,
    checkOut: formData.checkOut,
    nights,
    pricePerNight: totalCostPerNight,
    totalPrice,
    season: formData.season,
    breakdown
  });

  return { totalPrice, nights, pricePerNight: totalCostPerNight, breakdown };
};

export const createQuote = (formData: QuoteFormData): Quote => {
  const { totalPrice } = calculateQuotePrice(formData);
  
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
