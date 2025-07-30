import { StartupValidator, healthCheck, testDatabaseConnection, validateRequiredEnvVars, isSystemReady } from '@/lib/startup-validation'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn(),
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/validations', () => ({
  validateEnv: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    startup: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockPrisma = require('@/lib/db').prisma
const mockValidateEnv = require('@/lib/validations').validateEnv
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('StartupValidator', () => {
  let validator: StartupValidator

  beforeEach(() => {
    validator = new StartupValidator()
    jest.clearAllMocks()
    
    // Reset environment variables
    delete process.env.OPENAI_API_KEY
  })

  describe('validateEnvironment', () => {
    test('should pass when environment is valid', async () => {
      mockValidateEnv.mockImplementation(() => {})
      
      const result = await validator.validateAll()
      
      expect(result.success).toBe(true)
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: true,
          component: 'Environment Variables'
        })
      )
    })

    test('should fail when environment is invalid', async () => {
      mockValidateEnv.mockImplementation(() => {
        throw new Error('Missing required environment variables')
      })
      
      const result = await validator.validateAll()
      
      expect(result.success).toBe(false)
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'Environment Variables'
        })
      )
    })
  })

  describe('validateDatabase', () => {
    test('should pass when database is accessible', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.user.count.mockResolvedValue(5)
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: true,
          component: 'Database Connection',
          details: { userCount: 5 }
        })
      )
    })

    test('should fail when database is not accessible', async () => {
      mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'))
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'Database Connection'
        })
      )
    })
  })

  describe('validateSystemUser', () => {
    test('should pass when system user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'system', name: 'System' })
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: true,
          component: 'System User'
        })
      )
    })

    test('should fail when system user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'System User'
        })
      )
    })
  })

  describe('validateOpenAI', () => {
    test('should pass when OpenAI API is accessible', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123'
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      } as Response)
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: true,
          component: 'OpenAI API'
        })
      )
    })

    test('should fail when API key is missing', async () => {
      delete process.env.OPENAI_API_KEY
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'OpenAI API',
          error: 'API key not configured'
        })
      )
    })

    test('should fail when API key format is invalid', async () => {
      process.env.OPENAI_API_KEY = 'invalid-key'
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'OpenAI API',
          error: 'Invalid API key format'
        })
      )
    })

    test('should fail when API request fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-key-123'
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
      } as Response)
      
      const result = await validator.validateAll()
      
      expect(result.results).toContainEqual(
        expect.objectContaining({
          success: false,
          component: 'OpenAI API'
        })
      )
    })
  })
})

describe('Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('healthCheck', () => {
    test('should return healthy status when all checks pass', async () => {
      mockValidateEnv.mockImplementation(() => {})
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.user.count.mockResolvedValue(3)
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'system' })
      process.env.OPENAI_API_KEY = 'sk-test-key'
      mockFetch.mockResolvedValue({ ok: true, status: 200 } as Response)
      
      const result = await healthCheck()
      
      expect(result.status).toBe('healthy')
      expect(result.checks).toHaveLength(4)
      expect(result.timestamp).toBeDefined()
    })

    test('should return unhealthy status when checks fail', async () => {
      mockValidateEnv.mockImplementation(() => {
        throw new Error('Environment validation failed')
      })
      
      const result = await healthCheck()
      
      expect(result.status).toBe('unhealthy')
      expect(result.checks.some(check => !check.success)).toBe(true)
    })
  })

  describe('testDatabaseConnection', () => {
    test('should return true when database is accessible', async () => {
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }])
      mockPrisma.$disconnect.mockResolvedValue(undefined)
      
      const result = await testDatabaseConnection()
      
      expect(result).toBe(true)
      expect(mockPrisma.$connect).toHaveBeenCalled()
      expect(mockPrisma.$queryRaw).toHaveBeenCalled()
      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })

    test('should return false when database is not accessible', async () => {
      mockPrisma.$connect.mockRejectedValue(new Error('Connection failed'))
      
      const result = await testDatabaseConnection()
      
      expect(result).toBe(false)
      expect(mockPrisma.$disconnect).toHaveBeenCalled()
    })
  })

  describe('validateRequiredEnvVars', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    test('should return valid when all required vars are present', () => {
      process.env.DATABASE_URL = 'postgresql://test'
      process.env.NEXTAUTH_SECRET = 'secret'
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.INNGEST_EVENT_KEY = 'event-key'
      process.env.INNGEST_SIGNING_KEY = 'signing-key'
      
      const result = validateRequiredEnvVars()
      
      expect(result.valid).toBe(true)
      expect(result.missing).toHaveLength(0)
    })

    test('should return invalid when required vars are missing', () => {
      delete process.env.DATABASE_URL
      delete process.env.OPENAI_API_KEY
      
      const result = validateRequiredEnvVars()
      
      expect(result.valid).toBe(false)
      expect(result.missing).toContain('DATABASE_URL')
      expect(result.missing).toContain('OPENAI_API_KEY')
    })
  })

  describe('isSystemReady', () => {
    test('should return true when system is ready', async () => {
      mockValidateEnv.mockImplementation(() => {})
      mockPrisma.$connect.mockResolvedValue(undefined)
      mockPrisma.user.count.mockResolvedValue(1)
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'system' })
      process.env.OPENAI_API_KEY = 'sk-test'
      mockFetch.mockResolvedValue({ ok: true } as Response)
      
      const result = await isSystemReady()
      
      expect(result).toBe(true)
    })

    test('should return false when system is not ready', async () => {
      mockValidateEnv.mockImplementation(() => {
        throw new Error('Validation failed')
      })
      
      const result = await isSystemReady()
      
      expect(result).toBe(false)
    })
  })
})