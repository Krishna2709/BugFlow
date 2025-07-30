import { logger, withTiming, withDatabaseLogging, withApiLogging } from '@/lib/logger'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleError = console.error

describe('Logger', () => {
  let consoleLogs: string[] = []
  let consoleErrors: string[] = []

  beforeEach(() => {
    consoleLogs = []
    consoleErrors = []
    
    console.log = jest.fn((message: string, data?: any) => {
      consoleLogs.push(message)
    })
    
    console.error = jest.fn((message: string, data?: any) => {
      consoleErrors.push(message)
    })
  })

  afterEach(() => {
    console.log = originalConsoleLog
    console.error = originalConsoleError
  })

  describe('Basic Logging', () => {
    test('should log info messages', () => {
      logger.info('Test info message', { test: 'data' }, 'TEST_CONTEXT')
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('[INFO]')
      expect(consoleLogs[0]).toContain('Test info message')
      expect(consoleLogs[0]).toContain('[TEST_CONTEXT]')
    })

    test('should log error messages', () => {
      const testError = new Error('Test error')
      logger.error('Test error message', testError, 'ERROR_CONTEXT')
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('[ERROR]')
      expect(consoleLogs[0]).toContain('Test error message')
      expect(consoleLogs[0]).toContain('[ERROR_CONTEXT]')
    })

    test('should log warnings', () => {
      logger.warn('Test warning', { warning: 'data' }, 'WARN_CONTEXT')
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('[WARN]')
      expect(consoleLogs[0]).toContain('Test warning')
    })

    test('should only log debug in development', () => {
      const originalEnv = process.env.NODE_ENV
      
      // Test development
      process.env.NODE_ENV = 'development'
      logger.debug('Debug message')
      expect(console.log).toHaveBeenCalled()
      
      // Reset and test production
      jest.clearAllMocks()
      consoleLogs = []
      process.env.NODE_ENV = 'production'
      logger.debug('Debug message')
      expect(console.log).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Specialized Logging Methods', () => {
    test('should log report submission', () => {
      logger.reportSubmission('test-report-id', { title: 'Test Report' })
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('Bug report submitted')
      expect(consoleLogs[0]).toContain('[REPORT_SUBMISSION]')
    })

    test('should log AI analysis', () => {
      const result = {
        bugType: 'XSS',
        severity: 'HIGH',
        confidence: 0.9
      }
      
      logger.aiAnalysis('test-report-id', result, 1500)
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('AI analysis completed')
      expect(consoleLogs[0]).toContain('[AI_ANALYSIS]')
    })

    test('should log engineer assignment', () => {
      logger.engineerAssignment('report-id', 'engineer-id', 'Assigned based on bug type')
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('Engineer assigned to report')
      expect(consoleLogs[0]).toContain('[ENGINEER_ASSIGNMENT]')
    })

    test('should log security events', () => {
      logger.securityEvent('Failed login attempt', 'high', { ip: '192.168.1.1' })
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('Security event: Failed login attempt')
      expect(consoleLogs[0]).toContain('[SECURITY]')
    })
  })

  describe('Performance Monitoring', () => {
    test('should log slow operations as warnings', () => {
      logger.performance('slow-operation', 2000)
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('[WARN]')
      expect(consoleLogs[0]).toContain('Slow operation detected')
    })

    test('should log fast operations as debug', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      logger.performance('fast-operation', 500)
      
      expect(console.log).toHaveBeenCalled()
      expect(consoleLogs[0]).toContain('Operation completed')
      
      process.env.NODE_ENV = originalEnv
    })
  })
})

describe('Timing Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('withTiming should measure execution time', async () => {
    const mockFn = jest.fn().mockResolvedValue('result')
    
    const result = await withTiming('test-operation', mockFn, 'TEST_CONTEXT')
    
    expect(result).toBe('result')
    expect(mockFn).toHaveBeenCalled()
  })

  test('withTiming should handle errors and still log timing', async () => {
    const mockFn = jest.fn().mockRejectedValue(new Error('Test error'))
    
    await expect(withTiming('test-operation', mockFn)).rejects.toThrow('Test error')
    expect(mockFn).toHaveBeenCalled()
  })

  test('withDatabaseLogging should wrap database operations', async () => {
    const mockFn = jest.fn().mockResolvedValue({ id: 'test' })
    
    const result = await withDatabaseLogging('create', 'user', mockFn)
    
    expect(result).toEqual({ id: 'test' })
    expect(mockFn).toHaveBeenCalled()
  })

  test('withApiLogging should wrap API operations', async () => {
    const mockFn = jest.fn().mockResolvedValue({ success: true })
    
    const result = await withApiLogging('POST', '/api/test', mockFn, 'user-123')
    
    expect(result).toEqual({ success: true })
    expect(mockFn).toHaveBeenCalled()
  })
})