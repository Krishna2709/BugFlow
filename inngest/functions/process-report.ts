import { inngest } from '../client'
import { prisma } from '@/lib/db'
import { bugAnalysisAgent } from '@/lib/ai/bug-analysis-agent'
import { engineerAssignmentService } from '@/lib/assignment/engineer-assignment'

export const processReport = inngest.createFunction(
  { id: 'process-report' },
  { event: 'report.submitted' },
  async ({ event, step }) => {
    const { reportId } = event.data

    // Step 1: Fetch report data
    const report = await step.run('fetch-report', async () => {
      const report = await prisma.report.findUnique({
        where: { id: reportId },
      })

      if (!report) {
        throw new Error(`Report ${reportId} not found`)
      }

      return report
    })

    // Step 2: AI Analysis
    const analysis = await step.run('ai-analysis', async () => {
      try {
        const result = await bugAnalysisAgent.analyzeReport({
          title: report.title,
          description: report.description,
          affectedSystem: report.affectedSystem || undefined,
        })

        console.log('AI Analysis completed:', result)
        return result
      } catch (error) {
        console.error('AI Analysis failed:', error)
        // Return fallback analysis
        return {
          bugType: 'Unknown',
          severity: 'MEDIUM' as const,
          affectedSystem: report.affectedSystem || 'Unknown',
          confidence: 0.1,
          summary: 'AI analysis failed, manual review required',
          technicalDetails: ['AI analysis unavailable'],
          suggestedAssignment: 'security',
        }
      }
    })

    // Step 3: Generate embedding for duplicate detection
    const embedding = await step.run('generate-embedding', async () => {
      try {
        const embeddingVector = await bugAnalysisAgent.generateEmbedding(
          `${report.title} ${report.description}`
        )
        console.log('Embedding generated successfully')
        return embeddingVector
      } catch (error) {
        console.error('Embedding generation failed:', error)
        return null
      }
    })

    // Step 4: Check for duplicates
    const duplicates = await step.run('check-duplicates', async () => {
      if (!embedding) {
        console.log('Skipping duplicate check - no embedding available')
        return []
      }

      try {
        const similarReports = await bugAnalysisAgent.findSimilarReports(
          embedding,
          0.85,
          reportId
        )
        console.log(`Found ${similarReports.length} similar reports`)
        return similarReports
      } catch (error) {
        console.error('Duplicate detection failed:', error)
        return []
      }
    })

    // Step 5: Update report with analysis results
    await step.run('update-report-analysis', async () => {
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
      }

      await prisma.report.update({
        where: { id: reportId },
        data: updateData,
      })

      console.log('Report updated with analysis results')
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
          // Add comment about duplicate detection
          await prisma.reportComment.create({
            data: {
              reportId,
              userId: 'system', // We'll need to handle system user
              comment: `This report has been automatically marked as a duplicate of report ${duplicates[0].id} (${duplicates[0].title}) with ${Math.round(duplicates[0].similarity * 100)}% similarity.`,
            },
          })

          console.log('Duplicate handling completed')
        } catch (error) {
          console.error('Failed to handle duplicate:', error)
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