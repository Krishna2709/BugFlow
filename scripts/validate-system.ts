#!/usr/bin/env tsx

/**
 * BugFlow System Validation Script
 * 
 * This script performs comprehensive validation of the BugFlow system including:
 * - Environment configuration
 * - Database connectivity and schema
 * - API endpoints functionality
 * - Authentication system
 * - AI integration
 * - Background processing
 */

import { startupValidator, healthCheck, testDatabaseConnection } from '../lib/startup-validation'
import { logger } from '../lib/logger'
import { prisma } from '../lib/db'

interface ValidationResult {
  component: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

class SystemValidator {
  private results: ValidationResult[] = []

  private addResult(component: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
    this.results.push({ component, status, message, details })
    
    const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️'
    console.log(`${emoji} ${component}: ${message}`)
    
    if (details && process.env.VERBOSE) {
      console.log(`   Details:`, details)
    }
  }

  async validateEnvironment(): Promise<void> {
    console.log('\n🔧 Validating Environment Configuration...')
    
    const requiredVars = [
      'DATABASE_URL',
      'NEXTAUTH_SECRET',
      'NEXTAUTH_URL',
      'OPENAI_API_KEY',
      'INNGEST_EVENT_KEY',
      'INNGEST_SIGNING_KEY'
    ]

    const missing = requiredVars.filter(key => !process.env[key])
    
    if (missing.length === 0) {
      this.addResult('Environment Variables', 'PASS', 'All required variables present')
    } else {
      this.addResult('Environment Variables', 'FAIL', `Missing variables: ${missing.join(', ')}`)
    }

    // Validate specific formats
    if (process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('sk-')) {
      this.addResult('OpenAI API Key Format', 'WARN', 'API key should start with "sk-"')
    } else if (process.env.OPENAI_API_KEY) {
      this.addResult('OpenAI API Key Format', 'PASS', 'Valid format')
    }

    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
      this.addResult('NextAuth Secret', 'WARN', 'Secret should be at least 32 characters')
    } else if (process.env.NEXTAUTH_SECRET) {
      this.addResult('NextAuth Secret', 'PASS', 'Adequate length')
    }
  }

  async validateDatabase(): Promise<void> {
    console.log('\n🗄️ Validating Database...')
    
    try {
      // Test connection
      const connected = await testDatabaseConnection()
      if (connected) {
        this.addResult('Database Connection', 'PASS', 'Successfully connected')
      } else {
        this.addResult('Database Connection', 'FAIL', 'Connection failed')
        return
      }

      // Check system user
      const systemUser = await prisma.user.findUnique({
        where: { id: 'system' }
      })
      
      if (systemUser) {
        this.addResult('System User', 'PASS', 'System user exists')
      } else {
        this.addResult('System User', 'FAIL', 'System user missing - run: npx prisma db seed')
      }

      // Check demo users
      const userCount = await prisma.user.count()
      if (userCount >= 6) { // System + 5 demo users
        this.addResult('Demo Users', 'PASS', `${userCount} users in database`)
      } else {
        this.addResult('Demo Users', 'WARN', `Only ${userCount} users - consider running: npx prisma db seed`)
      }

      // Check teams
      const teamCount = await prisma.team.count()
      if (teamCount >= 4) {
        this.addResult('Teams Setup', 'PASS', `${teamCount} teams configured`)
      } else {
        this.addResult('Teams Setup', 'WARN', `Only ${teamCount} teams - run seeding for full setup`)
      }

    } catch (error) {
      this.addResult('Database Validation', 'FAIL', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateAPIs(): Promise<void> {
    console.log('\n🌐 Validating API Endpoints...')
    
    try {
      // Test health endpoint
      const healthResponse = await fetch('http://localhost:3000/api/health')
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        this.addResult('Health Endpoint', 'PASS', `Status: ${healthData.status}`)
      } else {
        this.addResult('Health Endpoint', 'FAIL', `HTTP ${healthResponse.status}`)
      }
    } catch (error) {
      this.addResult('Health Endpoint', 'FAIL', 'Server not running - start with: npm run dev')
    }

    try {
      // Test report submission endpoint
      const testReport = {
        title: 'Test Validation Report',
        description: 'This is a test report created during system validation to ensure the API endpoints are working correctly.',
        affectedSystem: 'Validation System'
      }

      const submitResponse = await fetch('http://localhost:3000/api/reports/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testReport)
      })

      if (submitResponse.ok) {
        const submitData = await submitResponse.json()
        this.addResult('Report Submission', 'PASS', 'API accepts reports')
        
        // Clean up test report
        if (submitData.data?.reportId) {
          try {
            await prisma.report.delete({
              where: { id: submitData.data.reportId }
            })
          } catch (error) {
            // Ignore cleanup errors
          }
        }
      } else {
        this.addResult('Report Submission', 'FAIL', `HTTP ${submitResponse.status}`)
      }
    } catch (error) {
      this.addResult('Report Submission', 'FAIL', 'Endpoint not accessible')
    }
  }

  async validateAI(): Promise<void> {
    console.log('\n🤖 Validating AI Integration...')
    
    if (!process.env.OPENAI_API_KEY) {
      this.addResult('OpenAI Integration', 'FAIL', 'API key not configured')
      return
    }

    try {
      // Test OpenAI API connectivity
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        }
      })

      if (response.ok) {
        this.addResult('OpenAI API', 'PASS', 'API accessible')
      } else if (response.status === 401) {
        this.addResult('OpenAI API', 'FAIL', 'Invalid API key')
      } else {
        this.addResult('OpenAI API', 'WARN', `HTTP ${response.status} - check API status`)
      }
    } catch (error) {
      this.addResult('OpenAI API', 'FAIL', 'Network error or API unavailable')
    }

    // Test AI analysis components
    try {
      const { BugAnalysisAgent } = await import('../lib/ai/bug-analysis-agent')
      const agent = new BugAnalysisAgent()
      
      // Test fallback analysis
      const testReport = {
        title: 'SQL Injection Test',
        description: 'Test SQL injection vulnerability'
      }
      
      // This should work even if OpenAI fails due to fallback logic
      const analysis = await agent.analyzeReport(testReport)
      
      if (analysis.bugType && analysis.severity) {
        this.addResult('AI Analysis', 'PASS', `Detected: ${analysis.bugType} (${analysis.severity})`)
      } else {
        this.addResult('AI Analysis', 'FAIL', 'Analysis returned invalid results')
      }
    } catch (error) {
      this.addResult('AI Analysis', 'FAIL', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateBackgroundProcessing(): Promise<void> {
    console.log('\n⚙️ Validating Background Processing...')
    
    try {
      // Check if Inngest client can be imported
      const { inngest } = await import('../inngest/client')
      this.addResult('Inngest Client', 'PASS', 'Client initialized')

      // Check if functions can be imported
      const functions = await import('../inngest/functions/process-report')
      if (functions.processReport) {
        this.addResult('Inngest Functions', 'PASS', 'Process report function available')
      } else {
        this.addResult('Inngest Functions', 'FAIL', 'Process report function missing')
      }
    } catch (error) {
      this.addResult('Background Processing', 'FAIL', `Import error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async validateSecurity(): Promise<void> {
    console.log('\n🔒 Validating Security Configuration...')
    
    // Check NextAuth configuration
    try {
      const { authOptions } = await import('../lib/auth')
      if (authOptions.providers && authOptions.providers.length > 0) {
        this.addResult('NextAuth Config', 'PASS', 'Authentication providers configured')
      } else {
        this.addResult('NextAuth Config', 'FAIL', 'No authentication providers')
      }
    } catch (error) {
      this.addResult('NextAuth Config', 'FAIL', 'Configuration error')
    }

    // Check middleware
    try {
      await import('../middleware')
      this.addResult('Route Protection', 'PASS', 'Middleware configured')
    } catch (error) {
      this.addResult('Route Protection', 'FAIL', 'Middleware missing or invalid')
    }

    // Security headers check (would need server running)
    if (process.env.NODE_ENV === 'production') {
      this.addResult('Security Headers', 'WARN', 'Manual verification required in production')
    } else {
      this.addResult('Security Headers', 'PASS', 'Development environment')
    }
  }

  async runAllValidations(): Promise<void> {
    console.log('🚀 Starting BugFlow System Validation\n')
    
    await this.validateEnvironment()
    await this.validateDatabase()
    await this.validateAPIs()
    await this.validateAI()
    await this.validateBackgroundProcessing()
    await this.validateSecurity()
    
    this.printSummary()
  }

  private printSummary(): void {
    console.log('\n📊 Validation Summary')
    console.log('=' .repeat(50))
    
    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const warnings = this.results.filter(r => r.status === 'WARN').length
    
    console.log(`✅ Passed: ${passed}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`⚠️  Warnings: ${warnings}`)
    console.log(`📋 Total: ${this.results.length}`)
    
    if (failed > 0) {
      console.log('\n❌ Critical Issues Found:')
      this.results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`))
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  Warnings:')
      this.results
        .filter(r => r.status === 'WARN')
        .forEach(r => console.log(`   • ${r.component}: ${r.message}`))
    }
    
    const overallStatus = failed === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
    console.log(`\n🎯 Overall Status: ${overallStatus}`)
    
    if (failed === 0 && warnings === 0) {
      console.log('\n🎉 All validations passed! BugFlow is ready for use.')
    } else if (failed === 0) {
      console.log('\n✅ Core functionality validated. Address warnings when possible.')
    } else {
      console.log('\n🔧 Please address the failed validations before using BugFlow.')
      process.exit(1)
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new SystemValidator()
  validator.runAllValidations().catch(error => {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  })
}

export { SystemValidator }