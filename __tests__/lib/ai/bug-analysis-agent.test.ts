import { BugAnalysisAgent } from '@/lib/ai/bug-analysis-agent'

// Mock dependencies
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-model'),
}))

jest.mock('ai', () => ({
  generateObject: jest.fn(),
  generateText: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    report: {
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
  withTiming: jest.fn((name, fn) => fn()),
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockGenerateObject = require('ai').generateObject
const mockGenerateText = require('ai').generateText
const mockPrisma = require('@/lib/db').prisma
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('BugAnalysisAgent', () => {
  let agent: BugAnalysisAgent

  beforeEach(() => {
    agent = new BugAnalysisAgent()
    jest.clearAllMocks()
  })

  describe('analyzeReport', () => {
    test('should successfully analyze a bug report', async () => {
      const mockAnalysis = {
        bugType: 'XSS',
        severity: 'HIGH',
        affectedSystem: 'User Profile',
        confidence: 0.9,
        summary: 'Cross-site scripting vulnerability in user profile',
        technicalDetails: ['Script injection possible', 'No input sanitization'],
        suggestedAssignment: 'frontend',
      }

      mockGenerateObject.mockResolvedValue({
        object: mockAnalysis,
      })

      const report = {
        title: 'XSS in User Profile',
        description: 'User can inject scripts through profile bio field',
        affectedSystem: 'User Profile Page',
      }

      const result = await agent.analyzeReport(report)

      expect(result).toEqual(mockAnalysis)
      expect(mockGenerateObject).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('XSS in User Profile'),
        })
      )
    })

    test('should return fallback analysis when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('OpenAI API error'))

      const report = {
        title: 'SQL Injection in Login',
        description: 'Login form vulnerable to SQL injection attacks',
        affectedSystem: 'Authentication System',
      }

      const result = await agent.analyzeReport(report)

      expect(result.bugType).toBe('SQL Injection')
      expect(result.severity).toBe('HIGH')
      expect(result.confidence).toBe(0.3)
      expect(result.summary).toContain('Analysis failed')
      expect(result.technicalDetails).toContain('AI analysis unavailable')
    })

    test('should extract bug type from text when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API error'))

      const report = {
        title: 'CSRF vulnerability in payment form',
        description: 'Cross-site request forgery attack possible',
      }

      const result = await agent.analyzeReport(report)

      expect(result.bugType).toBe('CSRF')
    })

    test('should assess severity from keywords when AI fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('API error'))

      const report = {
        title: 'Remote code execution vulnerability',
        description: 'RCE possible through file upload',
      }

      const result = await agent.analyzeReport(report)

      expect(result.severity).toBe('CRITICAL')
    })
  })

  describe('generateEmbedding', () => {
    test('should successfully generate embedding', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => Math.random())
      
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      } as Response)

      const result = await agent.generateEmbedding('Test text for embedding')

      expect(result).toEqual(mockEmbedding)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: 'Test text for embedding',
          }),
        })
      )
    })

    test('should return null when API fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      } as Response)

      const result = await agent.generateEmbedding('Test text')

      expect(result).toBeNull()
    })

    test('should return null when fetch throws error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const result = await agent.generateEmbedding('Test text')

      expect(result).toBeNull()
    })
  })

  describe('findSimilarReports', () => {
    test('should find similar reports above threshold', async () => {
      const testEmbedding = new Array(1536).fill(0.1)
      const similarEmbedding = new Array(1536).fill(0.11) // Very similar
      const dissimilarEmbedding = new Array(1536).fill(0.9) // Very different

      const mockReports = [
        {
          id: 'report-1',
          title: 'Similar XSS Issue',
          status: 'NEW',
          embedding: JSON.stringify(similarEmbedding),
        },
        {
          id: 'report-2',
          title: 'Different SQL Issue',
          status: 'RESOLVED',
          embedding: JSON.stringify(dissimilarEmbedding),
        },
      ]

      mockPrisma.report.findMany.mockResolvedValue(mockReports)

      const result = await agent.findSimilarReports(testEmbedding, 0.8, 'current-report')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('report-1')
      expect(result[0].similarity).toBeGreaterThan(0.8)
      expect(mockPrisma.report.findMany).toHaveBeenCalledWith({
        where: {
          embedding: { not: null },
          id: { not: 'current-report' },
        },
        select: {
          id: true,
          title: true,
          status: true,
          embedding: true,
        },
      })
    })

    test('should return empty array when no embedding provided', async () => {
      const result = await agent.findSimilarReports(null, 0.8)

      expect(result).toEqual([])
      expect(mockPrisma.report.findMany).not.toHaveBeenCalled()
    })

    test('should handle database errors gracefully', async () => {
      const testEmbedding = new Array(1536).fill(0.1)
      
      mockPrisma.report.findMany.mockRejectedValue(new Error('Database error'))

      const result = await agent.findSimilarReports(testEmbedding, 0.8)

      expect(result).toEqual([])
    })

    test('should handle malformed embedding JSON', async () => {
      const testEmbedding = new Array(1536).fill(0.1)
      
      const mockReports = [
        {
          id: 'report-1',
          title: 'Report with bad embedding',
          status: 'NEW',
          embedding: 'invalid-json',
        },
      ]

      mockPrisma.report.findMany.mockResolvedValue(mockReports)

      const result = await agent.findSimilarReports(testEmbedding, 0.8)

      expect(result).toEqual([])
    })

    test('should sort results by similarity descending', async () => {
      const testEmbedding = new Array(1536).fill(0.5)
      const highSimilarEmbedding = new Array(1536).fill(0.51) // High similarity
      const mediumSimilarEmbedding = new Array(1536).fill(0.52) // Medium similarity

      const mockReports = [
        {
          id: 'report-medium',
          title: 'Medium Similar',
          status: 'NEW',
          embedding: JSON.stringify(mediumSimilarEmbedding),
        },
        {
          id: 'report-high',
          title: 'High Similar',
          status: 'NEW',
          embedding: JSON.stringify(highSimilarEmbedding),
        },
      ]

      mockPrisma.report.findMany.mockResolvedValue(mockReports)

      const result = await agent.findSimilarReports(testEmbedding, 0.8)

      expect(result).toHaveLength(2)
      expect(result[0].similarity).toBeGreaterThan(result[1].similarity)
    })
  })

  describe('classifyBugSeverity', () => {
    test('should classify severity using AI', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'CRITICAL',
      })

      const result = await agent.classifyBugSeverity(
        'Remote code execution vulnerability',
        'RCE'
      )

      expect(result).toBe('CRITICAL')
      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining('Remote code execution vulnerability'),
        })
      )
    })

    test('should fallback to keyword-based classification', async () => {
      mockGenerateText.mockRejectedValue(new Error('AI error'))

      const result = await agent.classifyBugSeverity(
        'SQL injection in login form',
        'SQL Injection'
      )

      expect(result).toBe('HIGH')
    })

    test('should return MEDIUM as default fallback', async () => {
      mockGenerateText.mockResolvedValue({
        text: 'INVALID_SEVERITY',
      })

      const result = await agent.classifyBugSeverity(
        'Unknown vulnerability type',
        'Unknown'
      )

      expect(result).toBe('MEDIUM')
    })
  })

  describe('suggestTeamAssignment', () => {
    test('should suggest correct team for XSS', async () => {
      const result = await agent.suggestTeamAssignment('XSS', 'User Profile')

      expect(result).toBe('frontend')
    })

    test('should suggest correct team for SQL Injection', async () => {
      const result = await agent.suggestTeamAssignment('SQL Injection', 'API')

      expect(result).toBe('backend')
    })

    test('should suggest security team for authentication issues', async () => {
      const result = await agent.suggestTeamAssignment('Authentication Bypass', 'Login')

      expect(result).toBe('security')
    })

    test('should default to security team for unknown bug types', async () => {
      const result = await agent.suggestTeamAssignment('Unknown Bug Type', 'System')

      expect(result).toBe('security')
    })
  })

  describe('Private Methods', () => {
    test('should extract bug type from text patterns', () => {
      const agent = new BugAnalysisAgent()
      
      // Access private method through any casting for testing
      const extractBugType = (agent as any).extractBugTypeFromText

      expect(extractBugType('XSS vulnerability found')).toBe('XSS')
      expect(extractBugType('SQL injection in database')).toBe('SQL Injection')
      expect(extractBugType('CSRF attack possible')).toBe('CSRF')
      expect(extractBugType('Unknown issue type')).toBe('Unknown')
    })

    test('should assess severity from keywords', () => {
      const agent = new BugAnalysisAgent()
      
      // Access private method through any casting for testing
      const assessSeverity = (agent as any).assessSeverityFromKeywords

      expect(assessSeverity('remote code execution')).toBe('CRITICAL')
      expect(assessSeverity('sql injection attack')).toBe('HIGH')
      expect(assessSeverity('xss vulnerability')).toBe('MEDIUM')
      expect(assessSeverity('minor ui issue')).toBe('LOW')
    })
  })
})