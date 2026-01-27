import { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
}

export function OfflineIndicator({ className }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [isVisible, setIsVisible] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      
      // Show "reconnected" message for 3 seconds
      setTimeout(() => {
        setShowReconnected(false);
        setTimeout(() => setIsVisible(false), 300);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
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
