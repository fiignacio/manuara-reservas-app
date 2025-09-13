import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { logger } from '@/lib/logger'
import './lib/setupDefaultUsers'

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

// Log application startup
logger.info('app.startup', {
  url: window.location.href,
  userAgent: navigator.userAgent,
  timestamp: new Date().toISOString()
});

createRoot(document.getElementById("root")!).render(<App />);
