type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  context?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatMessage(level: LogLevel, message: string, data?: any, context?: string): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      context,
    }
  }

  private log(level: LogLevel, message: string, data?: any, context?: string) {
    const logEntry = this.formatMessage(level, message, data, context)
    
    // In development, use console with colors
    if (this.isDevelopment) {
      const colors = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
      }
      const reset = '\x1b[0m'
      const contextStr = context ? `[${context}] ` : ''
      
      console.log(
        `${colors[level]}[${level.toUpperCase()}]${reset} ${contextStr}${message}`,
        data ? data : ''
      )
    } else {
      // In production, use structured JSON logging
      console.log(JSON.stringify(logEntry))
    }
  }

  debug(message: string, data?: any, context?: string) {
    if (this.isDevelopment) {
      this.log('debug', message, data, context)
    }
  }

  info(message: string, data?: any, context?: string) {
    this.log('info', message, data, context)
  }

  warn(message: string, data?: any, context?: string) {
    this.log('warn', message, data, context)
  }

  error(message: string, error?: any, context?: string) {
    const errorData = error instanceof Error 
      ? { 
          name: error.name, 
          message: error.message, 
          stack: error.stack 
        }
      : error
    
    this.log('error', message, errorData, context)
  }

  // Specialized logging methods for BugFlow
  reportSubmission(reportId: string, data: any) {
    this.info('Bug report submitted', { reportId, ...data }, 'REPORT_SUBMISSION')
  }

  aiAnalysis(reportId: string, result: any, duration?: number) {
    this.info('AI analysis completed', { 
      reportId, 
      bugType: result.bugType,
      severity: result.severity,
      confidence: result.confidence,
      duration 
    }, 'AI_ANALYSIS')
  }

  aiAnalysisError(reportId: string, error: any) {
    this.error('AI analysis failed', { reportId, error }, 'AI_ANALYSIS')
  }

  duplicateDetection(reportId: string, duplicatesFound: number, threshold: number) {
    this.info('Duplicate detection completed', { 
      reportId, 
      duplicatesFound, 
      threshold 
    }, 'DUPLICATE_DETECTION')
  }

  engineerAssignment(reportId: string, engineerId: string, reason: string) {
    this.info('Engineer assigned to report', { 
      reportId, 
      engineerId, 
      reason 
    }, 'ENGINEER_ASSIGNMENT')
  }

  engineerAssignmentError(reportId: string, error: any) {
    this.error('Engineer assignment failed', { reportId, error }, 'ENGINEER_ASSIGNMENT')
  }

  databaseOperation(operation: string, table: string, data?: any) {
    this.debug('Database operation', { operation, table, data }, 'DATABASE')
  }

  databaseError(operation: string, table: string, error: any) {
    this.error('Database operation failed', { operation, table, error }, 'DATABASE')
  }

  authEvent(event: string, userId?: string, details?: any) {
    this.info('Authentication event', { event, userId, details }, 'AUTH')
  }

  authError(event: string, error: any, details?: any) {
    this.error('Authentication error', { event, error, details }, 'AUTH')
  }

  apiRequest(method: string, path: string, userId?: string, duration?: number) {
    this.info('API request', { method, path, userId, duration }, 'API')
  }

  apiError(method: string, path: string, error: any, userId?: string) {
    this.error('API request failed', { method, path, error, userId }, 'API')
  }

  inngestEvent(eventName: string, data: any) {
    this.info('Inngest event triggered', { eventName, data }, 'INNGEST')
  }

  inngestError(eventName: string, error: any, data?: any) {
    this.error('Inngest event failed', { eventName, error, data }, 'INNGEST')
  }

  fileUpload(fileName: string, fileSize: number, userId?: string) {
    this.info('File uploaded', { fileName, fileSize, userId }, 'FILE_UPLOAD')
  }

  fileUploadError(fileName: string, error: any, userId?: string) {
    this.error('File upload failed', { fileName, error, userId }, 'FILE_UPLOAD')
  }

  // Performance monitoring
  performance(operation: string, duration: number, context?: string) {
    if (duration > 1000) { // Log slow operations (>1s)
      this.warn('Slow operation detected', { operation, duration }, context || 'PERFORMANCE')
    } else {
      this.debug('Operation completed', { operation, duration }, context || 'PERFORMANCE')
    }
  }

  // Environment and startup logging
  startup(component: string, status: 'success' | 'error', details?: any) {
    if (status === 'success') {
      this.info(`${component} initialized successfully`, details, 'STARTUP')
    } else {
      this.error(`${component} initialization failed`, details, 'STARTUP')
    }
  }

  // Security events
  securityEvent(event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any) {
    const logMethod = severity === 'critical' || severity === 'high' ? 'error' : 'warn'
    this[logMethod](`Security event: ${event}`, { severity, ...details }, 'SECURITY')
  }
}

export const logger = new Logger()

// Performance timing utility
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: string
): Promise<T> {
  const start = Date.now()
  
  return fn()
    .then(result => {
      const duration = Date.now() - start
      logger.performance(operation, duration, context)
      return result
    })
    .catch(error => {
      const duration = Date.now() - start
      logger.error(`${operation} failed after ${duration}ms`, error, context)
      throw error
    })
}

// Database operation wrapper with logging
export function withDatabaseLogging<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  logger.databaseOperation(operation, table)
  
  return fn()
    .catch(error => {
      logger.databaseError(operation, table, error)
      throw error
    })
}

// API request wrapper with logging
export function withApiLogging<T>(
  method: string,
  path: string,
  fn: () => Promise<T>,
  userId?: string
): Promise<T> {
  const start = Date.now()
  
  return fn()
    .then(result => {
      const duration = Date.now() - start
      logger.apiRequest(method, path, userId, duration)
      return result
    })
    .catch(error => {
      logger.apiError(method, path, error, userId)
      throw error
    })
}