import { useState, useCallback } from 'react';

interface DateSelectionState {
  isSelecting: boolean;
  startDate: string | null;
  endDate: string | null;
  dragStartDate: string | null;
}

export const useDateSelection = () => {
  const [selectionState, setSelectionState] = useState<DateSelectionState>({
    isSelecting: false,
    startDate: null,
    endDate: null,
    dragStartDate: null
  });

  const startSelection = useCallback((date: string) => {
    setSelectionState({
      isSelecting: true,
      startDate: date,
      endDate: null,
      dragStartDate: date
    });
  }, []);

  const updateSelection = useCallback((date: string) => {
    setSelectionState(prev => {
      if (!prev.isSelecting || !prev.dragStartDate) return prev;
      
      const startDate = date < prev.dragStartDate ? date : prev.dragStartDate;
      const endDate = date > prev.dragStartDate ? date : prev.dragStartDate;
      
      return {
        ...prev,
        startDate,
        endDate
      };
    });
  }, []);

  const endSelection = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      isSelecting: false,
      dragStartDate: null
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectionState({
      isSelecting: false,
      startDate: null,
      endDate: null,
      dragStartDate: null
    });
  }, []);

  const isDateInRange = useCallback((date: string): boolean => {
    if (!selectionState.startDate || !selectionState.endDate) return false;
    return date >= selectionState.startDate && date <= selectionState.endDate;
  }, [selectionState.startDate, selectionState.endDate]);

  const isDateRangeStart = useCallback((date: string): boolean => {
    return date === selectionState.startDate;
  }, [selectionState.startDate]);

  const isDateRangeEnd = useCallback((date: string): boolean => {
    return date === selectionState.endDate;
  }, [selectionState.endDate]);

  return {
    selectionState,
    startSelection,
    updateSelection,
    endSelection,
    clearSelection,
    isDateInRange,
    isDateRangeStart,
    isDateRangeEnd
  };
};