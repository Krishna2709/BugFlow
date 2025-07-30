import { POST } from '@/app/api/reports/submit/route'
import { NextRequest } from 'next/server'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    report: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/inngest/client', () => ({
  inngest: {
    send: jest.fn(),
  },
}))

jest.mock('@/lib/validations', () => ({
  BugReportSchema: {
    safeParse: jest.fn(),
  },
  createApiResponse: jest.fn((success, data, message, error) => ({
    success,
    data,
    message,
    error,
  })),
}))

const mockPrisma = require('@/lib/db').prisma
const mockInngest = require('@/inngest/client').inngest
const mockBugReportSchema = require('@/lib/validations').BugReportSchema

describe('/api/reports/submit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should successfully submit a valid bug report', async () => {
    const validReportData = {
      title: 'XSS Vulnerability in User Profile',
      description: 'The user profile page allows script injection through the bio field. This could lead to session hijacking and unauthorized actions.',
      affectedSystem: 'User Profile Page',
      severity: 'HIGH',
      reporterName: 'Security Researcher',
      reporterEmail: 'researcher@example.com',
    }

    const createdReport = {
      id: 'report-123',
      ...validReportData,
      status: 'NEW',
      createdAt: new Date(),
    }

    // Mock successful validation
    mockBugReportSchema.safeParse.mockReturnValue({
      success: true,
      data: validReportData,
    })

    // Mock successful database creation
    mockPrisma.report.create.mockResolvedValue(createdReport)

    // Mock successful Inngest event
    mockInngest.send.mockResolvedValue({ id: 'event-123' })

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(validReportData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.reportId).toBe('report-123')
    expect(data.message).toBe('Report submitted successfully')

    // Verify database call
    expect(mockPrisma.report.create).toHaveBeenCalledWith({
      data: {
        reporterName: validReportData.reporterName,
        reporterEmail: validReportData.reporterEmail,
        title: validReportData.title,
        description: validReportData.description,
        affectedSystem: validReportData.affectedSystem,
        severity: validReportData.severity,
        fileUrls: [],
        status: 'NEW',
      },
    })

    // Verify Inngest event
    expect(mockInngest.send).toHaveBeenCalledWith({
      name: 'report.submitted',
      data: { reportId: 'report-123' },
    })
  })

  test('should handle validation errors', async () => {
    const invalidReportData = {
      title: 'Short', // Too short
      description: 'Too short description', // Too short
      affectedSystem: '',
    }

    // Mock validation failure
    mockBugReportSchema.safeParse.mockReturnValue({
      success: false,
      error: {
        errors: [
          { path: ['title'], message: 'Title must be at least 10 characters' },
          { path: ['description'], message: 'Description must be at least 50 characters' },
        ],
      },
    })

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(invalidReportData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid input data')

    // Verify database was not called
    expect(mockPrisma.report.create).not.toHaveBeenCalled()
  })

  test('should handle database errors', async () => {
    const validReportData = {
      title: 'Valid Bug Report Title',
      description: 'This is a valid description that meets the minimum length requirement for bug reports.',
      affectedSystem: 'Test System',
    }

    // Mock successful validation
    mockBugReportSchema.safeParse.mockReturnValue({
      success: true,
      data: validReportData,
    })

    // Mock database error
    mockPrisma.report.create.mockRejectedValue(new Error('Database connection failed'))

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(validReportData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to submit report')
  })

  test('should continue even if Inngest fails', async () => {
    const validReportData = {
      title: 'Valid Bug Report Title',
      description: 'This is a valid description that meets the minimum length requirement for bug reports.',
      affectedSystem: 'Test System',
    }

    const createdReport = {
      id: 'report-456',
      ...validReportData,
      status: 'NEW',
    }

    // Mock successful validation and database
    mockBugReportSchema.safeParse.mockReturnValue({
      success: true,
      data: validReportData,
    })
    mockPrisma.report.create.mockResolvedValue(createdReport)

    // Mock Inngest failure
    mockInngest.send.mockRejectedValue(new Error('Inngest service unavailable'))

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(validReportData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    // Should still succeed even if background processing fails
    expect(response.status).toBe(201)
    
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.reportId).toBe('report-456')
  })

  test('should handle malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to submit report')
  })

  test('should handle optional fields correctly', async () => {
    const minimalReportData = {
      title: 'Minimal Bug Report Title',
      description: 'This is a minimal description that meets the minimum length requirement for bug reports in the system.',
      affectedSystem: 'Test System',
    }

    const createdReport = {
      id: 'report-789',
      ...minimalReportData,
      reporterName: null,
      reporterEmail: null,
      severity: null,
      status: 'NEW',
    }

    // Mock successful validation
    mockBugReportSchema.safeParse.mockReturnValue({
      success: true,
      data: minimalReportData,
    })

    mockPrisma.report.create.mockResolvedValue(createdReport)
    mockInngest.send.mockResolvedValue({ id: 'event-789' })

    const request = new NextRequest('http://localhost:3000/api/reports/submit', {
      method: 'POST',
      body: JSON.stringify(minimalReportData),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await POST(request)

    expect(response.status).toBe(201)

    // Verify database call with null values for optional fields
    expect(mockPrisma.report.create).toHaveBeenCalledWith({
      data: {
        reporterName: null,
        reporterEmail: null,
        title: minimalReportData.title,
        description: minimalReportData.description,
        affectedSystem: minimalReportData.affectedSystem,
        severity: null,
        fileUrls: [],
        status: 'NEW',
      },
    })
  })
})