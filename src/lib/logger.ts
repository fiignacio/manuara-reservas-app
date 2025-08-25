// Comprehensive logging system for all application events
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type EventPayload = Record<string, any>;

const DEFAULT_LEVEL: LogLevel = import.meta.env.MODE === 'development' ? 'debug' : 'info';
const MAX_BUFFER = 2000;

// Data sanitization for privacy - mask sensitive information
const redact = (value: any): any => {
  if (typeof value !== 'string') return value;
  
  // Mask emails: user@domain.com -> u***@domain.com
  const maskedEmail = value.replace(/([A-Z0-9._%+-])[A-Z0-9._%+-]*(@[^@\s]+)/gi, '$1***$2');
  
  // Mask phone numbers: +56912345678 -> +569****5678
  const maskedPhone = maskedEmail.replace(/\b(\+?\d{2,3})\d{3,8}(\d{2,3})\b/g, '$1****$2');
  
  // Mask Chilean RUT: 12.345.678-9 -> 12****-9
  const maskedRUT = maskedPhone.replace(/\b(\d{1,2})\d{3,6}-?([0-9kK])\b/g, '$1****-$2');
  
  return maskedRUT;
};

const sanitize = (obj: any): any => {
  if (obj == null) return obj;
  if (typeof obj === 'string') return redact(obj);
  if (Array.isArray(obj)) return obj.map(sanitize);
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Always sanitize these sensitive fields
      if (['email', 'phone', 'rut', 'customerEmail', 'customerPhone', 'passengerName'].includes(key)) {
        sanitized[key] = redact(String(value ?? ''));
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }
  return obj;
};

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  event: string;
  data?: any;
  duration?: number;
};

const logBuffer: LogEntry[] = [];
let currentLevel: LogLevel = DEFAULT_LEVEL;
const levelOrder: LogLevel[] = ['debug', 'info', 'warn', 'error'];

const addToBuffer = (entry: LogEntry) => {
  logBuffer.push(entry);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }

  // Console output with appropriate styling
  const prefix = `[${entry.level.toUpperCase()}] ${entry.event}`;
  const output = entry.data ? [prefix, entry.data] : [prefix];
  
  switch (entry.level) {
    case 'error':
      console.error(...output);
      break;
    case 'warn':
      console.warn(...output);
      break;
    case 'info':
      console.info(...output);
      break;
    case 'debug':
      console.debug(...output);
      break;
  }
};

const shouldLog = (level: LogLevel): boolean => {
  return levelOrder.indexOf(level) >= levelOrder.indexOf(currentLevel);
};

// Performance tracking for operations
const activeTimers = new Map<string, number>();

export const logger = {
  // Configuration
  setLevel(level: LogLevel) {
    currentLevel = level;
    this.info('logger.level.changed', { level });
  },
  
  getLevel(): LogLevel {
    return currentLevel;
  },

  // Buffer management
  getBuffer(): LogEntry[] {
    return [...logBuffer];
  },

  clear() {
    const entriesCleared = logBuffer.length;
    logBuffer.length = 0;
    this.info('logger.buffer.cleared', { entriesCleared });
  },

  // Core logging function
  event(eventName: string, data?: EventPayload, level: LogLevel = 'info') {
    if (!shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event: eventName,
      data: data ? sanitize(data) : undefined
    };
    
    addToBuffer(entry);
  },

  // Convenience methods
  debug(eventName: string, data?: EventPayload) {
    this.event(eventName, data, 'debug');
  },

  info(eventName: string, data?: EventPayload) {
    this.event(eventName, data, 'info');
  },

  warn(eventName: string, data?: EventPayload) {
    this.event(eventName, data, 'warn');
  },

  error(eventName: string, data?: EventPayload) {
    this.event(eventName, data, 'error');
  },

  // Performance timing
  time(operationName: string, context?: EventPayload) {
    const startTime = performance.now();
    activeTimers.set(operationName, startTime);
    this.debug(`${operationName}.start`, context);
  },

  timeEnd(operationName: string, context?: EventPayload) {
    const startTime = activeTimers.get(operationName);
    if (startTime) {
      const duration = performance.now() - startTime;
      activeTimers.delete(operationName);
      
      this.info(`${operationName}.completed`, {
        ...(context || {}),
        durationMs: Math.round(duration * 100) / 100
      });
    } else {
      this.warn(`${operationName}.timer.not.found`, context);
    }
  },

  // User action tracking
  userAction(action: string, context?: EventPayload) {
    this.info(`user.${action}`, context);
  },

  // System event tracking
  systemEvent(event: string, context?: EventPayload) {
    this.info(`system.${event}`, context);
  },

  // API call tracking
  apiCall(endpoint: string, method: string, context?: EventPayload) {
    this.info(`api.${method.toLowerCase()}.${endpoint}`, context);
  },

  // Error tracking with stack traces
  exception(error: Error | unknown, context?: EventPayload) {
    const errorData = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...(context || {})
    };
    this.error('exception.caught', errorData);
  },

  // Download logs as JSON file
  download(filename?: string) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `app-logs-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;
    
    const logData = {
      metadata: {
        exported: new Date().toISOString(),
        totalEntries: logBuffer.length,
        level: currentLevel,
        environment: import.meta.env.MODE
      },
      logs: logBuffer
    };

    const blob = new Blob([JSON.stringify(logData, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.info('logger.download.completed', { filename: finalFilename, entries: logBuffer.length });
  },

  // Get summary statistics
  getStats() {
    const stats = logBuffer.reduce((acc, entry) => {
      acc[entry.level] = (acc[entry.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    return {
      total: logBuffer.length,
      byLevel: stats,
      oldestEntry: logBuffer[0]?.timestamp,
      newestEntry: logBuffer[logBuffer.length - 1]?.timestamp
    };
  }
};

// Initialize logger
logger.info('logger.initialized', { 
  level: currentLevel, 
  environment: import.meta.env.MODE,
  maxBuffer: MAX_BUFFER 
});

// Global window access for debugging
if (typeof window !== 'undefined') {
  (window as any).__APP_LOGS__ = logger;
  logger.debug('logger.global.attached', { accessor: '__APP_LOGS__' });
}

export default logger;