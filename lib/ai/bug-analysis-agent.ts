import { openai } from '@ai-sdk/openai'
import { generateObject, generateText } from 'ai'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { AIAnalysisSchema, DuplicateDetectionSchema } from '@/lib/validations'

const BugAnalysisSchema = z.object({
  bugType: z.string().describe('The type of bug (e.g., XSS, SQL Injection, CSRF)'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  affectedSystem: z.string().describe('The system or component affected'),
  confidence: z.number().min(0).max(1).describe('Confidence score of the analysis'),
  summary: z.string().describe('Brief summary of the bug'),
  technicalDetails: z.array(z.string()).describe('Key technical details extracted'),
  suggestedAssignment: z.string().optional().describe('Suggested team for assignment'),
})

export class BugAnalysisAgent {
  private model = openai('gpt-4-turbo')

  async analyzeReport(report: {
    title: string
    description: string
    affectedSystem?: string
  }): Promise<z.infer<typeof BugAnalysisSchema>> {
    try {
      const { object } = await generateObject({
        model: this.model,
        schema: BugAnalysisSchema,
        prompt: `
          Analyze this bug report and extract key information:
          
          Title: ${report.title}
          Description: ${report.description}
          Affected System: ${report.affectedSystem || 'Not specified'}
          
          Classify the bug type, assess severity, and provide technical analysis.
          Consider OWASP Top 10 vulnerabilities and common security issues.
          
          Bug Type Classification Guidelines:
          - XSS: Cross-site scripting vulnerabilities
          - SQL Injection: Database injection attacks
          - CSRF: Cross-site request forgery
          - Authentication Bypass: Login/auth circumvention
          - Authorization: Access control issues
          - RCE: Remote code execution
          - LFI/RFI: Local/Remote file inclusion
          - SSRF: Server-side request forgery
          - Information Disclosure: Data leakage
          - Business Logic: Application logic flaws
          
          Severity Guidelines:
          - CRITICAL: Remote code execution, authentication bypass, data breach, system compromise
          - HIGH: Privilege escalation, sensitive data exposure, significant business impact
          - MEDIUM: Information disclosure, denial of service, moderate business impact
          - LOW: Minor information leakage, cosmetic issues, low business impact
          
          Team Assignment Guidelines:
          - XSS, DOM issues, Client-side: Frontend Team
          - SQL Injection, API issues, Server logic: Backend Team
          - Auth, Crypto, Access control: Security Team
          - Network, Infrastructure, Config: Infrastructure Team
        `,
      })

      return object
    } catch (error) {
      console.error('AI analysis error:', error)
      // Fallback analysis
      return {
        bugType: this.extractBugTypeFromText(report.title + ' ' + report.description),
        severity: this.assessSeverityFromKeywords(report.title + ' ' + report.description),
        affectedSystem: report.affectedSystem || 'Unknown',
        confidence: 0.3,
        summary: `Analysis failed, manual review required for: ${report.title}`,
        technicalDetails: ['AI analysis unavailable', 'Manual classification needed'],
        suggestedAssignment: 'security',
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data[0].embedding
    } catch (error) {
      console.error('Embedding generation error:', error)
      // Return a zero vector as fallback
      return new Array(1536).fill(0)
    }
  }

  async findSimilarReports(
    embedding: number[],
    threshold: number = 0.85,
    excludeReportId?: string
  ): Promise<Array<{ id: string; similarity: number; title: string; status: string }>> {
    try {
      // Get all reports with embeddings
      const reports = await prisma.report.findMany({
        where: {
          embedding: { not: null },
          ...(excludeReportId && { id: { not: excludeReportId } }),
        },
        select: {
          id: true,
          title: true,
          status: true,
          embedding: true,
        },
      })

      const similarities = reports
        .map(report => {
          try {
            const reportEmbedding = JSON.parse(report.embedding!)
            const similarity = this.cosineSimilarity(embedding, reportEmbedding)
            return {
              id: report.id,
              title: report.title,
              status: report.status,
              similarity,
            }
          } catch (error) {
            console.error('Error parsing embedding for report:', report.id)
            return null
          }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .filter(item => item.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Limit to top 10 similar reports

      return similarities
    } catch (error) {
      console.error('Similar reports search error:', error)
      return []
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      console.error('Vector length mismatch')
      return 0
    }

    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }
    
    return dotProduct / (magnitudeA * magnitudeB)
  }

  private extractBugTypeFromText(text: string): string {
    const textLower = text.toLowerCase()
    
    const bugTypePatterns = {
      'XSS': ['xss', 'cross-site scripting', 'script injection', 'javascript injection'],
      'SQL Injection': ['sql injection', 'sqli', 'database injection', 'union select'],
      'CSRF': ['csrf', 'cross-site request forgery', 'request forgery'],
      'Authentication Bypass': ['auth bypass', 'authentication bypass', 'login bypass'],
      'Authorization': ['authorization', 'access control', 'privilege escalation'],
      'RCE': ['rce', 'remote code execution', 'code execution'],
      'SSRF': ['ssrf', 'server-side request forgery'],
      'Information Disclosure': ['information disclosure', 'data leak', 'sensitive data'],
      'Business Logic': ['business logic', 'logic flaw', 'workflow'],
    }

    for (const [bugType, patterns] of Object.entries(bugTypePatterns)) {
      if (patterns.some(pattern => textLower.includes(pattern))) {
        return bugType
      }
    }

    return 'Unknown'
  }

  private assessSeverityFromKeywords(text: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const textLower = text.toLowerCase()
    
    const criticalKeywords = ['rce', 'remote code execution', 'system compromise', 'admin access', 'root access']
    const highKeywords = ['privilege escalation', 'sensitive data', 'authentication bypass', 'sql injection']
    const mediumKeywords = ['xss', 'csrf', 'information disclosure', 'denial of service']
    
    if (criticalKeywords.some(keyword => textLower.includes(keyword))) {
      return 'CRITICAL'
    }
    
    if (highKeywords.some(keyword => textLower.includes(keyword))) {
      return 'HIGH'
    }
    
    if (mediumKeywords.some(keyword => textLower.includes(keyword))) {
      return 'MEDIUM'
    }
    
    return 'LOW'
  }

  async classifyBugSeverity(description: string, bugType: string): Promise<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt: `
          Classify the severity of this security vulnerability:
          
          Bug Type: ${bugType}
          Description: ${description}
          
          Consider:
          - Impact on confidentiality, integrity, availability
          - Ease of exploitation
          - Business impact
          - CVSS scoring principles
          
          Respond with only one word: LOW, MEDIUM, HIGH, or CRITICAL
        `,
      })

      const severity = text.trim().toUpperCase()
      if (['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
        return severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
      }
      
      return 'MEDIUM' // Default fallback
    } catch (error) {
      console.error('Severity classification error:', error)
      return this.assessSeverityFromKeywords(description)
    }
  }

  async suggestTeamAssignment(bugType: string, affectedSystem: string): Promise<string> {
    const teamMappings = {
      'XSS': 'frontend',
      'DOM-based XSS': 'frontend',
      'Client-side Injection': 'frontend',
      'CORS': 'frontend',
      'SQL Injection': 'backend',
      'API Security': 'backend',
      'Input Validation': 'backend',
      'Business Logic': 'backend',
      'Command Injection': 'backend',
      'Authentication Bypass': 'security',
      'Authorization': 'security',
      'CSRF': 'security',
      'Session Management': 'security',
      'Cryptography': 'security',
      'Information Disclosure': 'security',
      'Network Security': 'infrastructure',
      'Denial of Service': 'infrastructure',
      'Configuration': 'infrastructure',
      'SSRF': 'infrastructure',
      'RCE': 'infrastructure',
    }

    return teamMappings[bugType as keyof typeof teamMappings] || 'security'
  }
}

export const bugAnalysisAgent = new BugAnalysisAgent()