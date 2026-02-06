import { useState } from 'react';
import { X, Download, Smartphone, Monitor, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useNavigate } from 'react-router-dom';

export function InstallPrompt() {
  const {
    shouldShowPrompt,
    isIOS,
    isInstallable,
    promptInstall,
    dismissPrompt
  } = usePWAInstall();
  
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  if (!shouldShowPrompt || !isVisible) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      navigate('/install');
    } else if (isInstallable) {
      const accepted = await promptInstall();
      if (accepted) {
        setIsVisible(false);
      }
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    dismissPrompt();
  };

  const handleLearnMore = () => {
    navigate('/install');
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-card border border-border rounded-lg shadow-lg p-4 z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        aria-label="Cerrar"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          {isIOS ? (
            <Share className="h-6 w-6 text-primary" />
          ) : (
            <Download className="h-6 w-6 text-primary" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground">
            Instalar Manuara Reservas
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {isIOS 
              ? 'Añade la app a tu pantalla de inicio para acceso rápido'
              : 'Instala la app para acceso rápido sin navegador'
            }
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleInstall}
              className="gap-1.5"
            >
              {isIOS ? (
                <>
                  <Share className="h-4 w-4" />
                  Ver instrucciones
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Instalar
                </>
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLearnMore}
            >
              Más info
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Smartphone className="h-3.5 w-3.5" />
          <span>Funciona offline</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Monitor className="h-3.5 w-3.5" />
          <span>Pantalla completa</span>
        </div>
      </div>
    </div>
  );
}
