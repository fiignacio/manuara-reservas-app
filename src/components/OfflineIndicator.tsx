import { useState, useEffect, useCallback } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [isVisible, setIsVisible] = useState(() => 
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setShowReconnected(true);
    setIsVisible(true);
    
    // Show "reconnected" message for 3 seconds
    const timer = setTimeout(() => {
      setShowReconnected(false);
      setTimeout(() => setIsVisible(false), 300);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setShowReconnected(false);
    setIsVisible(true);
  }, []);

  useEffect(() => {
    // Sync initial state
    const online = navigator.onLine;
    setIsOnline(online);
    setIsVisible(!online);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isOnline ? 'bg-green-600' : 'bg-destructive',
        className
      )}
    >
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-center gap-2 text-white text-sm font-medium">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Conexión restaurada</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 animate-pulse" />
              <span>Sin conexión a internet</span>
              <span className="text-white/80 text-xs ml-2">
                Los cambios se guardarán cuando vuelvas a conectarte
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    // Sync on mount
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
