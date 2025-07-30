import { GET } from '@/app/api/health/route'
import { NextRequest } from 'next/server'

// Mock the startup validation
jest.mock('@/lib/startup-validation', () => ({
  healthCheck: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

const mockHealthCheck = require('@/lib/startup-validation').healthCheck

describe('/api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return 200 when system is healthy', async () => {
    const mockHealthStatus = {
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00.000Z',
      checks: [
        { success: true, component: 'Database Connection' },
        { success: true, component: 'OpenAI API' },
      ],
    }

    mockHealthCheck.mockResolvedValue(mockHealthStatus)

    const request = new NextRequest('http://localhost:3000/api/health')
    const response = await GET()

    expect(response.status).toBe(200)
    
    const data = await response.json()
    expect(data).toEqual(mockHealthStatus)
    expect(data.status).toBe('healthy')
  })

  test('should return 503 when system is unhealthy', async () => {
    const mockHealthStatus = {
      status: 'unhealthy',
      timestamp: '2024-01-01T00:00:00.000Z',
      checks: [
        { success: false, component: 'Database Connection', error: 'Connection failed' },
        { success: true, component: 'OpenAI API' },
      ],
    }

    mockHealthCheck.mockResolvedValue(mockHealthStatus)

    const response = await GET()

    expect(response.status).toBe(503)
    
    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.checks).toHaveLength(2)
  })

  test('should return 503 when health check throws error', async () => {
    mockHealthCheck.mockRejectedValue(new Error('Health check failed'))

    const response = await GET()

    expect(response.status).toBe(503)
    
    const data = await response.json()
    expect(data.status).toBe('unhealthy')
    expect(data.error).toBe('Health check failed')
    expect(data.checks).toEqual([])
  })

  test('should include timestamp in response', async () => {
    const mockHealthStatus = {
      status: 'healthy',
      timestamp: '2024-01-01T00:00:00.000Z',
      checks: [],
    }

    mockHealthCheck.mockResolvedValue(mockHealthStatus)

    const response = await GET()
    const data = await response.json()

    expect(data.timestamp).toBeDefined()
    expect(typeof data.timestamp).toBe('string')
  })
})