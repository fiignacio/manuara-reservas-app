import React from 'react';
import type { AvailabilityLegendProps } from './types';
import { cn } from '@/lib/utils';

export const AvailabilityLegend: React.FC<AvailabilityLegendProps> = ({ className }) => {
  const legendItems = [
    { 
      color: 'bg-emerald-100 border-emerald-300', 
      label: 'Todas disponibles',
      description: '4/4 cabañas'
    },
    { 
      color: 'bg-amber-100 border-amber-300', 
      label: 'Parcialmente disponible',
      description: '1-3 cabañas'
    },
    { 
      color: 'bg-rose-100 border-rose-300', 
      label: 'Sin disponibilidad',
      description: '0 cabañas'
    },
    { 
      color: 'bg-muted border-muted-foreground/20', 
      label: 'No disponible',
      description: 'Fecha pasada'
    }
  ];

  return (
    <div className={cn('flex flex-wrap gap-4 p-3 bg-muted/50 rounded-lg', className)}>
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className={cn(
              'w-5 h-5 rounded border',
              item.color
            )} 
          />
          <div className="text-sm">
            <span className="font-medium text-foreground">{item.label}</span>
            <span className="text-muted-foreground ml-1">({item.description})</span>
          </div>
        </div>
      ))}
    </div>
  );
};
