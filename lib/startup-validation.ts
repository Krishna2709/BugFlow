import { prisma } from '@/lib/db'
import { validateEnv } from '@/lib/validations'
import { logger } from '@/lib/logger'

interface ValidationResult {
  success: boolean
  component: string
  error?: string
  details?: any
}

export class StartupValidator {
  private results: ValidationResult[] = []

  async validateAll(): Promise<{ success: boolean; results: ValidationResult[] }> {
    logger.info('Starting application validation', {}, 'STARTUP')
    
    // Run all validations
    await this.validateEnvironment()
    await this.validateDatabase()
    await this.validateSystemUser()
    await this.validateOpenAI()
    
    const allSuccess = this.results.every(result => result.success)
    
    if (allSuccess) {
      logger.startup('Application validation', 'success', { 
        validatedComponents: this.results.length 
      })
    } else {
      const failures = this.results.filter(r => !r.success)
      logger.startup('Application validation', 'error', { 
        failures: failures.map(f => f.component) 
      })
    }
    
    return {
      success: allSuccess,
      results: this.results
    }
  }

  private async validateEnvironment(): Promise<void> {
    try {
      validateEnv()
      this.addResult(true, 'Environment Variables')
      logger.info('Environment validation passed', {}, 'STARTUP')
    } catch (error) {
      this.addResult(false, 'Environment Variables', error)
      logger.error('Environment validation failed', error, 'STARTUP')
    }
  }

  private async validateDatabase(): Promise<void> {
    try {
      // Test database connection
      await prisma.$connect()
      
      // Test a simple query
      const userCount = await prisma.user.count()
      
      this.addResult(true, 'Database Connection', { userCount })
      logger.info('Database validation passed', { userCount }, 'STARTUP')
    } catch (error) {
      this.addResult(false, 'Database Connection', error)
      logger.error('Database validation failed', error, 'STARTUP')
    }
  }

  private async validateSystemUser(): Promise<void> {
    try {
      const systemUser = await prisma.user.findUnique({
        where: { id: 'system' }
      })
      
      if (systemUser) {
        this.addResult(true, 'System User', { exists: true })
        logger.info('System user validation passed', {}, 'STARTUP')
      } else {
        this.addResult(false, 'System User', 'System user not found - run database seeding')
        logger.warn('System user not found', {}, 'STARTUP')
      }
    } catch (error) {
      this.addResult(false, 'System User', error)
      logger.error('System user validation failed', error, 'STARTUP')
    }
  }

  private async validateOpenAI(): Promise<void> {
    try {
      const apiKey = process.env.OPENAI_API_KEY
      
      if (!apiKey) {
        this.addResult(false, 'OpenAI API', 'API key not configured')
        return
      }

      if (!apiKey.startsWith('sk-')) {
        this.addResult(false, 'OpenAI API', 'Invalid API key format')
        return
      }

      // Test API connectivity with a simple request
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (response.ok) {
        this.addResult(true, 'OpenAI API', { status: response.status })
        logger.info('OpenAI API validation passed', {}, 'STARTUP')
      } else {
        this.addResult(false, 'OpenAI API', `API request failed: ${response.status}`)
        logger.error('OpenAI API validation failed', { status: response.status }, 'STARTUP')
      }
    } catch (error) {
      this.addResult(false, 'OpenAI API', error)
      logger.error('OpenAI API validation failed', error, 'STARTUP')
    }
  }

  private addResult(success: boolean, component: string, errorOrDetails?: any): void {
    const result: ValidationResult = {
      success,
      component,
    }

    if (success && errorOrDetails) {
      result.details = errorOrDetails
    } else if (!success) {
      result.error = errorOrDetails instanceof Error 
        ? errorOrDetails.message 
        : String(errorOrDetails)
    }

    this.results.push(result)
  }

  // Method to check specific components during runtime
  async validateComponent(component: string): Promise<ValidationResult> {
    switch (component) {
      case 'database':
        await this.validateDatabase()
        return this.results[this.results.length - 1]
      
      case 'openai':
        await this.validateOpenAI()
        return this.results[this.results.length - 1]
      
      case 'system-user':
        await this.validateSystemUser()
        return this.results[this.results.length - 1]
      
      default:
        return {
          success: false,
          component,
          error: 'Unknown component'
        }
    }
  }
}

// Singleton instance
export const startupValidator = new StartupValidator()

// Health check function for API routes
export async function healthCheck(): Promise<{
  status: 'healthy' | 'unhealthy'
  timestamp: string
  checks: ValidationResult[]
}> {
  const validator = new StartupValidator()
  const { success, results } = await validator.validateAll()
  
  return {
    status: success ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    checks: results
  }
}

// Database connectivity test
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect()
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connection test passed', {}, 'DATABASE')
    return true
  } catch (error) {
    logger.error('Database connection test failed', error, 'DATABASE')
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Environment validation helper
export function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'OPENAI_API_KEY',
    'INNGEST_EVENT_KEY',
    'INNGEST_SIGNING_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  return {
    valid: missing.length === 0,
    missing
  }
}

// System readiness check
export async function isSystemReady(): Promise<boolean> {
  try {
    const { success } = await startupValidator.validateAll()
    return success
  } catch (error) {
    logger.error('System readiness check failed', error, 'STARTUP')
    return false
  }
}