import { NextResponse } from 'next/server'
import { healthCheck } from '@/lib/startup-validation'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('Health check requested', {}, 'HEALTH_CHECK')
    
    const healthStatus = await healthCheck()
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503
    
    logger.info('Health check completed', { 
      status: healthStatus.status,
      checksCount: healthStatus.checks.length 
    }, 'HEALTH_CHECK')
    
    return NextResponse.json(healthStatus, { status: statusCode })
  } catch (error) {
    logger.error('Health check failed', error, 'HEALTH_CHECK')
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        checks: []
      },
      { status: 503 }
    )
  }
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}