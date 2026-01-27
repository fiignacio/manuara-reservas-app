import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from '@/lib/logger'

// Global error handlers for comprehensive logging
window.addEventListener('error', (event) => {
  logger.error('global.error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('global.unhandledrejection', {
    reason: String(event.reason || 'unknown'),
    stack: event.reason?.stack
  });
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.info('sw.registered', { scope: registration.scope });
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                logger.info('sw.updateAvailable');
                // Optionally notify user about update
              }
            });
          }
        });
      })
      .catch((error) => {
        logger.warn('sw.registrationFailed', { error: String(error) });
      });
  });
}

// Log application startup
logger.info('app.startup', {
  url: window.location.href,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
});

createRoot(document.getElementById("root")!).render(<App />);
