import { inngest } from '../client'
import { prisma } from '@/lib/db'
import { bugAnalysisAgent } from '@/lib/ai/bug-analysis-agent'
import { engineerAssignmentService } from '@/lib/assignment/engineer-assignment'
import { logger, withDatabaseLogging } from '@/lib/logger'

export const processReport = inngest.createFunction(
  { id: 'process-report' },
  { event: 'report.submitted' },
  async ({ event, step }) => {
    const { reportId } = event.data

    // Step 1: Fetch report data
    const report = await step.run('fetch-report', async () => {
      logger.info('Fetching report for processing', { reportId }, 'INNGEST_PROCESS')
      
      const report = await withDatabaseLogging('findUnique', 'report', async () => {
        return prisma.report.findUnique({
          where: { id: reportId },
        })
      })

      if (!report) {
        logger.error('Report not found for processing', { reportId }, 'INNGEST_PROCESS')
        throw new Error(`Report ${reportId} not found`)
      }

      logger.info('Report fetched successfully', {
        reportId,
        title: report.title.substring(0, 50),
        status: report.status
      }, 'INNGEST_PROCESS')

      return report
    })

    // Step 2: AI Analysis
    const analysis = await step.run('ai-analysis', async () => {
      try {
        logger.info('Starting AI analysis', { reportId }, 'INNGEST_PROCESS')
        
        const result = await bugAnalysisAgent.analyzeReport({
          title: report.title,
          description: report.description,
          affectedSystem: report.affectedSystem || undefined,
        })

        logger.aiAnalysis(reportId, result)
        return result
      } catch (error) {
        logger.aiAnalysisError(reportId, error)
        
        // Return fallback analysis
        const fallbackResult = {
          bugType: 'Unknown',
          severity: 'MEDIUM' as const,
          affectedSystem: report.affectedSystem || 'Unknown',
          confidence: 0.1,
          summary: 'AI analysis failed, manual review required',
          technicalDetails: ['AI analysis unavailable'],
          suggestedAssignment: 'security',
        }
        
        logger.warn('Using fallback AI analysis', { reportId, fallbackResult }, 'INNGEST_PROCESS')
        return fallbackResult
      }
    })

    // Step 3: Generate embedding for duplicate detection
    const embedding = await step.run('generate-embedding', async () => {
      try {
        logger.info('Generating embedding for duplicate detection', { reportId }, 'INNGEST_PROCESS')
        
        const embeddingVector = await bugAnalysisAgent.generateEmbedding(
          `${report.title} ${report.description}`
        )
        
        if (embeddingVector) {
          logger.info('Embedding generated successfully', {
            reportId,
            vectorLength: embeddingVector.length
          }, 'INNGEST_PROCESS')
        } else {
          logger.warn('Embedding generation returned null', { reportId }, 'INNGEST_PROCESS')
        }
        
        return embeddingVector
      } catch (error) {
        logger.error('Embedding generation failed', { reportId, error }, 'INNGEST_PROCESS')
        return null
      }
    })

    // Step 4: Check for duplicates
    const duplicates = await step.run('check-duplicates', async () => {
      if (!embedding) {
        logger.warn('Skipping duplicate check - no embedding available', { reportId }, 'INNGEST_PROCESS')
        return []
      }

      try {
        logger.info('Checking for duplicate reports', { reportId }, 'INNGEST_PROCESS')
        
        const similarReports = await bugAnalysisAgent.findSimilarReports(
          embedding,
          0.85,
          reportId
        )
        
        logger.duplicateDetection(reportId, similarReports.length, 0.85)
        
        if (similarReports.length > 0) {
          logger.warn('Potential duplicates found', {
            reportId,
            duplicateCount: similarReports.length,
            topMatch: similarReports[0]
          }, 'INNGEST_PROCESS')
        }
        
        return similarReports
      } catch (error) {
        logger.error('Duplicate detection failed', { reportId, error }, 'INNGEST_PROCESS')
        return []
      }
    })

    // Step 5: Update report with analysis results
    await step.run('update-report-analysis', async () => {
      logger.info('Updating report with analysis results', { reportId }, 'INNGEST_PROCESS')
      
      const updateData: any = {
        bugType: analysis.bugType,
        severity: analysis.severity,
        aiAnalysis: {
          ...analysis,
          processedAt: new Date().toISOString(),
          duplicatesFound: duplicates.length,
        },
      }

      if (embedding) {
        updateData.embedding = JSON.stringify(embedding)
      }

      // Mark as duplicate if similar reports found
      if (duplicates.length > 0) {
        updateData.status = 'DUPLICATE'
        updateData.duplicateOfId = duplicates[0].id
        logger.warn('Marking report as duplicate', {
          reportId,
          duplicateOfId: duplicates[0].id,
          similarity: duplicates[0].similarity
        }, 'INNGEST_PROCESS')
      }

      await withDatabaseLogging('update', 'report', async () => {
        return prisma.report.update({
          where: { id: reportId },
          data: updateData,
        })
      })

      logger.info('Report updated with analysis results', {
        reportId,
        bugType: analysis.bugType,
        severity: analysis.severity,
        isDuplicate: duplicates.length > 0
      }, 'INNGEST_PROCESS')
    })

    // Step 6: Assign engineer if not duplicate
    let assignmentResult = null
    if (duplicates.length === 0) {
      assignmentResult = await step.run('assign-engineer', async () => {
        try {
          const result = await engineerAssignmentService.assignEngineer(
            reportId,
            {
              bugType: analysis.bugType,
              severity: analysis.severity,
              affectedSystem: analysis.affectedSystem,
              confidence: analysis.confidence,
            },
            'system'
          )

          console.log('Engineer assignment result:', result)
          return result
        } catch (error) {
          console.error('Engineer assignment failed:', error)
          return {
            success: false,
            error: 'Assignment failed',
            reason: error instanceof Error ? error.message : 'Unknown error',
          }
        }
      })

      // Step 7: Send notification if assignment successful
      if (assignmentResult?.success && assignmentResult.assignedEngineerId) {
        await step.run('send-notification', async () => {
          try {
            // Trigger notification event
            await inngest.send({
              name: 'engineer.assigned',
              data: {
                reportId,
                engineerId: assignmentResult.assignedEngineerId,
                bugType: analysis.bugType,
                severity: analysis.severity,
                title: report.title,
              },
            })

            console.log('Notification event sent')
          } catch (error) {
            console.error('Failed to send notification:', error)
          }
        })
      }
    } else {
      // Step 6b: Handle duplicate case
      await step.run('handle-duplicate', async () => {
        try {
          logger.info('Handling duplicate report', {
            reportId,
            duplicateOfId: duplicates[0].id
          }, 'INNGEST_PROCESS')
          
          // Ensure system user exists before creating comment
          const systemUser = await prisma.user.findUnique({
            where: { id: 'system' }
          })
          
          if (!systemUser) {
            logger.error('System user not found, cannot create duplicate comment', { reportId }, 'INNGEST_PROCESS')
            return
          }
          
          // Add comment about duplicate detection
          await withDatabaseLogging('create', 'reportComment', async () => {
            return prisma.reportComment.create({
              data: {
                reportId,
                userId: 'system',
                comment: `This report has been automatically marked as a duplicate of report ${duplicates[0].id} (${duplicates[0].title}) with ${Math.round(duplicates[0].similarity * 100)}% similarity.`,
              },
            })
          })

          logger.info('Duplicate handling completed', { reportId }, 'INNGEST_PROCESS')
        } catch (error) {
          logger.error('Failed to handle duplicate', { reportId, error }, 'INNGEST_PROCESS')
        }
      })
    }

    // Return processing summary
    return {
      success: true,
      reportId,
      analysis: {
        bugType: analysis.bugType,
        severity: analysis.severity,
        confidence: analysis.confidence,
      },
      duplicatesFound: duplicates.length,
      assigned: assignmentResult?.success || false,
      assignedTo: assignmentResult?.engineerName,
      processingTime: Date.now(),
    }
  }
)

export const sendEngineerNotification = inngest.createFunction(
  { id: 'send-engineer-notification' },
  { event: 'engineer.assigned' },
  async ({ event, step }) => {
    const { reportId, engineerId, bugType, severity, title } = event.data

    // Get engineer details
    const engineer = await step.run('fetch-engineer', async () => {
      const engineer = await prisma.user.findUnique({
        where: { id: engineerId },
        select: {
          id: true,
          name: true,
          email: true,
          team: true,
        },
      })

      if (!engineer) {
        throw new Error(`Engineer ${engineerId} not found`)
      }

      return engineer
    })

    // Send email notification (placeholder - would integrate with email service)
    await step.run('send-email', async () => {
      console.log('📧 Email notification would be sent to:', engineer.email)
      console.log('Subject: New Bug Report Assigned')
      console.log('Content:', {
        engineerName: engineer.name,
        reportId,
        title,
        bugType,
        severity,
        dashboardUrl: `${process.env.NEXTAUTH_URL}/engineer`,
      })

      // TODO: Integrate with actual email service (SendGrid, etc.)
      // await emailService.sendAssignmentNotification({
      //   to: engineer.email,
      //   engineerName: engineer.name,
      //   reportId,
      //   title,
      //   bugType,
      //   severity,
      //   dashboardUrl: `${process.env.NEXTAUTH_URL}/engineer`,
      // })

      return { sent: true, recipient: engineer.email }
    })

    // Create in-app notification
    await step.run('create-notification', async () => {
      // TODO: Implement in-app notification system
      console.log('📱 In-app notification created for engineer:', engineer.name)
      
      return { created: true }
    })

    return {
      success: true,
      engineerId,
      notificationsSent: ['email', 'in-app'],
    }
  }
)

export const cleanupOldReports = inngest.createFunction(
  { id: 'cleanup-old-reports' },
  { cron: '0 2 * * *' }, // Run daily at 2 AM
  async ({ step }) => {
    // Archive resolved reports older than 90 days
    const archiveDate = new Date()
    archiveDate.setDate(archiveDate.getDate() - 90)

    const archivedCount = await step.run('archive-old-reports', async () => {
      // In a real implementation, you might move to an archive table
      // For now, we'll just add a comment
      const oldReports = await prisma.report.findMany({
        where: {
          status: 'RESOLVED',
          updatedAt: { lt: archiveDate },
        },
        select: { id: true },
      })

      for (const report of oldReports) {
        await prisma.reportComment.create({
          data: {
            reportId: report.id,
            userId: 'system',
            comment: 'Report automatically archived due to age (90+ days resolved)',
          },
        })
      }

      return oldReports.length
    })

    // Clean up old embeddings for duplicate reports
    const cleanupCount = await step.run('cleanup-duplicate-embeddings', async () => {
      const duplicateReports = await prisma.report.findMany({
        where: {
          status: 'DUPLICATE',
          embedding: { not: null },
        },
        select: { id: true },
      })

      await prisma.report.updateMany({
        where: {
          id: { in: duplicateReports.map(r => r.id) },
        },
        data: {
          embedding: null, // Clear embeddings for duplicates to save space
        },
      })

      return duplicateReports.length
    })

    return {
      success: true,
      archivedReports: archivedCount,
      cleanedEmbeddings: cleanupCount,
      processedAt: new Date().toISOString(),
    }
  }
)