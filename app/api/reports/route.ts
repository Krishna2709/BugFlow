import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ReportFilterSchema, createPaginatedResponse } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate query parameters
    const filterParams = {
      status: searchParams.get('status') || 'ALL',
      severity: searchParams.get('severity') || 'ALL',
      assignedTo: searchParams.get('assignedTo') || undefined,
      team: searchParams.get('team') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    }

    const validatedFilters = ReportFilterSchema.parse(filterParams)

    // Build where clause based on user role and filters
    const where: any = {}

    // Role-based filtering
    if (session.user.role === 'ENGINEER') {
      where.assignedEngineerId = session.user.id
    } else if (session.user.role === 'VIEWER') {
      // Viewers can see all reports but with limited access
      // Could be restricted by team if needed
      if (session.user.team) {
        where.assignedEngineer = {
          team: session.user.team,
        }
      }
    }
    // Admins can see all reports (no additional filtering)

    // Apply filters
    if (validatedFilters.status !== 'ALL') {
      where.status = validatedFilters.status
    }

    if (validatedFilters.severity !== 'ALL') {
      where.severity = validatedFilters.severity
    }

    if (validatedFilters.assignedTo) {
      where.assignedEngineerId = validatedFilters.assignedTo
    }

    if (validatedFilters.team) {
      where.assignedEngineer = {
        team: validatedFilters.team,
      }
    }

    if (validatedFilters.dateFrom || validatedFilters.dateTo) {
      where.createdAt = {}
      if (validatedFilters.dateFrom) {
        where.createdAt.gte = new Date(validatedFilters.dateFrom)
      }
      if (validatedFilters.dateTo) {
        where.createdAt.lte = new Date(validatedFilters.dateTo)
      }
    }

    if (validatedFilters.search) {
      where.OR = [
        { title: { contains: validatedFilters.search, mode: 'insensitive' } },
        { description: { contains: validatedFilters.search, mode: 'insensitive' } },
        { bugType: { contains: validatedFilters.search, mode: 'insensitive' } },
      ]
    }

    // Get total count for pagination
    const total = await prisma.report.count({ where })

    // Fetch reports with pagination
    const reports = await prisma.report.findMany({
      where,
      include: {
        assignedEngineer: {
          select: {
            id: true,
            name: true,
            email: true,
            team: true,
          },
        },
        duplicateOf: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      skip: (validatedFilters.page - 1) * validatedFilters.limit,
      take: validatedFilters.limit,
    })

    // Transform reports for response
    const transformedReports = reports.map(report => ({
      id: report.id,
      title: report.title,
      description: report.description.substring(0, 200) + (report.description.length > 200 ? '...' : ''),
      affectedSystem: report.affectedSystem,
      severity: report.severity,
      bugType: report.bugType,
      status: report.status,
      reporterName: report.reporterName,
      reporterEmail: session.user.role === 'ADMIN' ? report.reporterEmail : null, // Hide email from non-admins
      assignedEngineer: report.assignedEngineer,
      duplicateOf: report.duplicateOf,
      commentsCount: report._count.comments,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      aiAnalysis: session.user.role === 'ADMIN' ? report.aiAnalysis : null, // Hide AI analysis from non-admins
    }))

    return NextResponse.json(
      createPaginatedResponse(
        transformedReports,
        validatedFilters.page,
        validatedFilters.limit,
        total
      )
    )

  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}