import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { BugReportSchema, createApiResponse } from '@/lib/validations'
import { generateReportId } from '@/lib/utils'
import { inngest } from '@/inngest/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate the request body
    const validationResult = BugReportSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        createApiResponse(false, null, 'Validation failed', 'Invalid input data'),
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Create the report in the database
    const report = await prisma.report.create({
      data: {
        reporterName: validatedData.reporterName || null,
        reporterEmail: validatedData.reporterEmail || null,
        title: validatedData.title,
        description: validatedData.description,
        affectedSystem: validatedData.affectedSystem,
        severity: validatedData.severity || null,
        fileUrls: validatedData.fileUrls || [],
        status: 'NEW',
      },
    })

    // Trigger background processing with Inngest
    try {
      await inngest.send({
        name: 'report.submitted',
        data: { reportId: report.id },
      })
    } catch (error) {
      console.error('Failed to trigger background processing:', error)
      // Don't fail the request if background processing fails
    }

    return NextResponse.json(
      createApiResponse(
        true,
        { reportId: report.id },
        'Report submitted successfully'
      ),
      { status: 201 }
    )
  } catch (error) {
    console.error('Report submission error:', error)
    
    return NextResponse.json(
      createApiResponse(false, null, 'Internal server error', 'Failed to submit report'),
      { status: 500 }
    )
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}