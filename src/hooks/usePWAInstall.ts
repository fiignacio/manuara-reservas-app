import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  isSafari: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
}

interface UsePWAInstallReturn extends PWAInstallState {
  promptInstall: () => Promise<boolean>;
  dismissPrompt: () => void;
  shouldShowPrompt: boolean;
}

const DISMISSED_KEY = 'pwa-install-dismissed';
const DISMISSED_EXPIRY_DAYS = 7;

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect platform
  const detectPlatform = useCallback((): PWAInstallState => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isDesktop = !isIOS && !isAndroid;
    
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true;

    let platform: 'ios' | 'android' | 'desktop' | 'unknown' = 'unknown';
    if (isIOS) platform = 'ios';
    else if (isAndroid) platform = 'android';
    else if (isDesktop) platform = 'desktop';

    return {
      isInstallable: false,
      isInstalled: isStandalone,
      isIOS,
      isAndroid,
      isDesktop,
      isSafari,
      platform
    };
  }, []);

  const [platformState, setPlatformState] = useState<PWAInstallState>(detectPlatform);

  // Check if user previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysDiff = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff < DISMISSED_EXPIRY_DAYS) {
        setIsDismissed(true);
      } else {
        localStorage.removeItem(DISMISSED_KEY);
      }
    }
  }, []);

  // Listen for beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatformState(prev => ({ ...prev, isInstallable: true }));
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for app installed
    const installedHandler = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setPlatformState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
    };

    window.addEventListener('appinstalled', installedHandler);

    // Check display mode
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const displayModeHandler = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
      setPlatformState(prev => ({ ...prev, isInstalled: e.matches }));
    };
    
    mediaQuery.addEventListener('change', displayModeHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      mediaQuery.removeEventListener('change', displayModeHandler);
    };
  }, []);

  // Prompt install
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setPlatformState(prev => ({ ...prev, isInstalled: true }));
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
  }, []);

  // Calculate if should show prompt
  const shouldShowPrompt = !isInstalled && 
                           !isDismissed && 
                           (platformState.isInstallable || platformState.isIOS);

  return {
    ...platformState,
    isInstalled,
    promptInstall,
    dismissPrompt,
    shouldShowPrompt
  };
}
