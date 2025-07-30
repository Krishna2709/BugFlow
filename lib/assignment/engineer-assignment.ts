import { prisma } from '@/lib/db'
import { bugAnalysisAgent } from '@/lib/ai/bug-analysis-agent'

export interface AssignmentResult {
  success: boolean
  assignedEngineerId?: string
  engineerName?: string
  team?: string
  reason?: string
  error?: string
}

export class EngineerAssignmentService {
  private bugTypeToTeamMapping = {
    'XSS': 'frontend',
    'DOM-based XSS': 'frontend',
    'Client-side Injection': 'frontend',
    'CORS': 'frontend',
    'Content Security Policy': 'frontend',
    'SQL Injection': 'backend',
    'API Security': 'backend',
    'Input Validation': 'backend',
    'Business Logic': 'backend',
    'Command Injection': 'backend',
    'Path Traversal': 'backend',
    'Authentication Bypass': 'security',
    'Authorization': 'security',
    'CSRF': 'security',
    'Session Management': 'security',
    'Cryptography': 'security',
    'Information Disclosure': 'security',
    'Network Security': 'infrastructure',
    'Denial of Service': 'infrastructure',
    'Configuration': 'infrastructure',
    'Server-Side Request Forgery': 'infrastructure',
    'Remote Code Execution': 'infrastructure',
  }

  async assignEngineer(
    reportId: string,
    analysis: {
      bugType: string
      severity: string
      affectedSystem: string
      confidence: number
    },
    assignedBy: string = 'system'
  ): Promise<AssignmentResult> {
    try {
      // Determine the appropriate team
      const suggestedTeam = this.bugTypeToTeamMapping[analysis.bugType as keyof typeof this.bugTypeToTeamMapping] || 'security'
      
      // Find available engineers in the appropriate team
      const availableEngineers = await this.findAvailableEngineers(suggestedTeam, analysis.severity)
      
      if (availableEngineers.length === 0) {
        // Fallback to any available engineer
        const fallbackEngineers = await this.findAvailableEngineers(null, analysis.severity)
        
        if (fallbackEngineers.length === 0) {
          return {
            success: false,
            error: 'No available engineers found',
            reason: 'All engineers are at capacity or no engineers exist in the system'
          }
        }
        
        availableEngineers.push(...fallbackEngineers)
      }

      // Select the best engineer based on workload and expertise
      const selectedEngineer = this.selectBestEngineer(availableEngineers, analysis)

      // Create assignment record
      await prisma.assignment.create({
        data: {
          reportId,
          engineerId: selectedEngineer.id,
          assignedBy,
          status: 'ACTIVE',
        },
      })

      // Update report with assignment
      await prisma.report.update({
        where: { id: reportId },
        data: {
          assignedEngineerId: selectedEngineer.id,
          status: 'IN_PROGRESS',
        },
      })

      return {
        success: true,
        assignedEngineerId: selectedEngineer.id,
        engineerName: selectedEngineer.name || 'Unknown',
        team: selectedEngineer.team || 'Unknown',
        reason: `Assigned to ${selectedEngineer.team} team based on bug type: ${analysis.bugType}`
      }

    } catch (error) {
      console.error('Engineer assignment error:', error)
      return {
        success: false,
        error: 'Failed to assign engineer',
        reason: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  private async findAvailableEngineers(
    team: string | null,
    severity: string
  ): Promise<Array<{
    id: string
    name: string | null
    email: string
    team: string | null
    activeReports: number
    criticalReports: number
  }>> {
    const whereClause: any = {
      role: 'ENGINEER',
    }

    if (team) {
      whereClause.team = team
    }

    const engineers = await prisma.user.findMany({
      where: whereClause,
      include: {
        assignedReports: {
          where: {
            status: { in: ['NEW', 'IN_PROGRESS'] },
          },
          select: {
            id: true,
            severity: true,
          },
        },
      },
    })

    return engineers.map(engineer => ({
      id: engineer.id,
      name: engineer.name,
      email: engineer.email,
      team: engineer.team,
      activeReports: engineer.assignedReports.length,
      criticalReports: engineer.assignedReports.filter(r => r.severity === 'CRITICAL').length,
    }))
  }

  private selectBestEngineer(
    engineers: Array<{
      id: string
      name: string | null
      email: string
      team: string | null
      activeReports: number
      criticalReports: number
    }>,
    analysis: { bugType: string; severity: string }
  ) {
    // Scoring algorithm to select the best engineer
    const scoredEngineers = engineers.map(engineer => {
      let score = 100 // Base score

      // Penalize for high workload
      score -= engineer.activeReports * 10
      score -= engineer.criticalReports * 20

      // Bonus for team match
      const expectedTeam = this.bugTypeToTeamMapping[analysis.bugType as keyof typeof this.bugTypeToTeamMapping]
      if (engineer.team === expectedTeam) {
        score += 30
      }

      // For critical issues, prefer engineers with fewer critical reports
      if (analysis.severity === 'CRITICAL') {
        score -= engineer.criticalReports * 30
      }

      return {
        ...engineer,
        score,
      }
    })

    // Sort by score (highest first) and return the best match
    scoredEngineers.sort((a, b) => b.score - a.score)
    return scoredEngineers[0]
  }

  async reassignReport(
    reportId: string,
    newEngineerId: string,
    assignedBy: string,
    reason?: string
  ): Promise<AssignmentResult> {
    try {
      // Get the new engineer details
      const newEngineer = await prisma.user.findUnique({
        where: { id: newEngineerId },
        select: {
          id: true,
          name: true,
          team: true,
          role: true,
        },
      })

      if (!newEngineer || newEngineer.role !== 'ENGINEER') {
        return {
          success: false,
          error: 'Invalid engineer selected',
          reason: 'The selected user is not an engineer or does not exist'
        }
      }

      // Mark current assignment as reassigned
      await prisma.assignment.updateMany({
        where: {
          reportId,
          status: 'ACTIVE',
        },
        data: {
          status: 'REASSIGNED',
        },
      })

      // Create new assignment
      await prisma.assignment.create({
        data: {
          reportId,
          engineerId: newEngineerId,
          assignedBy,
          status: 'ACTIVE',
        },
      })

      // Update report
      await prisma.report.update({
        where: { id: reportId },
        data: {
          assignedEngineerId: newEngineerId,
          status: 'IN_PROGRESS',
        },
      })

      // Add comment about reassignment
      await prisma.reportComment.create({
        data: {
          reportId,
          userId: assignedBy,
          comment: `Report reassigned to ${newEngineer.name || newEngineer.id}${reason ? `. Reason: ${reason}` : ''}`,
        },
      })

      return {
        success: true,
        assignedEngineerId: newEngineerId,
        engineerName: newEngineer.name || 'Unknown',
        team: newEngineer.team || 'Unknown',
        reason: reason || 'Manual reassignment'
      }

    } catch (error) {
      console.error('Report reassignment error:', error)
      return {
        success: false,
        error: 'Failed to reassign report',
        reason: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async getEngineerWorkload(engineerId: string): Promise<{
    totalReports: number
    activeReports: number
    criticalReports: number
    highReports: number
    averageResolutionTime?: number
  }> {
    try {
      const engineer = await prisma.user.findUnique({
        where: { id: engineerId },
        include: {
          assignedReports: {
            select: {
              id: true,
              severity: true,
              status: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      })

      if (!engineer) {
        throw new Error('Engineer not found')
      }

      const reports = engineer.assignedReports
      const activeReports = reports.filter(r => ['NEW', 'IN_PROGRESS'].includes(r.status))
      const criticalReports = activeReports.filter(r => r.severity === 'CRITICAL')
      const highReports = activeReports.filter(r => r.severity === 'HIGH')

      // Calculate average resolution time for resolved reports
      const resolvedReports = reports.filter(r => r.status === 'RESOLVED')
      let averageResolutionTime: number | undefined

      if (resolvedReports.length > 0) {
        const totalResolutionTime = resolvedReports.reduce((sum, report) => {
          const resolutionTime = report.updatedAt.getTime() - report.createdAt.getTime()
          return sum + resolutionTime
        }, 0)
        averageResolutionTime = totalResolutionTime / resolvedReports.length / (1000 * 60 * 60 * 24) // Convert to days
      }

      return {
        totalReports: reports.length,
        activeReports: activeReports.length,
        criticalReports: criticalReports.length,
        highReports: highReports.length,
        averageResolutionTime,
      }

    } catch (error) {
      console.error('Error getting engineer workload:', error)
      throw error
    }
  }

  async getTeamWorkload(team: string): Promise<{
    totalEngineers: number
    totalReports: number
    activeReports: number
    averageReportsPerEngineer: number
  }> {
    try {
      const engineers = await prisma.user.findMany({
        where: {
          role: 'ENGINEER',
          team,
        },
        include: {
          assignedReports: {
            where: {
              status: { in: ['NEW', 'IN_PROGRESS'] },
            },
          },
        },
      })

      const totalReports = engineers.reduce((sum, engineer) => sum + engineer.assignedReports.length, 0)

      return {
        totalEngineers: engineers.length,
        totalReports,
        activeReports: totalReports,
        averageReportsPerEngineer: engineers.length > 0 ? totalReports / engineers.length : 0,
      }

    } catch (error) {
      console.error('Error getting team workload:', error)
      throw error
    }
  }
}

export const engineerAssignmentService = new EngineerAssignmentService()